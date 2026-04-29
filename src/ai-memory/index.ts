/**
 * AI Memory System - Public API
 *
 * Transforms scraped documentation into a queryable knowledge tree.
 *
 * @example
 * ```typescript
 * import { transformDocument, saveTree, loadTree, routeQuery } from 'webpull/ai-memory'
 *
 * // Transform markdown to knowledge tree
 * const tree = transformDocument(markdown, 'https://example.com', 'example.md')
 *
 * // Save to disk
 * await saveTree(tree, './.ai-memory/example.json')
 *
 * // Load from disk
 * const loaded = await loadTree('./.ai-memory/example.json')
 *
 * // Query by path
 * const results = routeQuery({ type: 'path', path: '/api/auth' }, loaded)
 *
 * // Query by keywords
 * const authNodes = routeQuery({
 *   type: 'keyword',
 *   keywords: ['authentication', 'oauth'],
 *   operator: 'AND'
 * }, loaded)
 * ```
 */

// Export query functions
export { routeQuery } from "./query/index.ts"
// Export storage functions
export { loadTree, saveTree } from "./storage/index.ts"
// Export transformer functions
export { transformDocument } from "./transformer/index.ts"
// Export all core types
export type {
	ContextQuery,
	HybridQuery,
	KeywordQuery,
	KnowledgeIndex,
	KnowledgeTree,
	// Core data structures
	MemoryNode,
	NaturalQuery,
	NodeMetadata,
	// Node types and metadata
	NodeType,
	PathQuery,
	// Query types
	Query,
	SemanticQuery,
	TreeMetadata,
	TreeStats,
} from "./types.ts"
export { extractKeywords } from "./utils/keywords.ts"
// Export utilities
export { estimateTokenCount } from "./utils/tokens.ts"
