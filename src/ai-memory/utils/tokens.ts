/**
 * Token counting utilities
 *
 * Provides approximate token counts for different LLM tokenizers
 */

/**
 * Estimate token count using a simple heuristic
 * This is a rough approximation: ~4 characters per token for English text
 */
export function estimateTokenCount(text: string): number {
	// Remove extra whitespace
	const normalized = text.replace(/\s+/g, " ").trim()

	// Rough estimate: 4 chars per token
	return Math.ceil(normalized.length / 4)
}
