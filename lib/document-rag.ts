import { randomUUID } from "node:crypto"
import { Index } from "@upstash/vector"
import mammoth from "mammoth"
import pdfParse from "pdf-parse/lib/pdf-parse.js"

const MAX_CHARS_PER_CHUNK = 1800
const CHUNK_OVERLAP_CHARS = 250

export interface ExtractedSection {
  sourceLabel: string
  text: string
}

export interface DocumentVectorSource {
  id: string
  score: number
  data?: string
  metadata?: Record<string, unknown>
}

function requireEnv(name: "UPSTASH_VECTOR_REST_URL" | "UPSTASH_VECTOR_REST_TOKEN"): string {
  const value = process.env[name]
  if (!value) {
    throw new Error("Missing vector credentials. Add UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN.")
  }
  return value
}

function getVectorIndex(): Index {
  return new Index({
    url: requireEnv("UPSTASH_VECTOR_REST_URL"),
    token: requireEnv("UPSTASH_VECTOR_REST_TOKEN"),
  })
}

function normalizeText(input: string): string {
  return input.replace(/\u0000/g, "").replace(/\s+/g, " ").trim()
}

function normalizeMultilineText(input: string): string {
  return input
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
}

function escapeFilterValue(input: string): string {
  return input.replace(/'/g, "\\'")
}

function tokenizeForLexicalScore(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
}

function lexicalOverlapScore(query: string, candidate: string): number {
  const queryTokens = new Set(tokenizeForLexicalScore(query))
  if (queryTokens.size === 0) return 0

  const candidateTokens = new Set(tokenizeForLexicalScore(candidate))
  if (candidateTokens.size === 0) return 0

  let overlap = 0
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) overlap += 1
  }

  return overlap / queryTokens.size
}

export function isSupportedLegalMimeType(mimeType: string): boolean {
  return (
    mimeType === "application/pdf" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
}

export async function extractSectionsFromDocument(input: {
  fileName: string
  mimeType: string
  buffer: Buffer
}): Promise<ExtractedSection[]> {
  const { fileName, mimeType, buffer } = input

  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    const parsed = await pdfParse(buffer)
    const fullText = typeof parsed.text === "string" ? parsed.text : ""
    const pages = fullText
      .split(/\f+/)
      .map((item: string) => normalizeMultilineText(item))
      .filter((item: string) => item.length > 0)

    if (pages.length === 0) {
      const normalized = normalizeText(fullText)
      return normalized ? [{ sourceLabel: "Page 1", text: normalized }] : []
    }

    return pages.map((text: string, index: number) => ({ sourceLabel: `Page ${index + 1}`, text }))
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.toLowerCase().endsWith(".docx")
  ) {
    const extracted = await mammoth.extractRawText({ buffer })
    const lines = extracted.value
      .split(/\n+/)
      .map((item) => normalizeText(item))
      .filter((item) => item.length > 0)

    const sections: ExtractedSection[] = []
    const blockSize = 6
    for (let index = 0; index < lines.length; index += blockSize) {
      const block = lines.slice(index, index + blockSize).join("\n")
      if (block.length > 0) {
        sections.push({ sourceLabel: `Section ${Math.floor(index / blockSize) + 1}`, text: block })
      }
    }
    return sections
  }

  throw new Error("Unsupported file type. Please upload PDF or DOCX.")
}

function splitIntoChunks(sectionText: string): string[] {
  const normalizedMultiline = normalizeMultilineText(sectionText)
  if (!normalizedMultiline) return []

  const clauseLikeUnits = normalizedMultiline
    .split(/\n{2,}|(?=\b(?:Clause|Section|Article|Schedule)\s+\d+[A-Za-z0-9.:-]*)/gi)
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0)

  const units = clauseLikeUnits.length > 0 ? clauseLikeUnits : [normalizeText(normalizedMultiline)]

  const baseChunks: string[] = []
  let currentChunk = ""

  for (const unit of units) {
    if (!currentChunk) {
      currentChunk = unit
      continue
    }

    const candidate = `${currentChunk}\n\n${unit}`
    if (candidate.length <= MAX_CHARS_PER_CHUNK) {
      currentChunk = candidate
      continue
    }

    baseChunks.push(currentChunk)
    currentChunk = unit
  }

  if (currentChunk) {
    baseChunks.push(currentChunk)
  }

  if (baseChunks.length <= 1) return baseChunks

  return baseChunks.map((chunk, index) => {
    if (index === 0) return chunk
    const previousTail = baseChunks[index - 1].slice(-CHUNK_OVERLAP_CHARS)
    return `${previousTail}\n\n${chunk}`.trim()
  })
}

export async function upsertDocumentSections(input: {
  ownerId: string
  documentId: string
  documentName: string
  sections: ExtractedSection[]
}): Promise<{ chunkCount: number; vectorIds: string[] }> {
  const { ownerId, documentId, documentName, sections } = input
  const index = getVectorIndex().namespace(ownerId)
  const vectors: Array<{ id: string; data: string; metadata: Record<string, unknown> }> = []

  for (const section of sections) {
    const chunks = splitIntoChunks(section.text)
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
      vectors.push({
        id: `doc-${documentId}-${randomUUID()}`,
        data: chunks[chunkIndex],
        metadata: {
          type: "legal_document",
          documentId,
          documentName,
          sourceLabel: section.sourceLabel,
          chunkIndex,
          createdAt: new Date().toISOString(),
        },
      })
    }
  }

  if (vectors.length === 0) {
    throw new Error("No readable content found in the uploaded document.")
  }

  await index.upsert(vectors)
  return {
    chunkCount: vectors.length,
    vectorIds: vectors.map((item) => item.id),
  }
}

export async function searchDocumentChunks(input: {
  ownerId: string
  documentId: string
  query: string
  topK: number
}): Promise<DocumentVectorSource[]> {
  const { ownerId, documentId, query, topK } = input
  const index = getVectorIndex().namespace(ownerId)
  const documentFilter = `documentId = '${escapeFilterValue(documentId)}'`
  const raw = (await index.query({
    data: query,
    topK: Math.max(40, topK * 6),
    filter: documentFilter,
    includeMetadata: true,
    includeData: true,
    includeVectors: false,
  })) as Array<{
    id: string
    score: number
    data?: string
    metadata?: Record<string, unknown>
  }>

  return raw
    .map((item) => {
      const lexicalScore = lexicalOverlapScore(query, item.data ?? "")
      const rerankScore = item.score * 0.75 + lexicalScore * 0.25
      return {
        ...item,
        rerankScore,
      }
    })
    .sort((a, b) => b.rerankScore - a.rerankScore)
    .slice(0, topK)
    .map((item) => ({
      id: item.id,
      score: item.score,
      data: item.data,
      metadata: item.metadata,
    }))
}

export async function deleteDocumentVectors(input: {
  ownerId: string
  vectorIds: string[]
}): Promise<void> {
  if (input.vectorIds.length === 0) return
  const index = getVectorIndex().namespace(input.ownerId)
  await index.delete(input.vectorIds)
}
