"use server"

import { getDocumentForOwner } from "@/lib/document-registry"
import { searchDocumentChunks, type DocumentVectorSource } from "@/lib/document-rag"
import { requireDocumentRole } from "@/lib/document-auth"
import { trackLegalEvent } from "@/lib/analytics"
import { hashQuery } from "@/lib/utils"

export type DocumentChatRole = "user" | "assistant"

export interface DocumentChatMessage {
  role: DocumentChatRole
  content: string
}

export interface DocumentChatRequest {
  question: string
  documentId: string
  model?: string
  messages?: DocumentChatMessage[]
}

export interface DocumentChatResponse {
  answer: string
  sources: DocumentVectorSource[]
}

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"
const ALLOWED_GROQ_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"] as const
type AllowedGroqModel = (typeof ALLOWED_GROQ_MODELS)[number]

const MAX_QUESTION_LENGTH = 2000
const MAX_MESSAGE_CHARS = 800
const MAX_MESSAGES = 10
const DEFAULT_TOP_K = 6

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error("Missing GROQ_API_KEY in environment variables.")
  }
  return value
}

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ")
}

function pickAllowedGroqModel(model: string | undefined): AllowedGroqModel {
  if (!model) return DEFAULT_GROQ_MODEL
  return (ALLOWED_GROQ_MODELS as readonly string[]).includes(model)
    ? (model as AllowedGroqModel)
    : DEFAULT_GROQ_MODEL
}

function sanitizeMessages(messages: DocumentChatMessage[] | undefined): DocumentChatMessage[] {
  if (!messages || messages.length === 0) return []

  return messages
    .filter((item) => (item.role === "user" || item.role === "assistant") && item.content.trim().length > 0)
    .slice(-MAX_MESSAGES)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, MAX_MESSAGE_CHARS),
    }))
}

function buildContext(sources: DocumentVectorSource[]): string {
  return sources
    .map((item, index) => {
      const sourceLabel = String(item.metadata?.sourceLabel ?? `Source ${index + 1}`)
      const content = (item.data ?? "").slice(0, 1800)
      return `[${sourceLabel}]\n${content}`
    })
    .join("\n\n---\n\n")
}

export async function documentChat(request: DocumentChatRequest): Promise<DocumentChatResponse> {
  const startMs = Date.now()
  let vectorMs = 0
  let groqMs = 0
  let model: AllowedGroqModel = DEFAULT_GROQ_MODEL
  let docName = ""

  try {
    const question = normalizeQuestion(request.question)
    if (!question) {
      throw new Error("Please enter a question.")
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      throw new Error("Your question is too long. Please shorten it and try again.")
    }
    if (!request.documentId) {
      throw new Error("Select a document before chatting.")
    }

    const user = await requireDocumentRole(["admin", "user"])
    const ownerId = user.id
    const document = await getDocumentForOwner(ownerId, request.documentId)
    if (!document) {
      throw new Error("Document not found or access denied.")
    }
    docName = document.fileName

    const vectorStart = Date.now()
    const sources = await searchDocumentChunks({
      ownerId,
      documentId: request.documentId,
      query: question,
      topK: DEFAULT_TOP_K,
    })
    vectorMs = Date.now() - vectorStart

    if (sources.length === 0) {
      await trackLegalEvent({
        eventType: "chat",
        status: "success",
        model: DEFAULT_GROQ_MODEL,
        queryHash: hashQuery(question),
        querySample: question.slice(0, 80),
        documentId: request.documentId,
        documentName: docName,
        totalMs: Date.now() - startMs,
        vectorMs,
        groqMs: 0,
        sourceLabels: [],
      })

      return {
        sources: [],
        answer:
          "I could not find enough evidence in this document for that question. Please ask about specific clauses, obligations, dates, or parties.",
      }
    }

    model = pickAllowedGroqModel(request.model)
    const groqKey = requireEnv("GROQ_API_KEY")
    const context = buildContext(sources)
    const messages = sanitizeMessages(request.messages)

    const groqStart = Date.now()
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          {
            role: "system",
            content:
              "You are a legal document assistant. Answer only from provided context. If the answer is not in context, state that clearly. Do not provide legal advice. Quote or paraphrase relevant clauses and mention source labels.",
          },
          {
            role: "system",
            content: `Document: ${document.fileName}\n\nContext:\n${context}`,
          },
          ...messages,
          { role: "user", content: question },
        ],
      }),
    })
    groqMs = Date.now() - groqStart

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Groq API error: ${response.status} - ${errorData}`)
    }

    const json = (await response.json()) as GroqChatCompletionResponse
    const answer = json.choices?.[0]?.message?.content?.trim()
    if (!answer) {
      throw new Error("Model returned an empty response.")
    }

    await trackLegalEvent({
      eventType: "chat",
      status: "success",
      model,
      queryHash: hashQuery(question),
      querySample: question.slice(0, 80),
      documentId: request.documentId,
      documentName: docName,
      totalMs: Date.now() - startMs,
      vectorMs,
      groqMs,
      sourceLabels: sources
        .map((source) => String(source.metadata?.sourceLabel ?? ""))
        .filter((label) => label.length > 0),
      sourceTypes: ["legal_document"],
    })

    return {
      answer,
      sources,
    }
  } catch (error) {
    await trackLegalEvent({
      eventType: "chat",
      status: "error",
      model,
      queryHash: hashQuery(normalizeQuestion(request.question || "")),
      querySample: normalizeQuestion(request.question || "").slice(0, 80),
      documentId: request.documentId,
      documentName: docName || undefined,
      totalMs: Date.now() - startMs,
      vectorMs,
      groqMs,
      errorMessage: error instanceof Error ? error.message : "Unknown legal chat error",
    })
    throw error
  }
}
