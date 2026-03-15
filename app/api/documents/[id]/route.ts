import { NextResponse } from "next/server"
import { deleteDocumentRecord, getDocumentForOwner } from "@/lib/document-registry"
import { deleteDocumentVectors } from "@/lib/document-rag"
import { requireDocumentRole } from "@/lib/document-auth"
import { trackLegalEvent } from "@/lib/analytics"

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const startMs = Date.now()
  let documentId = ""
  let documentName = ""
  try {
    const user = await requireDocumentRole(["admin", "user"])
    const params = await context.params
    documentId = params.id

    const record = await getDocumentForOwner(user.id, documentId)
    if (!record) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 })
    }
    documentName = record.fileName

    await deleteDocumentVectors({
      ownerId: user.id,
      vectorIds: record.vectorIds,
    })

    await deleteDocumentRecord(user.id, documentId)

    await trackLegalEvent({
      eventType: "delete",
      status: "success",
      documentId,
      documentName,
      totalMs: Date.now() - startMs,
      sourceTypes: ["legal_document"],
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete document."
    const status = message.toLowerCase().includes("auth") || message.toLowerCase().includes("permission") ? 401 : 500

    await trackLegalEvent({
      eventType: "delete",
      status: "error",
      documentId: documentId || undefined,
      documentName: documentName || undefined,
      totalMs: Date.now() - startMs,
      errorMessage: message,
      sourceTypes: ["legal_document"],
    })

    return NextResponse.json({ error: message }, { status })
  }
}
