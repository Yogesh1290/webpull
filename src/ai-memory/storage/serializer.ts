/**
 * Serialization utilities for persisting knowledge trees
 */

import type { KnowledgeTree, SerializedIndex, SerializedTree } from "../types.ts"

/**
 * Serialize a knowledge tree to JSON
 */
export function serialize(tree: KnowledgeTree): string {
	const serialized: SerializedTree = {
		version: tree.version,
		metadata: {
			id: tree.id,
			source: tree.source,
			createdAt: tree.createdAt,
			updatedAt: tree.updatedAt,
			stats: tree.stats,
		},
		nodes: Array.from(tree.nodes.values()).map((node) => ({
			id: node.id,
			path: node.path,
			content: node.content,
			summary: node.summary,
			metadata: node.metadata,
			parentId: node.parentId,
			childIds: node.childIds,
			siblingIds: node.siblingIds,
			references: node.references,
			formatting: node.formatting,
		})),
		index: serializeIndex(tree.index),
	}

	return JSON.stringify(serialized, null, 2)
}

/**
 * Deserialize a knowledge tree from JSON
 */
export function deserialize(json: string): KnowledgeTree {
	const serialized = JSON.parse(json) as SerializedTree

	// Validate version
	if (!serialized.version || serialized.version !== "1.0.0") {
		throw new Error(`Unsupported version: ${serialized.version}`)
	}

	// Reconstruct tree
	const tree: KnowledgeTree = {
		version: serialized.version,
		id: serialized.metadata.id,
		source: serialized.metadata.source,
		createdAt: serialized.metadata.createdAt,
		updatedAt: serialized.metadata.updatedAt,
		rootId: "",
		nodes: new Map(),
		index: deserializeIndex(serialized.index),
		stats: serialized.metadata.stats,
	}

	// Reconstruct nodes
	for (const serializedNode of serialized.nodes) {
		tree.nodes.set(serializedNode.id, serializedNode)
		if (serializedNode.path === "/") {
			tree.rootId = serializedNode.id
		}
	}

	return tree
}

/**
 * Serialize index
 */
function serializeIndex(index: KnowledgeTree["index"]): SerializedIndex {
	return {
		pathMap: Array.from(index.pathMap.entries()),
		keywordMap: Array.from(index.keywordMap.entries()).map(([k, v]) => [k, Array.from(v)]),
		typeMap: Array.from(index.typeMap.entries()).map(([k, v]) => [k, Array.from(v)]),
		searchIndex: {
			terms: Array.from(index.searchIndex.terms.entries()).map(([k, v]) => [k, Array.from(v)]),
			idf: Array.from(index.searchIndex.idf.entries()),
		},
	}
}

/**
 * Deserialize index
 */
function deserializeIndex(serialized: SerializedIndex): KnowledgeTree["index"] {
	return {
		pathMap: new Map(serialized.pathMap),
		keywordMap: new Map(serialized.keywordMap.map(([k, v]) => [k, new Set(v)])),
		typeMap: new Map(serialized.typeMap.map(([k, v]) => [k, new Set(v)])),
		searchIndex: {
			terms: new Map(serialized.searchIndex.terms.map(([k, v]) => [k, new Set(v)])),
			idf: new Map(serialized.searchIndex.idf),
		},
	}
}
