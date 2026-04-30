#!/usr/bin/env bun
/**
 * Simple documentation chatbot using AI Memory
 * Uses hybrid search (keyword + semantic) if embeddings exist
 */

import { GoogleGenAI } from '@google/genai'
import { loadTree, routeQuery } from '../src/ai-memory/index.ts'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import * as readline from 'node:readline'

async function main() {
  // Check for API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Set GEMINI_API_KEY in .env file')
    console.log('Get key: https://aistudio.google.com/app/apikey\n')
    process.exit(1)
  }
  
  // Check for AI memory
  const aiMemoryDir = join(import.meta.dir, '../.ai-memory')
  if (!existsSync(aiMemoryDir)) {
    console.error('❌ No .ai-memory folder found')
    console.log('Run: bun run src/index.ts https://bun.sh/docs --ai-memory -m 30\n')
    process.exit(1)
  }
  
  // Load tree
  const { readdir } = await import('node:fs/promises')
  const files = (await readdir(aiMemoryDir)).filter(f => f.endsWith('.json'))
  
  if (files.length === 0) {
    console.error('❌ No JSON files in .ai-memory/')
    process.exit(1)
  }
  
  const docFile = files[0]
  if (!docFile) {
    console.error('❌ No JSON files in .ai-memory/')
    process.exit(1)
  }
  
  const tree = await loadTree(join(aiMemoryDir, docFile))
  const docName = docFile.replace('.json', '')
  
  // Check if embeddings exist
  let hasEmbeddings = false
  for (const node of tree.nodes.values()) {
    if (node.metadata.embedding) {
      hasEmbeddings = true
      break
    }
  }
  
  console.log(`\n📚 Chatbot: ${docName}`)
  console.log(`📊 ${tree.stats.totalNodes} nodes, ${tree.stats.totalTokens.toLocaleString()} tokens`)
  console.log(`🔍 Search: ${hasEmbeddings ? 'Hybrid (keyword + semantic)' : 'Keyword only'}`)
  console.log(`\nType your question (or 'exit' to quit)\n`)
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Q: '
  })
  
  rl.prompt()
  
  rl.on('line', async (question) => {
    question = question.trim()
    
    if (!question) {
      rl.prompt()
      return
    }
    
    if (question === 'exit') {
      console.log('\n👋 Bye!\n')
      process.exit(0)
    }
    
    // Search using hybrid if embeddings exist, otherwise keyword
    const nodes = await routeQuery(
      hasEmbeddings
        ? { type: 'hybrid', question, maxResults: 5, keywordWeight: 0.3, semanticWeight: 0.7 }
        : { type: 'natural', question, maxResults: 5 },
      tree
    )
    
    if (nodes.length === 0) {
      console.log('❌ No relevant docs found\n')
      rl.prompt()
      return
    }
    
    // Build context
    const context = nodes.map(n => `## ${n.metadata.title}\n\n${n.content}`).join('\n\n')
    const tokens = nodes.reduce((sum, n) => sum + n.metadata.tokenCount, 0)
    
    console.log(`\n📄 Found ${nodes.length} sections (${tokens} tokens)\n`)
    
    // Ask Gemini
    try {
      const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        config: { 
          thinkingConfig: { thinkingBudget: -1 },
          maxOutputTokens: 2048
        },
        contents: [{
          role: 'user',
          parts: [{
            text: `You are a helpful assistant for ${docName} documentation. Answer the question based on the provided context. Be detailed and include code examples if available.\n\nContext:\n${context}\n\nQuestion: ${question}\n\nAnswer:`
          }]
        }]
      })
      
      console.log('A: ')
      for await (const chunk of response) {
        if (chunk.text) process.stdout.write(chunk.text)
      }
      console.log('\n')
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}\n`)
    }
    
    rl.prompt()
  })
}

main().catch(console.error)
