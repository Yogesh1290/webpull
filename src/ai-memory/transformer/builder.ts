/**
 * Tree builder - constructs KnowledgeTree from parsed sections
 */

import type { KnowledgeTree, MemoryNode, NodeType } from "../types.ts"
import { extractKeywords } from "../utils/keywords.ts"
import { joinPath, slugify } from "../utils/paths.ts"
import { estimateTokenCount } from "../utils/tokens.ts"
import { generateNodeId, generateUUID } from "../utils/uuid.ts"
import type { Section } from "./parser.ts"

/**
 * Build a knowledge tree from parsed sections
 */
export function buildTree(sections: Section[], sourceUrl: string, sourceFile: string): KnowledgeTree {
	const tree: KnowledgeTree = {
		version: "1.0.0",
		id: generateUUID(),
		source: sourceUrl,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		rootId: "",
		nodes: new Map(),
		index: {
			pathMap: new Map(),
			keywordMap: new Map(),
			typeMap: new Map(),
			searchIndex: {
				terms: new Map(),
				idf: new Map(),
			},
		},
		stats: {
			totalNodes: 0,
			totalTokens: 0,
			maxDepth: 0,
			avgTokensPerNode: 0,
		},
	}

	// Create root node
	const root = createRootNode(sourceUrl, sourceFile)
	tree.rootId = root.id
	tree.nodes.set(root.id, root)
	tree.index.pathMap.set("/", root.id)

	// Build nodes recursively
	buildNodesRecursive(sections, root, tree, sourceUrl, sourceFile, "/", 1)

	// Calculate statistics
	calculateStats(tree)

	// Build search index
	buildSearchIndex(tree)

	return tree
}

/**
 * Create root node
 */
function createRootNode(sourceUrl: string, sourceFile: string): MemoryNode {
	return {
		id: generateNodeId(),
		path: "/",
		content: "",
		summary: "Root node",
		metadata: {
			title: "Root",
			type: "section",
			level: 0,
			keywords: [],
			sourceUrl,
			sourceFile,
			tokenCount: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		parentId: null,
		childIds: [],
		siblingIds: [],
		references: {
			inbound: [],
			outbound: [],
		},
		formatting: {
			bold: [],
			italic: [],
			code: [],
			links: [],
		},
	}
}

/**
 * Build nodes recursively from sections
 */
function buildNodesRecursive(
	sections: Section[],
	parent: MemoryNode,
	tree: KnowledgeTree,
	sourceUrl: string,
	sourceFile: string,
	parentPath: string,
	depth: number,
): void {
	const siblings: string[] = []

	for (const section of sections) {
		const node = createNodeFromSection(section, parent.id, sourceUrl, sourceFile, parentPath, depth)

		tree.nodes.set(node.id, node)
		parent.childIds.push(node.id)
		siblings.push(node.id)

		// Add to path map
		tree.index.pathMap.set(node.path, node.id)

		// Add to keyword map
		for (const keyword of node.metadata.keywords) {
			if (!tree.index.keywordMap.has(keyword)) {
				tree.index.keywordMap.set(keyword, new Set())
			}
			tree.index.keywordMap.get(keyword)!.add(node.id)
		}

		// Add to type map
		if (!tree.index.typeMap.has(node.metadata.type)) {
			tree.index.typeMap.set(node.metadata.type, new Set())
		}
		tree.index.typeMap.get(node.metadata.type)!.add(node.id)

		// Recursively build children
		if (section.children.length > 0) {
			buildNodesRecursive(section.children, node, tree, sourceUrl, sourceFile, node.path, depth + 1)
		}
	}

	// Set sibling relationships
	for (const nodeId of siblings) {
		const node = tree.nodes.get(nodeId)!
		node.siblingIds = siblings.filter((id) => id !== nodeId)
	}
}

/**
 * Create a memory node from a section
 */
function createNodeFromSection(
	section: Section,
	parentId: string,
	sourceUrl: string,
	sourceFile: string,
	parentPath: string,
	_depth: number,
): MemoryNode {
	const slug = slugify(section.title)
	const path = joinPath(parentPath, slug)
	const content = section.content
	const tokenCount = estimateTokenCount(content)
	const keywords = extractKeywords(`${section.title} ${content}`)

	// Generate summary (first 100 tokens)
	const summary = generateSummary(content, section.title)

	// Determine node type
	const type = determineNodeType(section.title, content)

	return {
		id: generateNodeId(),
		path,
		content,
		summary,
		metadata: {
			title: section.title,
			type,
			level: section.level,
			keywords,
			sourceUrl,
			sourceFile,
			tokenCount,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		parentId,
		childIds: [],
		siblingIds: [],
		references: {
			inbound: [],
			outbound: [],
		},
		formatting: {
			bold: [],
			italic: [],
			code: [],
			links: [],
		},
	}
}

/**
 * Generate a summary from content
 */
function generateSummary(content: string, title: string): string {
	if (!content) return title

	// Take first 200 characters
	const preview = content.slice(0, 200).trim()

	// Find last complete sentence
	const lastPeriod = preview.lastIndexOf(".")
	if (lastPeriod > 50) {
		return preview.slice(0, lastPeriod + 1)
	}

	return `${preview}...`
}

/**
 * Determine node type from title and content
 */
function determineNodeType(title: string, content: string): NodeType {
	const lowerTitle = title.toLowerCase()
	const lowerContent = content.toLowerCase()

	if (lowerTitle.includes("api") || lowerTitle.includes("reference")) {
		return "api"
	}

	if (lowerTitle.includes("tutorial") || lowerTitle.includes("guide")) {
		return "tutorial"
	}

	if (lowerTitle.includes("example") || lowerContent.includes("```")) {
		return "example"
	}

	return "section"
}

/**
 * Calculate tree statistics
 */
function calculateStats(tree: KnowledgeTree): void {
	let totalTokens = 0
	let maxDepth = 0

	for (const node of tree.nodes.values()) {
		totalTokens += node.metadata.tokenCount

		// Calculate depth
		let depth = 0
		let current: MemoryNode | undefined = node
		while (current?.parentId) {
			depth++
			current = tree.nodes.get(current.parentId)
		}
		maxDepth = Math.max(maxDepth, depth)
	}

	tree.stats = {
		totalNodes: tree.nodes.size,
		totalTokens,
		maxDepth,
		avgTokensPerNode: tree.nodes.size > 0 ? Math.round(totalTokens / tree.nodes.size) : 0,
	}
}

/**
 * Build full-text search index
 */
function buildSearchIndex(tree: KnowledgeTree): void {
	const termFrequency = new Map<string, Map<string, number>>()

	// Count term frequencies
	for (const node of tree.nodes.values()) {
		const terms = extractKeywords(node.content)

		for (const term of terms) {
			if (!termFrequency.has(term)) {
				termFrequency.set(term, new Map())
			}

			const nodeFreq = termFrequency.get(term)!
			nodeFreq.set(node.id, (nodeFreq.get(node.id) || 0) + 1)
		}
	}

	// Build search index with IDF scores
	const totalDocs = tree.nodes.size

	for (const [term, nodeFreqs] of termFrequency.entries()) {
		const docFreq = nodeFreqs.size
		const idf = Math.log(totalDocs / docFreq)

		tree.index.searchIndex.terms.set(term, new Set(nodeFreqs.keys()))
		tree.index.searchIndex.idf.set(term, idf)
	}
}
