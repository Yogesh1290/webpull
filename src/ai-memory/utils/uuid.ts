/**
 * UUID generation utilities
 */

export function generateUUID(): string {
	return crypto.randomUUID()
}

export function generateNodeId(): string {
	return `node_${generateUUID()}`
}
