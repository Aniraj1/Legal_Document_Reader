import { NextResponse } from "next/server"
import { logoutDocumentUser } from "@/lib/document-auth"
import { apiClient } from "@/lib/api-client"

export async function POST() {
  try {
    // Logout from both systems
    await logoutDocumentUser()
    await apiClient.logout()

    return NextResponse.json({
      ok: true,
      message: "Successfully logged out.",
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to logout." },
      { status: 500 },
    )
  }
}
