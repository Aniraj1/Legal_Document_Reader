import { NextResponse } from "next/server"
import { listDocumentsForOwner } from "@/lib/document-registry"
import { requireDocumentUser } from "@/lib/document-auth"

export async function GET() {
  try {
    const user = await requireDocumentUser()
    const documents = await listDocumentsForOwner(user.id)
    return NextResponse.json({ documents })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch documents." },
      { status: 401 },
    )
  }
}
