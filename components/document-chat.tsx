"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Check, Copy, FileText, Loader2, Send, Trash2, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import {
  documentChat,
  type DocumentChatMessage,
  type DocumentChatResponse,
} from "@/app/actions-document-chat"

type AllowedModel = "llama-3.1-8b-instant" | "llama-3.3-70b-versatile"

type StoredDocument = {
  id: string
  fileName: string
  createdAt: string
  status: "ready" | "failed"
  chunkCount: number
  vectorIds?: string[]
}

type AuthUser = {
  id: string
  username: string
  role: "admin" | "user"
}

type MessageView = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: DocumentChatResponse["sources"]
}

function createMessageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function toServerMessages(messages: MessageView[]): DocumentChatMessage[] {
  return messages.map((item) => ({ role: item.role, content: item.content }))
}

function toStoredDocument(item: { id: string; file_name: string }): StoredDocument {
  return {
    id: item.id,
    fileName: item.file_name,
    createdAt: new Date().toISOString(),
    status: "ready",
    chunkCount: 0,
  }
}

async function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  textarea.remove()
}

export function DocumentChat() {
  const { user: authUser, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("")
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<MessageView[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [model, setModel] = useState<AllowedModel>("llama-3.1-8b-instant")
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const selectedDocument = useMemo(
    () => documents.find((item) => item.id === selectedDocumentId),
    [documents, selectedDocumentId],
  )

  const canSend = question.trim().length > 0 && selectedDocumentId.length > 0 && !isLoading

  function handleUnauthorized(message?: string): never {
    throw new Error(message ?? "Session expired. Please sign in again.")
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, isLoading])

  useEffect(() => {
    if (!authUser) {
      setUser(null)
      return
    }

    setUser({
      id: String(authUser.id),
      username: authUser.username,
      role: "user",
    })
  }, [authUser])

  useEffect(() => {
    if (!user) {
      setDocuments([])
      setSelectedDocumentId("")
      setMessages([])
      return
    }
    void loadDocuments()
  }, [user])

  async function loadDocuments(): Promise<void> {
    try {
      const result = await apiClient.getUserFiles()
      if (result.success === false || result.error) {
        const message = result.message || "Failed to load documents"
        if (message.toLowerCase().includes("auth")) {
          handleUnauthorized(message)
        }
        throw new Error(message)
      }

      const docs = (result.data?.results ?? []).map(toStoredDocument)
      setDocuments(docs)
      if (docs.length > 0 && !selectedDocumentId) {
        setSelectedDocumentId(docs[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents")
    }
  }

  async function handleUploadFile(file: File): Promise<void> {
    setIsUploading(true)
    setError(null)

    try {
      const result = await apiClient.uploadUserFile(file)
      if (result.success === false || result.error || !result.data?.id) {
        const message = result.message || "Upload failed"
        if (message.toLowerCase().includes("auth")) {
          handleUnauthorized(message)
        }
        throw new Error(message)
      }

      await loadDocuments()
      setSelectedDocumentId(String(result.data.id))
      setMessages([])
      setQuestion("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDeleteDocument(documentId: string): Promise<void> {
    if (!documentId || isLoading || isUploading) return
    if (!window.confirm("Delete this document and all its indexed embeddings? This cannot be undone.")) {
      return
    }

    setError(null)
    try {
      const result = await apiClient.removeUserFile(documentId)
      if (result.success === false || result.error) {
        const message = result.message || "Delete failed"
        if (message.toLowerCase().includes("auth")) {
          handleUnauthorized(message)
        }
        throw new Error(message)
      }

      await loadDocuments()
      setMessages([])
      setQuestion("")
      if (selectedDocumentId === documentId) {
        const remaining = documents.filter((item) => item.id !== documentId)
        setSelectedDocumentId(remaining[0]?.id ?? "")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  async function handleDeleteAllDocuments(): Promise<void> {
    if (isLoading || isUploading || documents.length === 0) return
    if (!window.confirm("Delete all uploaded documents and indexed embeddings? This cannot be undone.")) {
      return
    }

    setError(null)
    try {
      const result = await apiClient.removeAllUserFiles()
      if (result.success === false || result.error) {
        const message = result.message || "Delete failed"
        if (message.toLowerCase().includes("auth")) {
          handleUnauthorized(message)
        }
        throw new Error(message)
      }

      setDocuments([])
      setSelectedDocumentId("")
      setMessages([])
      setQuestion("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || !selectedDocumentId || isLoading) return

    setIsLoading(true)
    setError(null)

    const priorMessages = messages
    const userMessage: MessageView = {
      id: createMessageId(),
      role: "user",
      content: trimmed,
    }

    setMessages([...priorMessages, userMessage])
    setQuestion("")

    try {
      const result = await documentChat({
        question: trimmed,
        documentId: selectedDocumentId,
        model,
        messages: toServerMessages(priorMessages),
      })

      const assistantMessage: MessageView = {
        id: createMessageId(),
        role: "assistant",
        content: result.answer,
        sources: result.sources,
      }

      setMessages((current) => [...current, assistantMessage])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process your question"
      if (message.toLowerCase().includes("auth") || message.toLowerCase().includes("session")) {
        setUser(null)
        setDocuments([])
        setSelectedDocumentId("")
        setMessages([])
        setError("Session expired. Please sign in again.")
      } else {
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopy(messageId: string, text: string): Promise<void> {
    await copyText(text)
    setCopiedMessageId(messageId)
    window.setTimeout(() => {
      setCopiedMessageId((current) => (current === messageId ? null : current))
    }, 1500)
  }

  if (isAuthLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border p-5 bg-card space-y-3">
          <h2 className="text-lg font-semibold">Sign in to access legal documents</h2>
          <Button asChild className="w-full">
            <Link href="/auth/login">Go to login</Link>
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="shrink-0 px-4 py-4 border-b">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Secure owner-scoped mode</Badge>
            <Badge variant="outline">{user.role.toUpperCase()}</Badge>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDocumentId}
              onChange={(e) => {
                setSelectedDocumentId(e.target.value)
                setMessages([])
                setError(null)
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Select a document</option>
              {documents.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fileName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          {selectedDocument ? (
            <p className="text-xs text-muted-foreground">
              Active document: {selectedDocument.fileName} • {selectedDocument.chunkCount} chunks
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Signed in as {user.username}</p>
          )}
          <div className="flex items-center gap-2">
            {documents.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleDeleteAllDocuments()}
                className="h-7 px-2 gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove all
              </Button>
            )}
            {selectedDocument && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => void handleDeleteDocument(selectedDocument.id)}
                className="h-7 px-2 gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            )}
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-medium">Ask questions about your legal document</h2>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Upload a PDF or DOCX, select it, then ask about clauses, obligations, dates, penalties, and key terms.
            </p>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant"
              return (
                <div key={message.id} className={isAssistant ? "" : "flex justify-end"}>
                  {isAssistant ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Legal Assistant</div>
                      <div className="text-foreground whitespace-pre-wrap leading-relaxed">{message.content}</div>
                      <button
                        type="button"
                        onClick={() => handleCopy(message.id, message.content)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {copiedMessageId === message.id ? (
                          <>
                            <Check className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>

                      {message.sources && message.sources.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            Citations ({message.sources.length})
                          </summary>
                          <div className="mt-2 space-y-2">
                            {message.sources.map((source, index) => (
                              <div key={`${message.id}:${source.id || index}`} className="rounded bg-muted/50 p-2 text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {String(source.metadata?.sourceLabel ?? "Source")}
                                  </Badge>
                                  <span className="text-muted-foreground">{(source.score * 100).toFixed(0)}%</span>
                                </div>
                                <p className="text-muted-foreground line-clamp-3">{source.data}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div className="max-w-[82%] px-4 py-2.5 rounded-2xl bg-muted text-foreground">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}
                </div>
              )
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyzing document...</span>
              </div>
            )}

            {error && <div className="text-sm text-destructive">{error}</div>}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pb-4">
        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl border bg-muted/50 focus-within:ring-2 focus-within:ring-ring">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={1}
              placeholder="Ask about obligations, deadlines, rights, penalties..."
              disabled={isLoading || !selectedDocumentId}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void handleSubmit(e)
                }
              }}
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="h-7 gap-1.5 px-2"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  <span className="text-xs">{isUploading ? "Uploading..." : "Upload"}</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      void handleUploadFile(file)
                    }
                    e.currentTarget.value = ""
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setModel(model === "llama-3.1-8b-instant" ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant")
                  }
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {model === "llama-3.1-8b-instant" ? "Fast" : "Quality"}
                </button>
              </div>

              <Button
                type="submit"
                size="icon"
                disabled={!canSend}
                className="h-7 w-7 rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
