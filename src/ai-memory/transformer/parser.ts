/**
 * Markdown parser for extracting hierarchical structure
 */

export interface Section {
	level: number
	title: string
	content: string
	children: Section[]
	startLine: number
	endLine: number
}

/**
 * Parse markdown into hierarchical sections
 */
export function parseMarkdown(markdown: string): Section[] {
	const lines = markdown.split("\n")
	const sections: Section[] = []
	const stack: Section[] = []

	let currentSection: Section | null = null
	let contentLines: string[] = []
	let lineNumber = 0

	for (const line of lines) {
		lineNumber++

		// Check if this is a heading
		const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)

		if (headingMatch) {
			// Save previous section's content
			if (currentSection) {
				currentSection.content = contentLines.join("\n").trim()
				currentSection.endLine = lineNumber - 1
			}

			const level = headingMatch[1]?.length ?? 1
			const title = headingMatch[2]?.trim() ?? ""

			// Create new section
			const newSection: Section = {
				level,
				title,
				content: "",
				children: [],
				startLine: lineNumber,
				endLine: lineNumber,
			}

			// Find parent in stack
			while (stack.length > 0) {
				const top = stack[stack.length - 1]
				if (top && top.level >= level) {
					stack.pop()
				} else {
					break
				}
			}

			// Add to parent or root
			if (stack.length === 0) {
				sections.push(newSection)
			} else {
				const parent = stack[stack.length - 1]
				if (parent) {
					parent.children.push(newSection)
				}
			}

			stack.push(newSection)
			currentSection = newSection
			contentLines = []
		} else if (currentSection) {
			// Add to current section's content
			contentLines.push(line)
		}
	}

	// Save last section's content
	if (currentSection) {
		currentSection.content = contentLines.join("\n").trim()
		currentSection.endLine = lineNumber
	}

	return sections
}

/**
 * Extract code blocks from markdown
 */
export function extractCodeBlocks(markdown: string): Array<{ language: string; code: string }> {
	const codeBlocks: Array<{ language: string; code: string }> = []
	const regex = /```(\w+)?\n([\s\S]*?)```/g

	const matches = markdown.matchAll(regex)
	for (const match of matches) {
		codeBlocks.push({
			language: match[1] ?? "text",
			code: match[2]?.trim() ?? "",
		})
	}

	return codeBlocks
}

/**
 * Extract links from markdown
 */
export function extractLinks(markdown: string): Array<{ text: string; url: string }> {
	const links: Array<{ text: string; url: string }> = []
	const regex = /\[([^\]]+)\]\(([^)]+)\)/g

	const matches = markdown.matchAll(regex)
	for (const match of matches) {
		const text = match[1]
		const url = match[2]
		if (text && url) {
			links.push({ text, url })
		}
	}

	return links
}
