"use server"

import { Redis } from "@upstash/redis"

const LEGAL_REDIS_KEY = "legal:analytics:events"
const MAX_EVENTS = 1000
const TTL_SECONDS = 7 * 24 * 60 * 60

function getRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables")
  }

  return new Redis({ url, token })
}

export interface LegalEvent {
  timestamp: string
  eventType: "chat" | "upload" | "delete"
  status: "success" | "error"
  model?: string
  queryHash?: string
  querySample?: string
  documentId?: string
  documentName?: string
  totalMs: number
  vectorMs?: number
  groqMs?: number
  sourceLabels?: string[]
  sourceTypes?: string[]
  errorMessage?: string
}

export interface LegalAnalyticsSummary {
  totalQueries: number
  totalEvents: number
  totalUploads: number
  totalDeletes: number
  successCount: number
  errorCount: number
  successRate: number
  avgTotalMs: number
  avgVectorMs: number
  avgGroqMs: number
  topSourceTypes: Array<{ type: string; count: number }>
  querySamples: Array<{ query: string; count: number }>
  recentEvents: LegalEvent[]
  hourlyDistribution: Array<{ hour: number; count: number }>
  topDocuments: Array<{ document: string; count: number }>
}

export async function trackLegalEvent(event: Omit<LegalEvent, "timestamp">): Promise<void> {
  try {
    const redis = getRedisClient()
    const newEvent: LegalEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }

    await redis.lpush(LEGAL_REDIS_KEY, JSON.stringify(newEvent))
    await redis.ltrim(LEGAL_REDIS_KEY, 0, MAX_EVENTS - 1)
    await redis.expire(LEGAL_REDIS_KEY, TTL_SECONDS)
  } catch (error) {
    console.error("[Analytics] Failed to track legal event:", error)
  }
}

async function getLegalEventList(): Promise<LegalEvent[]> {
  try {
    const redis = getRedisClient()
    const rawEvents = await redis.lrange(LEGAL_REDIS_KEY, 0, -1)

    return rawEvents.map((raw) => {
      if (typeof raw === "string") {
        return JSON.parse(raw) as LegalEvent
      }
      return raw as LegalEvent
    })
  } catch (error) {
    console.error("[Analytics] Failed to get legal events:", error)
    return []
  }
}

export async function getLegalAnalytics(): Promise<LegalAnalyticsSummary> {
  const events = await getLegalEventList()

  if (events.length === 0) {
    return {
      totalQueries: 0,
      totalEvents: 0,
      totalUploads: 0,
      totalDeletes: 0,
      successCount: 0,
      errorCount: 0,
      successRate: 0,
      avgTotalMs: 0,
      avgVectorMs: 0,
      avgGroqMs: 0,
      topSourceTypes: [],
      querySamples: [],
      recentEvents: [],
      hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
      topDocuments: [],
    }
  }

  const successEvents = events.filter((e) => e.status === "success")
  const errorEvents = events.filter((e) => e.status === "error")
  const chatEvents = events.filter((e) => e.eventType === "chat")
  const chatSuccessEvents = chatEvents.filter((e) => e.status === "success")
  const uploadEvents = events.filter((e) => e.eventType === "upload")
  const deleteEvents = events.filter((e) => e.eventType === "delete")

  const avgTotalMs = chatSuccessEvents.length > 0
    ? chatSuccessEvents.reduce((sum, e) => sum + e.totalMs, 0) / chatSuccessEvents.length
    : 0

  const vectorMsEvents = chatSuccessEvents.filter((e) => e.vectorMs !== undefined)
  const avgVectorMs = vectorMsEvents.length > 0
    ? vectorMsEvents.reduce((sum, e) => sum + (e.vectorMs ?? 0), 0) / vectorMsEvents.length
    : 0

  const groqMsEvents = chatSuccessEvents.filter((e) => e.groqMs !== undefined)
  const avgGroqMs = groqMsEvents.length > 0
    ? groqMsEvents.reduce((sum, e) => sum + (e.groqMs ?? 0), 0) / groqMsEvents.length
    : 0

  const sourceTypeCounts = new Map<string, number>()
  for (const event of chatSuccessEvents) {
    for (const type of event.sourceLabels ?? event.sourceTypes ?? []) {
      sourceTypeCounts.set(type, (sourceTypeCounts.get(type) ?? 0) + 1)
    }
  }

  const topSourceTypes = Array.from(sourceTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const queryHashCounts = new Map<string, { query: string; count: number }>()
  for (const event of chatEvents) {
    if (event.querySample && event.queryHash) {
      const existing = queryHashCounts.get(event.queryHash)
      if (existing) {
        existing.count += 1
      } else {
        queryHashCounts.set(event.queryHash, { query: event.querySample, count: 1 })
      }
    }
  }

  const querySamples = Array.from(queryHashCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const documentCounts = new Map<string, number>()
  for (const event of events) {
    if (event.documentName || event.documentId) {
      const label = event.documentName ?? event.documentId ?? "unknown"
      documentCounts.set(label, (documentCounts.get(label) ?? 0) + 1)
    }
  }

  const topDocuments = Array.from(documentCounts.entries())
    .map(([document, count]) => ({ document, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const hourCounts = new Map<number, number>()
  for (const event of events) {
    const hour = new Date(event.timestamp).getHours()
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
  }

  const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: hourCounts.get(i) ?? 0,
  }))

  return {
    totalQueries: chatEvents.length,
    totalEvents: events.length,
    totalUploads: uploadEvents.length,
    totalDeletes: deleteEvents.length,
    successCount: successEvents.length,
    errorCount: errorEvents.length,
    successRate: events.length > 0 ? (successEvents.length / events.length) * 100 : 0,
    avgTotalMs,
    avgVectorMs,
    avgGroqMs,
    topSourceTypes,
    querySamples,
    recentEvents: events.slice(0, 20),
    hourlyDistribution,
    topDocuments,
  }
}

export async function clearLegalAnalytics(): Promise<void> {
  try {
    const redis = getRedisClient()
    await redis.del(LEGAL_REDIS_KEY)
  } catch (error) {
    console.error("[Analytics] Failed to clear legal events:", error)
  }
}
