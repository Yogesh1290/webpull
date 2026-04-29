/**
 * Knowledge Transformer - Main entry point
 *
 * Transforms markdown documents into knowledge trees
 */

import type { KnowledgeTree } from "../types.ts"
import { buildTree } from "./builder.ts"
import { parseMarkdown } from "./parser.ts"

/**
 * Transform a markdown document into a knowledge tree
 */
export function transformDocument(markdown: string, sourceUrl: string, sourceFile: string): KnowledgeTree {
	// Parse markdown into sections
	const sections = parseMarkdown(markdown)

	// Build tree from sections
	const tree = buildTree(sections, sourceUrl, sourceFile)

	return tree
}
