import { NextResponse } from "next/server"
import { loginDocumentUser } from "@/lib/document-auth"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string }
    const username = (body.username ?? "").trim()
    const password = body.password ?? ""

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 })
    }

    const user = await loginDocumentUser(username, password)
    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to authenticate." },
      { status: 401 },
    )
  }
}
