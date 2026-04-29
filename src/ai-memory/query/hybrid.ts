/**
 * Hybrid Search - Combines keyword + semantic search
 * 
 * This is the intelligent layer that understands meaning, not just keywords
 */

import type { KnowledgeTree, MemoryNode, SemanticQuery, HybridQuery } from '../types.ts'
import { generateEmbedding, cosineSimilarity } from '../embeddings/index.ts'
import { routeKeywordQuery } from './router.ts'
import { extractQueryKeywords } from '../utils/keywords.ts'

/**
 * Semantic search using embeddings
 */
export async function routeSemanticQuery(
  query: SemanticQuery,
  tree: KnowledgeTree
): Promise<MemoryNode[]> {
  // Generate embedding for the question
  const queryEmbedding = await generateEmbedding(query.question)
  
  // Calculate similarity with all nodes that have embeddings
  const scores: Array<{ node: MemoryNode; score: number }> = []
  
  for (const node of tree.nodes.values()) {
    if (node.metadata.embedding) {
      const similarity = cosineSimilarity(queryEmbedding, node.metadata.embedding)
      
      // Filter by threshold
      if (!query.threshold || similarity >= query.threshold) {
        scores.push({ node, score: similarity })
      }
    }
  }
  
  // Sort by similarity descending
  scores.sort((a, b) => b.score - a.score)
  
  // Return top results
  const maxResults = query.maxResults || 5
  return scores.slice(0, maxResults).map(s => s.node)
}

/**
 * Hybrid search - combines keyword + semantic
 * 
 * This is the SMART search that understands:
 * - "login with google" → finds OAuth docs
 * - "make it faster" → finds performance docs
 * - Synonyms, intent, meaning
 */
export async function routeHybridQuery(
  query: HybridQuery,
  tree: KnowledgeTree
): Promise<MemoryNode[]> {
  const keywordWeight = query.keywordWeight ?? 0.3
  const semanticWeight = query.semanticWeight ?? 0.7
  const maxResults = query.maxResults || 5
  
  // 1. Keyword search (fast, exact)
  const keywords = extractQueryKeywords(query.question)
  const keywordResults = routeKeywordQuery({
    type: 'keyword',
    keywords,
    operator: 'OR'
  }, tree)
  
  // 2. Semantic search (smart, meaning-based)
  const queryEmbedding = await generateEmbedding(query.question)
  
  // 3. Score all nodes using both signals
  const nodeScores = new Map<string, number>()
  
  // Add keyword scores
  for (let i = 0; i < keywordResults.length; i++) {
    const node = keywordResults[i]
    if (!node) continue
    // Higher rank = higher score
    const keywordScore = (keywordResults.length - i) / keywordResults.length
    nodeScores.set(node.id, keywordScore * keywordWeight)
  }
  
  // Add semantic scores
  for (const node of tree.nodes.values()) {
    if (node.metadata.embedding) {
      const similarity = cosineSimilarity(queryEmbedding, node.metadata.embedding)
      const semanticScore = similarity * semanticWeight
      
      const existingScore = nodeScores.get(node.id) || 0
      nodeScores.set(node.id, existingScore + semanticScore)
    }
  }
  
  // 4. Sort by combined score
  const rankedNodes = Array.from(nodeScores.entries())
    .map(([nodeId, score]) => {
      const node = tree.nodes.get(nodeId)
      return node ? { node, score } : null
    })
    .filter((item): item is { node: MemoryNode; score: number } => item !== null)
    .sort((a, b) => b.score - a.score)
  
  // 5. Return top results
  return rankedNodes.slice(0, maxResults).map(item => item.node)
}
