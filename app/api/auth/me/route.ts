import { NextResponse } from "next/server"
import { getAuthenticatedDocumentUser, getDocumentAuthStatusHint } from "@/lib/document-auth"

export async function GET() {
  try {
    const user = await getAuthenticatedDocumentUser()
    return NextResponse.json({ user, mode: getDocumentAuthStatusHint() })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load auth status." },
      { status: 500 },
    )
  }
}
