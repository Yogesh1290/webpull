# webpull

Pull any public docs site into local markdown files.

```
$ webpull https://docs.example.com

  ⚡ webpull · 16 workers
  docs.example.com → ./docs.example.com

  ●●●·●●●●·●●●●●●●·
  ├─ ✓ getting-started/installation.md
  ├─ ✓ api/authentication.md
  ├─ ✓ guides/deployment.md
  █████████████░░░░░░░ 68% 102/150 · 6p/s · 17.2s
```

## Install

```bash
bun install -g webpull
```

## Usage

```
webpull <url> [options]

Options:
  -o, --out <dir>        Output directory (default: ./<hostname>)
  -m, --max <n>          Max pages to pull (default: 500)
  --ai-memory            Transform docs into queryable JSON tree
  --ai-memory-out <dir>  AI memory output directory (default: ./.ai-memory)
```

## Examples

```bash
# Pull React docs
webpull https://react.dev/reference

# Custom output dir, limit to 100 pages
webpull https://docs.python.org -o ./python-docs -m 100

# Create AI memory structure
webpull https://bun.sh/docs --ai-memory -m 50
```

## How it works

1. **Discovers pages** via sitemap.xml, nav link extraction, or link crawling
2. **Fetches in parallel** using a worker pool sized to your CPU cores
3. **Converts to markdown** using [Defuddle](https://github.com/nichochar/defuddle) for intelligent content extraction
4. **Writes to disk** preserving the URL path structure with YAML frontmatter

Each markdown file includes metadata:

```yaml
---
title: "Getting Started"
url: "https://docs.example.com/getting-started"
---
```

## AI Memory

The `--ai-memory` flag creates a structured JSON tree from scraped docs. Useful for querying documentation programmatically or building chatbots.

See [AI-MEMORY-README.md](./AI-MEMORY-README.md) for details.

## Requirements

- [Bun](https://bun.sh) runtime

## License

MIT
