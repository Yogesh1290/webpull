/**
 * Query router - routes queries to appropriate handlers
 */

import type { ContextQuery, KeywordQuery, KnowledgeTree, MemoryNode, NaturalQuery, PathQuery, Query } from "../types.ts"
import { extractQueryKeywords } from "../utils/keywords.ts"

/**
 * Route a query to the appropriate handler
 */
export async function routeQuery(query: Query, tree: KnowledgeTree): Promise<MemoryNode[]> {
	switch (query.type) {
		case "path":
			return routePathQuery(query, tree)
		case "keyword":
			return routeKeywordQuery(query, tree)
		case "natural":
			return routeNaturalQuery(query, tree)
		case "semantic": {
			// Import dynamically to avoid loading embeddings unless needed
			const { routeSemanticQuery } = await import("./hybrid.ts")
			return await routeSemanticQuery(query, tree)
		}
		case "hybrid": {
			const { routeHybridQuery } = await import("./hybrid.ts")
			return await routeHybridQuery(query, tree)
		}
		case "context":
			return routeContextQuery(query, tree)
		default:
			return []
	}
}

/**
 * Route path-based query
 */
function routePathQuery(query: PathQuery, tree: KnowledgeTree): MemoryNode[] {
	const nodeId = tree.index.pathMap.get(query.path)
	if (!nodeId) return []

	const node = tree.nodes.get(nodeId)
	if (!node) return []

	const results = [node]

	if (query.includeChildren) {
		results.push(...getDescendants(node, tree))
	}

	return results
}

/**
 * Route keyword-based query
 */
export function routeKeywordQuery(query: KeywordQuery, tree: KnowledgeTree): MemoryNode[] {
	const matchingSets = query.keywords.map((kw) => tree.index.keywordMap.get(kw.toLowerCase()) || new Set<string>())

	let resultIds: Set<string>

	switch (query.operator) {
		case "AND":
			resultIds = intersection(...matchingSets)
			break
		case "OR":
			resultIds = union(...matchingSets)
			break
		case "NOT":
			resultIds = difference(new Set(tree.nodes.keys()), union(...matchingSets))
			break
	}

	// Get nodes
	let results = Array.from(resultIds)
		.map((id) => tree.nodes.get(id)!)
		.filter((node) => node !== undefined)

	// Apply filters
	if (query.filters) {
		if (query.filters.type) {
			results = results.filter((node) => query.filters!.type!.includes(node.metadata.type))
		}
		if (query.filters.minTokens !== undefined) {
			results = results.filter((node) => node.metadata.tokenCount >= query.filters!.minTokens!)
		}
		if (query.filters.maxTokens !== undefined) {
			results = results.filter((node) => node.metadata.tokenCount <= query.filters!.maxTokens!)
		}
	}

	// Rank by relevance
	return rankByRelevance(results, query.keywords, tree)
}

/**
 * Route natural language query
 */
function routeNaturalQuery(query: NaturalQuery, tree: KnowledgeTree): MemoryNode[] {
	const keywords = extractQueryKeywords(query.question)

	const keywordQuery: KeywordQuery = {
		type: "keyword",
		keywords,
		operator: "OR",
	}

	const results = routeKeywordQuery(keywordQuery, tree)

	return results.slice(0, query.maxResults || 10)
}

/**
 * Route context query
 */
function routeContextQuery(query: ContextQuery, tree: KnowledgeTree): MemoryNode[] {
	const node = tree.nodes.get(query.nodeId)
	if (!node) return []

	const results = [node]

	if (query.includeParent && node.parentId) {
		const parent = tree.nodes.get(node.parentId)
		if (parent) results.unshift(parent)
	}

	if (query.includeSiblings) {
		for (const siblingId of node.siblingIds) {
			const sibling = tree.nodes.get(siblingId)
			if (sibling) results.push(sibling)
		}
	}

	if (query.includeChildren) {
		results.push(...getDescendants(node, tree))
	}

	return results
}

/**
 * Get all descendants of a node
 */
function getDescendants(node: MemoryNode, tree: KnowledgeTree): MemoryNode[] {
	const descendants: MemoryNode[] = []

	for (const childId of node.childIds) {
		const child = tree.nodes.get(childId)
		if (child) {
			descendants.push(child)
			descendants.push(...getDescendants(child, tree))
		}
	}

	return descendants
}

/**
 * Set intersection
 */
function intersection<T>(...sets: Set<T>[]): Set<T> {
	if (sets.length === 0) return new Set()
	const firstSet = sets[0]
	if (sets.length === 1 && firstSet) return firstSet

	const result = new Set(firstSet)
	for (const set of sets.slice(1)) {
		for (const item of result) {
			if (!set.has(item)) {
				result.delete(item)
			}
		}
	}

	return result
}

/**
 * Set union
 */
function union<T>(...sets: Set<T>[]): Set<T> {
	const result = new Set<T>()
	for (const set of sets) {
		for (const item of set) {
			result.add(item)
		}
	}
	return result
}

/**
 * Set difference
 */
function difference<T>(a: Set<T>, b: Set<T>): Set<T> {
	const result = new Set(a)
	for (const item of b) {
		result.delete(item)
	}
	return result
}

/**
 * Rank results by relevance using TF-IDF
 */
function rankByRelevance(nodes: MemoryNode[], keywords: string[], tree: KnowledgeTree): MemoryNode[] {
	const scores = new Map<string, number>()

	for (const node of nodes) {
		let score = 0

		for (const keyword of keywords) {
			const kw = keyword.toLowerCase()

			// Check if keyword appears in node
			const termSet = tree.index.searchIndex.terms.get(kw)
			if (termSet?.has(node.id)) {
				const idf = tree.index.searchIndex.idf.get(kw) || 0
				score += idf
			}

			// Boost if keyword in title
			if (node.metadata.title.toLowerCase().includes(kw)) {
				score += 2
			}
		}

		scores.set(node.id, score)
	}

	// Sort by score descending
	return nodes.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0))
}
