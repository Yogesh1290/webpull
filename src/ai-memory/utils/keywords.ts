/**
 * Keyword extraction utilities
 */

const STOPWORDS = new Set([
	"a",
	"an",
	"and",
	"are",
	"as",
	"at",
	"be",
	"by",
	"for",
	"from",
	"has",
	"he",
	"in",
	"is",
	"it",
	"its",
	"of",
	"on",
	"that",
	"the",
	"to",
	"was",
	"will",
	"with",
	"this",
	"but",
	"they",
	"have",
	"had",
	"what",
	"when",
	"where",
	"who",
	"which",
	"why",
	"how",
])

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string): string[] {
	// Convert to lowercase and split into words
	const words = text
		.toLowerCase()
		.replace(/[^\w\s]/g, " ")
		.split(/\s+/)
		.filter((word) => word.length > 2)
		.filter((word) => !STOPWORDS.has(word))

	// Remove duplicates and return
	return Array.from(new Set(words))
}

/**
 * Extract keywords from a natural language query
 */
export function extractQueryKeywords(question: string): string[] {
	return extractKeywords(question)
}
