# Example: Documentation Chatbot

Simple chatbot that answers questions about scraped documentation using AI memory + Gemini.

## What It Does

1. Loads AI memory JSON (scraped docs)
2. Takes your question
3. Finds relevant sections using hybrid search (keyword + semantic)
4. Sends only relevant sections to Gemini
5. Returns answer with token usage stats

**Result:** Answer questions about docs without sending entire documentation to LLM.

## Setup

1. Install dependencies (from project root):
```bash
bun install
```

2. Create `.env` file in `examples/` folder:
```bash
GEMINI_API_KEY=your_key_here
```

Get API key: https://aistudio.google.com/app/apikey

3. Scrape docs with AI memory (from project root):
```bash
bun run src/index.ts https://bun.sh/docs --ai-memory -m 30
# Creates: .ai-memory/bun.sh.json
```

4. Run chatbot (from project root):
```bash
bun run examples/chatbot.ts
```

## How It Works

- **Hybrid search**: Combines keyword matching (30%) + semantic similarity (70%)
- **Fallback**: Uses keyword-only search if embeddings aren't available
- **Context building**: Sends only top 5 relevant sections to LLM (not entire docs)
- **Token tracking**: Shows how many tokens used per query

## Example Session

```
? Ask a question: How do I create an HTTP server?

Finding relevant sections...
✓ Found 5 relevant sections (2,847 tokens)

Answer:
To create an HTTP server in Bun, use Bun.serve()...

Tokens used: 2,847 context + 156 response = 3,003 total
```

## Limitations

- Demo only - no error handling, rate limiting, or conversation history
- Quality depends on doc structure and embeddings
- Gemini API required (not free, but cheap)
