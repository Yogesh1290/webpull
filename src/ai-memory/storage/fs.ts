/**
 * File system operations for knowledge trees
 */

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { KnowledgeTree } from "../types.ts"
import { deserialize, serialize } from "./serializer.ts"

/**
 * Save a knowledge tree to disk
 */
export async function saveTree(tree: KnowledgeTree, outputPath: string): Promise<void> {
	// Ensure directory exists
	await mkdir(dirname(outputPath), { recursive: true })

	// Serialize tree
	const json = serialize(tree)

	// Write to file
	await writeFile(outputPath, json, "utf-8")
}

/**
 * Load a knowledge tree from disk
 */
export async function loadTree(inputPath: string): Promise<KnowledgeTree> {
	// Read file
	const json = await readFile(inputPath, "utf-8")

	// Deserialize tree
	return deserialize(json)
}
