import { NextResponse } from "next/server"
import { logoutDocumentUser } from "@/lib/document-auth"

export async function POST() {
  try {
    await logoutDocumentUser()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to logout." },
      { status: 500 },
    )
  }
}
