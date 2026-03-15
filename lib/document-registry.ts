import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"

export type DocumentStatus = "ready" | "failed"

export interface DocumentRecord {
  id: string
  ownerId: string
  fileName: string
  mimeType: string
  size: number
  status: DocumentStatus
  chunkCount: number
  vectorIds: string[]
  createdAt: string
}

const DATA_DIR = path.resolve(process.cwd(), ".data")
const REGISTRY_PATH = path.resolve(DATA_DIR, "documents.json")

async function ensureRegistry(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  try {
    await readFile(REGISTRY_PATH, "utf-8")
  } catch {
    await writeFile(REGISTRY_PATH, "[]", "utf-8")
  }
}

async function readRegistry(): Promise<DocumentRecord[]> {
  await ensureRegistry()
  const raw = await readFile(REGISTRY_PATH, "utf-8")
  const parsed = JSON.parse(raw) as DocumentRecord[]
  return Array.isArray(parsed) ? parsed : []
}

async function writeRegistry(records: DocumentRecord[]): Promise<void> {
  await ensureRegistry()
  await writeFile(REGISTRY_PATH, JSON.stringify(records, null, 2), "utf-8")
}

export async function listDocumentsForOwner(ownerId: string): Promise<DocumentRecord[]> {
  const records = await readRegistry()
  return records
    .filter((item) => item.ownerId === ownerId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function createDocumentRecord(input: {
  ownerId: string
  fileName: string
  mimeType: string
  size: number
  chunkCount: number
  vectorIds?: string[]
  status?: DocumentStatus
}): Promise<DocumentRecord> {
  const records = await readRegistry()
  const record: DocumentRecord = {
    id: randomUUID(),
    ownerId: input.ownerId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.size,
    status: input.status ?? "ready",
    chunkCount: input.chunkCount,
    vectorIds: input.vectorIds ?? [],
    createdAt: new Date().toISOString(),
  }

  records.push(record)
  await writeRegistry(records)
  return record
}

export async function getDocumentForOwner(ownerId: string, documentId: string): Promise<DocumentRecord | undefined> {
  const records = await readRegistry()
  return records.find((item) => item.ownerId === ownerId && item.id === documentId)
}

export async function updateDocumentChunkCount(ownerId: string, documentId: string, chunkCount: number): Promise<void> {
  const records = await readRegistry()
  const index = records.findIndex((item) => item.ownerId === ownerId && item.id === documentId)
  if (index === -1) return

  records[index] = {
    ...records[index],
    chunkCount,
  }
  await writeRegistry(records)
}

export async function updateDocumentIngestion(
  ownerId: string,
  documentId: string,
  update: { chunkCount: number; vectorIds: string[] },
): Promise<void> {
  const records = await readRegistry()
  const index = records.findIndex((item) => item.ownerId === ownerId && item.id === documentId)
  if (index === -1) return

  records[index] = {
    ...records[index],
    chunkCount: update.chunkCount,
    vectorIds: update.vectorIds,
  }
  await writeRegistry(records)
}

export async function deleteDocumentRecord(ownerId: string, documentId: string): Promise<void> {
  const records = await readRegistry()
  const filtered = records.filter((item) => !(item.ownerId === ownerId && item.id === documentId))
  await writeRegistry(filtered)
}
