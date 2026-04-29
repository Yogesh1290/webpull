/**
 * Path manipulation utilities for hierarchical node paths
 */

/**
 * Join path segments into a hierarchical path
 */
export function joinPath(...segments: string[]): string {
	return (
		"/" +
		segments
			.filter((s) => s && s !== "/")
			.map((s) => s.replace(/^\/+|\/+$/g, ""))
			.join("/")
	)
}

/**
 * Normalize a path
 */
export function normalizePath(path: string): string {
	if (!path || path === "/") return "/"

	// Remove leading/trailing slashes and normalize
	const normalized = path.replace(/^\/+|\/+$/g, "")
	return `/${normalized}`
}

/**
 * Slugify text for use in paths
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "")
}
