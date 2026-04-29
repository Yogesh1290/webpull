/**
 * Core TypeScript interfaces for the AI Memory System
 */

/**
 * Node types categorize the semantic purpose of each memory node
 */
export type NodeType = "section" | "api" | "tutorial" | "reference" | "example" | "guide"

/**
 * Range represents a character range within content
 */
export interface Range {
	start: number
	end: number
}

/**
 * Link represents a hyperlink with its text, URL, and position
 */
export interface Link {
	text: string
	url: string
	range: Range
}

/**
 * Formatting information preserves text styling from source documents
 */
export interface Formatting {
	bold: Range[]
	italic: Range[]
	code: Range[]
	links: Link[]
}

/**
 * Metadata provides semantic and structural information about a node
 */
export interface NodeMetadata {
	title: string
	type: NodeType
	level: number // Heading level (1-6)
	keywords: string[]
	language?: string // For code blocks
	sourceUrl: string
	sourceFile: string
	tokenCount: number
	createdAt: string
	updatedAt: string
	embedding?: number[] // Semantic embedding vector
}

/**
 * Cross-references track relationships between nodes
 */
export interface References {
	inbound: string[] // Nodes that link to this
	outbound: string[] // Nodes this links to
}

/**
 * MemoryNode is the fundamental unit of the knowledge tree
 */
export interface MemoryNode {
	// Identity
	id: string // Unique identifier (UUID)
	path: string // Hierarchical path (e.g., "/api/auth/oauth")

	// Content
	content: string // Full markdown content
	summary: string // Token-efficient summary (max 100 tokens)

	// Metadata
	metadata: NodeMetadata

	// Tree Structure
	parentId: string | null
	childIds: string[]
	siblingIds: string[]

	// Cross-References
	references: References

	// Formatting Preservation
	formatting: Formatting
}

/**
 * Statistics about the knowledge tree structure
 */
export interface TreeStats {
	totalNodes: number
	totalTokens: number
	maxDepth: number
	avgTokensPerNode: number
}

/**
 * KnowledgeIndex enables fast lookup without loading full node content
 */
export interface KnowledgeIndex {
	// Path-based lookup
	pathMap: Map<string, string> // path -> nodeId

	// Keyword-based lookup
	keywordMap: Map<string, Set<string>> // keyword -> Set<nodeId>

	// Type-based lookup
	typeMap: Map<NodeType, Set<string>> // type -> Set<nodeId>

	// Full-text search (lightweight)
	searchIndex: {
		terms: Map<string, Set<string>> // term -> Set<nodeId>
		idf: Map<string, number> // term -> inverse document frequency
	}
}

/**
 * KnowledgeTree is the complete hierarchical knowledge structure
 */
export interface KnowledgeTree {
	// Metadata
	version: string // Schema version for compatibility
	id: string // Tree UUID
	source: string // Original URL
	createdAt: string
	updatedAt: string

	// Structure
	rootId: string
	nodes: Map<string, MemoryNode>

	// Index (for fast lookup)
	index: KnowledgeIndex

	// Statistics
	stats: TreeStats
}

/**
 * Query types for retrieving nodes from the knowledge tree
 */

/**
 * PathQuery retrieves nodes by their hierarchical path
 */
export interface PathQuery {
	type: "path"
	path: string
	includeChildren?: boolean
}

/**
 * KeywordQuery retrieves nodes matching keyword criteria
 */
export interface KeywordQuery {
	type: "keyword"
	keywords: string[]
	operator: "AND" | "OR" | "NOT"
	filters?: {
		type?: NodeType[]
		minTokens?: number
		maxTokens?: number
	}
}

/**
 * NaturalQuery retrieves nodes relevant to a natural language question
 */
export interface NaturalQuery {
	type: "natural"
	question: string
	maxResults?: number
}

/**
 * SemanticQuery retrieves nodes using semantic similarity (embeddings)
 */
export interface SemanticQuery {
	type: "semantic"
	question: string
	maxResults?: number
	threshold?: number // Minimum similarity score (0-1)
}

/**
 * HybridQuery combines keyword + semantic search
 */
export interface HybridQuery {
	type: "hybrid"
	question: string
	maxResults?: number
	keywordWeight?: number // 0-1, default 0.3
	semanticWeight?: number // 0-1, default 0.7
}

/**
 * ContextQuery retrieves a node with its surrounding context
 */
export interface ContextQuery {
	type: "context"
	nodeId: string
	includeParent?: boolean
	includeSiblings?: boolean
	includeChildren?: boolean
}

/**
 * Union type of all query types
 */
export type Query = PathQuery | KeywordQuery | NaturalQuery | SemanticQuery | HybridQuery | ContextQuery

/**
 * Serialized tree format for persistence
 */
export interface SerializedTree {
	version: string
	metadata: TreeMetadata
	nodes: SerializedNode[]
	index: SerializedIndex
}

/**
 * Tree metadata for serialization
 */
export interface TreeMetadata {
	id: string
	source: string
	createdAt: string
	updatedAt: string
	stats: TreeStats
}

/**
 * Serialized node format
 */
export interface SerializedNode {
	id: string
	path: string
	content: string
	summary: string
	metadata: NodeMetadata
	parentId: string | null
	childIds: string[]
	siblingIds: string[]
	references: References
	formatting: Formatting
}

/**
 * Serialized index format
 */
export interface SerializedIndex {
	pathMap: [string, string][]
	keywordMap: [string, string[]][]
	typeMap: [NodeType, string[]][]
	searchIndex: {
		terms: [string, string[]][]
		idf: [string, number][]
	}
}
