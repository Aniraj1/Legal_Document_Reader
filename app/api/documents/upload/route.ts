import { NextResponse } from "next/server"
import { createDocumentRecord, updateDocumentIngestion } from "@/lib/document-registry"
import {
  extractSectionsFromDocument,
  isSupportedLegalMimeType,
  upsertDocumentSections,
} from "@/lib/document-rag"
import { requireDocumentRole } from "@/lib/document-auth"
import { trackLegalEvent } from "@/lib/analytics"

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export async function POST(request: Request) {
  const startMs = Date.now()
  let documentId = ""
  let documentName = ""
  try {
    const user = await requireDocumentRole(["admin", "user"])
    const ownerId = user.id
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 })
    }
    documentName = file.name

    if (file.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is too large. Max size is 10MB." }, { status: 400 })
    }

    if (!isSupportedLegalMimeType(file.type) && !file.name.toLowerCase().endsWith(".pdf") && !file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ error: "Unsupported format. Upload PDF or DOCX." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const sections = await extractSectionsFromDocument({
      fileName: file.name,
      mimeType: file.type,
      buffer,
    })

    const record = await createDocumentRecord({
      ownerId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      chunkCount: 0,
      vectorIds: [],
      status: "ready",
    })
    documentId = record.id

    const ingestion = await upsertDocumentSections({
      ownerId,
      documentId: record.id,
      documentName: file.name,
      sections,
    })

    await updateDocumentIngestion(ownerId, record.id, {
      chunkCount: ingestion.chunkCount,
      vectorIds: ingestion.vectorIds,
    })

    const finalRecord = {
      ...record,
      chunkCount: ingestion.chunkCount,
      vectorIds: ingestion.vectorIds,
    }

    await trackLegalEvent({
      eventType: "upload",
      status: "success",
      documentId: record.id,
      documentName: file.name,
      totalMs: Date.now() - startMs,
      sourceTypes: ["legal_document"],
    })

    return NextResponse.json({ document: finalRecord })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process uploaded document."
    const status =
      message.toLowerCase().includes("auth") || message.toLowerCase().includes("permission")
        ? 401
        : message.toLowerCase().includes("unsupported") || message.toLowerCase().includes("empty")
          ? 400
          : 500
    await trackLegalEvent({
      eventType: "upload",
      status: "error",
      documentId: documentId || undefined,
      documentName: documentName || undefined,
      totalMs: Date.now() - startMs,
      errorMessage: message,
      sourceTypes: ["legal_document"],
    })

    return NextResponse.json(
      { error: message },
      { status },
    )
  }
}
