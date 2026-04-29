/**
 * Embedding Generator
 * 
 * Generates semantic embeddings for text using Transformers.js
 * Runs locally - no API costs!
 */

import { pipeline, env } from '@xenova/transformers'

// Configure to use local models
env.allowLocalModels = true
env.allowRemoteModels = true

let embeddingPipeline: any = null

/**
 * Initialize the embedding model
 */
async function initEmbeddings() {
  if (embeddingPipeline) return embeddingPipeline
  
  console.log('🔄 Loading embedding model (first time only)...')
  
  // Use a small, fast model optimized for semantic search
  // Model: all-MiniLM-L6-v2 (22MB, very fast)
  embeddingPipeline = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2'
  )
  
  console.log('✓ Embedding model loaded')
  
  return embeddingPipeline
}

/**
 * Generate embedding for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await initEmbeddings()
  
  // Truncate text if too long (model limit: 512 tokens)
  const truncated = text.slice(0, 2000)
  
  // Generate embedding
  const output = await model(truncated, {
    pooling: 'mean',
    normalize: true
  })
  
  // Convert to array
  return Array.from(output.data)
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    const aVal = a[i]
    const bVal = b[i]
    if (aVal !== undefined && bVal !== undefined) {
      dotProduct += aVal * bVal
      normA += aVal * aVal
      normB += bVal * bVal
    }
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
