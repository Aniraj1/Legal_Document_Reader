import { randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { cookies } from "next/headers"

export type UserRole = "admin" | "user"

export interface AuthUser {
  id: string
  username: string
  role: UserRole
}

interface SessionRecord {
  id: string
  user: AuthUser
  expiresAt: string
}

interface AuthCredential {
  username: string
  password: string
  role: UserRole
}

const SESSION_COOKIE_NAME = "dt_doc_session"
const DATA_DIR = path.resolve(process.cwd(), ".data")
const SESSIONS_PATH = path.resolve(DATA_DIR, "auth-sessions.json")
const SESSION_TTL_SECONDS = 60 * 60 * 8

function getConfiguredCredentials(): AuthCredential[] {
  const raw = process.env.DOCUMENT_AUTH_USERS_JSON
  if (raw) {
    const parsed = JSON.parse(raw) as AuthCredential[]
    return parsed.filter((item) => item.username && item.password && (item.role === "admin" || item.role === "user"))
  }

  if (process.env.NODE_ENV !== "production") {
    return [{ username: "admin", password: "admin123", role: "admin" }]
  }

  throw new Error("Missing DOCUMENT_AUTH_USERS_JSON for production document auth.")
}

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  try {
    await readFile(SESSIONS_PATH, "utf-8")
  } catch {
    await writeFile(SESSIONS_PATH, "[]", "utf-8")
  }
}

async function readSessions(): Promise<SessionRecord[]> {
  await ensureStore()
  const raw = await readFile(SESSIONS_PATH, "utf-8")
  const parsed = JSON.parse(raw) as SessionRecord[]
  return Array.isArray(parsed) ? parsed : []
}

async function writeSessions(sessions: SessionRecord[]): Promise<void> {
  await ensureStore()
  await writeFile(SESSIONS_PATH, JSON.stringify(sessions, null, 2), "utf-8")
}

function toUserId(username: string): string {
  return `user:${username.toLowerCase()}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function expiryIsoFromNow(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

function isExpired(iso: string): boolean {
  return Date.now() >= new Date(iso).getTime()
}

export async function loginDocumentUser(username: string, password: string): Promise<AuthUser> {
  const normalizedUsername = username.trim()
  const credentials = getConfiguredCredentials()
  const matched = credentials.find(
    (item) => item.username === normalizedUsername && item.password === password,
  )
  if (!matched) {
    throw new Error("Invalid username or password.")
  }

  const user: AuthUser = {
    id: toUserId(matched.username),
    username: matched.username,
    role: matched.role,
  }

  const sessionId = randomUUID()
  const sessions = await readSessions()
  const active = sessions.filter((item) => !isExpired(item.expiresAt))
  active.push({
    id: sessionId,
    user,
    expiresAt: expiryIsoFromNow(SESSION_TTL_SECONDS),
  })
  await writeSessions(active)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  })

  return user
}

export async function logoutDocumentUser(): Promise<void> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (sessionId) {
    const sessions = await readSessions()
    await writeSessions(sessions.filter((item) => item.id !== sessionId && !isExpired(item.expiresAt)))
  }

  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getAuthenticatedDocumentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!sessionId) return null

  const sessions = await readSessions()
  const validSessions = sessions.filter((item) => !isExpired(item.expiresAt))
  if (validSessions.length !== sessions.length) {
    await writeSessions(validSessions)
  }

  const matched = validSessions.find((item) => item.id === sessionId)
  return matched?.user ?? null
}

export async function requireDocumentUser(): Promise<AuthUser> {
  const user = await getAuthenticatedDocumentUser()
  if (!user) {
    throw new Error("Authentication required for document access.")
  }
  return user
}

export async function requireDocumentRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireDocumentUser()
  if (!allowedRoles.includes(user.role)) {
    throw new Error("You do not have permission for this operation.")
  }
  return user
}

export function getDocumentAuthStatusHint(): string {
  const raw = process.env.DOCUMENT_AUTH_USERS_JSON
  if (raw || process.env.NODE_ENV === "production") {
    return "configured"
  }
  return `development default credentials active at ${nowIso()} (admin/admin123)`
}
