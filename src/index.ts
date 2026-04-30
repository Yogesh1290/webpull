#!/usr/bin/env bun
import { cpus } from "node:os"
import { resolve, join } from "node:path"
import { readdir, readFile } from "node:fs/promises"
import { Effect } from "effect"
import { frontmatter } from "./convert"
import { discover } from "./discover"
import { WorkerPool } from "./pool"
import { createUI } from "./ui"
import { write } from "./write"
import { transformDocument, saveTree } from "./ai-memory/index.ts"

interface Config {
	url: string
	out: string
	max: number
	aiMemory?: boolean
	aiMemoryOut?: string
	withEmbeddings?: boolean
}

/**
 * Transform scraped markdown files into AI memory structure
 */
const transformToAIMemory = (config: Config) =>
	Effect.gen(function* () {
		process.stderr.write('\n  \x1b[1m🧠 Transforming to AI memory...\x1b[0m\n')
		
		const t0 = performance.now()
		
		try {
			// Read all markdown files from output directory
			const files = yield* Effect.tryPromise(() => 
				readdir(config.out, { recursive: true, withFileTypes: true })
			)
			
			const markdownFiles = files
				.filter(f => f.isFile() && f.name.endsWith('.md'))
				.map(f => {
					const parentPath = (f as any).path || (f as any).parentPath || config.out
					return join(parentPath, f.name)
				})
			
			if (markdownFiles.length === 0) {
				process.stderr.write('  \x1b[33mNo markdown files found to transform\x1b[0m\n')
				return
			}
			
			// Concatenate all markdown files into one
			let combinedContent = ''
			for (const filepath of markdownFiles) {
				const content = yield* Effect.tryPromise(() => readFile(filepath, 'utf-8'))
				if (content.trim()) {
					// Extract title to create a page boundary heading
					const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m)
					const title = titleMatch ? titleMatch[1] : filepath.split(/[\/\\]/).pop()?.replace('.md', '') || 'Page'
					
					combinedContent += `# ${title}\n\n` + content + '\n\n'
				}
			}
			
			if (!combinedContent.trim()) {
				process.stderr.write('  \x1b[33mNo content to transform\x1b[0m\n')
				return
			}
			
			// Transform combined content into one tree
			const hostname = new URL(config.url).hostname
			const tree = transformDocument(combinedContent, config.url, hostname)
			
			// Generate embeddings if requested
			if (config.withEmbeddings) {
				process.stderr.write('  \x1b[90mGenerating embeddings...\x1b[0m\n')
				const { generateEmbedding } = yield* Effect.tryPromise(() => import('./ai-memory/embeddings/index.ts'))
				
				let count = 0
				const total = tree.nodes.size
				
				for (const node of tree.nodes.values()) {
					const textToEmbed = `${node.metadata.title}\n\n${node.summary}`
					node.metadata.embedding = yield* Effect.tryPromise(() => generateEmbedding(textToEmbed))
					count++
					if (count % 10 === 0 || count === total) {
						process.stderr.write(`\r  \x1b[90mGenerating embeddings... ${count}/${total}\x1b[0m`)
					}
				}
				process.stderr.write('\n')
			}
			
			// Save tree
			const outputPath = join(config.aiMemoryOut || './.ai-memory', `${hostname}.json`)
			yield* Effect.tryPromise(() => saveTree(tree, outputPath))
			
			const elapsed = ((performance.now() - t0) / 1000).toFixed(1)
			
			process.stderr.write(
				`  \x1b[32m✓ Created AI memory with ${tree.stats.totalNodes} nodes (${tree.stats.totalTokens.toLocaleString()} tokens) in ${elapsed}s\x1b[0m\n`
			)
			process.stderr.write(`  \x1b[90mSaved to: ${outputPath}\x1b[0m\n`)
		} catch (error) {
			process.stderr.write(`  \x1b[31m✗ AI memory transformation failed: ${error}\x1b[0m\n`)
		}
	})

const parseArgs = (args: string[]): Config => {
	if (!args.length || args.includes("-h") || args.includes("--help")) {
		console.log(`
  webpull - Pull docs into markdown

  Usage:  webpull <url> [options]

    -o, --out <dir>        Output directory (default: ./<hostname>)
    -m, --max <n>          Max pages (default: 500)
    --ai-memory            Transform docs into AI memory structure
    --ai-memory-out <dir>  AI memory output directory (default: ./.ai-memory)
    --with-embeddings      Generate embeddings for semantic search
`)
		process.exit(0)
	}

	let raw = args[0]!
	if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`

	let url: URL
	try {
		url = new URL(raw)
	} catch {
		console.error(`Bad URL: ${args[0]}`)
		process.exit(1)
	}

	let out = `./${url.hostname}`
	let max = 500
	let aiMemory = false
	let aiMemoryOut = './.ai-memory'
	let withEmbeddings = false

	for (let i = 1; i < args.length; i++) {
		const arg = args[i]
		const next = args[i + 1]
		if (("-o" === arg || "--out" === arg) && next) {
			out = next
			i++
		} else if (("-m" === arg || "--max" === arg) && next) {
			max = +next
			i++
		} else if ("--ai-memory" === arg) {
			aiMemory = true
		} else if ("--ai-memory-out" === arg && next) {
			aiMemoryOut = next
			i++
		} else if ("--with-embeddings" === arg) {
			withEmbeddings = true
		}
	}

	return { url: url.href, out: resolve(out), max, aiMemory, aiMemoryOut, withEmbeddings }
}

const program = Effect.gen(function* () {
	const config = parseArgs(process.argv.slice(2))
	const t0 = performance.now()
	const workerCount = Math.max(8, cpus().length * 2)
	const pool = new WorkerPool(workerCount)

	process.stderr.write(`\n  \x1b[1m⚡ webpull\x1b[0m \x1b[90m· discovering pages...\x1b[0m\n\n`)

	try {
		const urls = yield* discover(config.url, config.max)
		if (!urls.length) {
			process.stderr.write("  No pages found.\n")
			process.exit(1)
		}

		const tDisc = performance.now()
		const total = urls.length
		const ui = createUI(config.url, config.out, workerCount)

		let ok = 0
		let err = 0
		const recentFiles: string[] = []
		const workerStates = new Array<"idle" | "busy">(workerCount).fill("idle")
		const workerMap = new Map<number, number>()
		let nextSlot = 0
		let lastRender = 0

		const tick = () => {
			const now = performance.now()
			if (now - lastRender < 80) return
			lastRender = now
			ui.render({ total, ok, err, elapsed: (now - tDisc) / 1000, workerStates, recentFiles })
		}

		const writePromises: Promise<any>[] = []

		yield* Effect.tryPromise(() =>
			pool.pullAll(
				urls,
				(idx) => {
					const slot = nextSlot++ % workerCount
					workerMap.set(idx, slot)
					workerStates[slot] = "busy"
					tick()
				},
				(result, idx) => {
					const slot = workerMap.get(idx) ?? 0
					workerStates[slot] = "idle"
					workerMap.delete(idx)

					if (result.ok) {
						ok++
						const finalUrl = result.url ?? urls[idx]!
						const title = result.title || new URL(finalUrl).pathname
						const page = {
							url: finalUrl,
							title,
							markdown: frontmatter(title, finalUrl) + (result.content ?? ""),
						}

						let filepath = new URL(finalUrl).pathname
						if (filepath.endsWith("/")) filepath += "index"
						filepath = filepath.replace(/\.html?$/, "").replace(/^\//, "")
						if (!filepath.endsWith(".md")) filepath += ".md"
						recentFiles.push(filepath)

						writePromises.push(Effect.runPromise(write(page, config.out)))
					} else {
						err++
					}
					tick()
				},
			),
		)

		ui.render({ total, ok, err, elapsed: (performance.now() - tDisc) / 1000, workerStates, recentFiles })
		ui.finish()

		yield* Effect.tryPromise(() => Promise.all(writePromises))

		const elapsed = ((performance.now() - t0) / 1000).toFixed(1)
		const pps = Math.round(ok / ((performance.now() - tDisc) / 1000))

		process.stderr.write(
			`\n  \x1b[32m\x1b[1mDone!\x1b[0m ${ok} pages in ${elapsed}s \x1b[90m(${pps} pages/sec)\x1b[0m\n`,
		)
		if (err) process.stderr.write(`  \x1b[31m${err} failed\x1b[0m\n`)
		
		// AI Memory transformation
		if (config.aiMemory) {
			yield* transformToAIMemory(config)
		}
		
		process.stderr.write("\n")
	} finally {
		pool.terminate()
	}
})

Effect.runPromise(program).catch((e) => {
	console.error(e)
	process.exit(1)
})
