# AI Memory

Transforms scraped documentation into a queryable JSON tree structure.

## What It Does

Converts markdown docs into a hierarchical tree with:
- Nodes organized by heading structure (h1, h2, h3, etc.)
- Multiple indexes: path, keyword, type, full-text search
- Embeddings for semantic search (using local model, no API costs)
- Token counting for context management

**The Problem**: Scraped docs are 50K-200K tokens. Sending entire docs to LLMs is expensive (~$0.03/query) and slow.

**The Solution**: Query the JSON to find relevant sections (3-5K tokens), send only those to LLM. 95%+ token savings (~$0.001/query).

## Use Cases

**Personal documentation chatbot**: Query docs locally, send only relevant sections to LLM (~$0.001/query vs ~$0.03 for full docs)

**CLI tools**: Load JSON, query it, show relevant sections. No external dependencies.

**Offline search**: Query locally without internet. Optional LLM for answers.

## What It's NOT

- Not for production RAG (no re-ranking, basic chunking)
- Not a vector database (just JSON files)
- Not for multi-user apps (single file, no concurrent access)
- Not real-time (regenerate JSON when docs change)

## Who It's For

- Developers building personal tools
- Local-first projects (no cloud dependencies)
- Learning RAG concepts
- Small-scale doc search

**Reality**: Simple, local, free alternative to vector databases for personal use. For production apps with many users → use a real vector DB.

## Future Direction

**Current limitation**: JSON requires custom code to query. Not directly usable by AI assistants (ChatGPT, Cursor, Kiro, etc.).

**Planned improvements:**
- MCP (Model Context Protocol) server for universal AI assistant access
- Knowledge graphs (GraphRAG) for relationship-aware retrieval
- Advanced chunking strategies (semantic, sliding window)
- Re-ranking algorithms for better result quality
- Production scalability (database backend, caching, concurrent access)

## Usage

### 1. Scrape with AI Memory

```bash
bun run src/index.ts https://bun.sh/docs --ai-memory -m 50
# Creates: ./.ai-memory/bun.sh.json
```

### 2. Query the Tree

```typescript
import { loadTree, routeQuery } from 'webpull/ai-memory'

const tree = await loadTree('./.ai-memory/bun.sh.json')

// Query by path
const node = routeQuery({ 
  type: 'path', 
  path: '/api/file-system' 
}, tree)

// Query by keywords
const results = routeQuery({
  type: 'keyword',
  keywords: ['http', 'server'],
  operator: 'AND',
  maxResults: 5
}, tree)

// Semantic search (uses embeddings)
const answers = routeQuery({
  type: 'semantic',
  query: 'How do I create an HTTP server?',
  maxResults: 5
}, tree)

// Hybrid search (keyword + semantic)
const best = routeQuery({
  type: 'hybrid',
  query: 'HTTP server setup',
  keywordWeight: 0.3,
  semanticWeight: 0.7,
  maxResults: 5
}, tree)
```

### 3. Use with LLM

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

// Find relevant sections using hybrid search
const relevantNodes = routeQuery({
  type: 'hybrid',
  query: userQuestion,
  keywordWeight: 0.3,
  semanticWeight: 0.7,
  maxResults: 3
}, tree)

// Build context (only relevant parts)
const context = relevantNodes
  .map(n => `## ${n.metadata.title}\n\n${n.content}`)
  .join('\n\n')

// Send to LLM
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
const result = await model.generateContent(
  `Context:\n${context}\n\nQuestion: ${userQuestion}`
)
console.log(result.response.text())
```

## Tree Structure

```typescript
{
  version: "1.0.0",
  metadata: {
    source: "https://example.com",
    stats: {
      totalNodes: 428,
      totalTokens: 81828,
      maxDepth: 4
    }
  },
  nodes: Map<string, Node>,
  index: {
    pathMap: Map<string, string>,
    keywordMap: Map<string, Set<string>>,
    typeMap: Map<string, Set<string>>
  }
}
```

## Query Types

**Path Query** - Direct lookup by path
```typescript
routeQuery({ type: 'path', path: '/api/http' }, tree)
```

**Keyword Query** - Search by keywords (TF-IDF scoring)
```typescript
routeQuery({ 
  type: 'keyword', 
  keywords: ['auth', 'security'], 
  operator: 'AND',
  maxResults: 5
}, tree)
```

**Semantic Query** - Vector similarity search using embeddings
```typescript
routeQuery({ 
  type: 'semantic', 
  query: 'How do I authenticate users?',
  maxResults: 5
}, tree)
```

**Hybrid Query** - Combines keyword + semantic search
```typescript
routeQuery({ 
  type: 'hybrid', 
  query: 'authentication methods',
  keywordWeight: 0.3,  // 30% keyword, 70% semantic
  semanticWeight: 0.7,
  maxResults: 5
}, tree)
```

## API

**Transformation**
- `transformDocument(markdown, sourceUrl, sourceFile)` - Transform markdown to tree

**Storage**
- `saveTree(tree, path)` - Save tree to JSON
- `loadTree(path)` - Load tree from JSON

**Querying**
- `routeQuery(query, tree)` - Execute query, returns nodes

**Utilities**
- `estimateTokenCount(text)` - Estimate tokens (GPT-4 tokenizer)
- `extractKeywords(text)` - Extract keywords from text

## Example

See `examples/chatbot.ts` for a working chatbot with Gemini.

## What It's Good For

- Querying documentation programmatically
- Reducing LLM token usage (send only relevant sections instead of full docs)
- Building documentation chatbots
- Local-first RAG (no external vector DB needed)

## What It's NOT

- Not a production vector database (simple JSON storage)
- Not a full RAG system (no re-ranking, advanced chunking, etc.)
- Not magic (quality depends on doc structure and heading hierarchy)

## Limitations

- Markdown only (no PDF, HTML, etc.)
- Token counting is approximate (not exact)
- Requires well-structured docs with clear heading hierarchy
- Embeddings generated locally (slower than API, but free)

## Performance

Tested with Bun.sh docs (428 nodes, ~82K tokens):
- Load tree: ~50ms
- Path query: <1ms
- Keyword query: ~5ms
- Semantic query: ~50ms
- Hybrid query: ~55ms

Embedding generation (one-time, during scraping):
- ~100ms per node (local model, no API costs)

## License

MIT
