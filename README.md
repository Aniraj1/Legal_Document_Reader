# Legal Document Assistant

A secure legal-document chat system built with Next.js, Upstash Vector, and Groq.

## Features

- Upload and index `.pdf` / `.docx` legal documents
- Authenticated owner-scoped access controls
- RAG-based Q&A with citations
- Legal analytics dashboard (`/analytics`)
- One-click document + embedding deletion
- Light/dark theme support

## Routes

- `/` – Legal document assistant
- `/documents` – Legal document assistant page
- `/analytics` – Legal analytics dashboard
- `/api/documents` – List documents for authenticated user
- `/api/documents/upload` – Upload and index a legal document
- `/api/documents/[id]` – Delete document and embeddings
- `/api/auth/login` – Login
- `/api/auth/logout` – Logout
- `/api/auth/me` – Session status
- `/api/analytics` – Legal analytics

## Environment Variables

Create `.env.local`:

```bash
UPSTASH_VECTOR_REST_URL=https://your-index.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your-vector-token
GROQ_API_KEY=your-groq-api-key

# Optional analytics persistence
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Required in production (optional in dev)
# [{"username":"admin","password":"strong-password","role":"admin"}]
DOCUMENT_AUTH_USERS_JSON=[{"username":"admin","password":"replace-me","role":"admin"}]
```

Development fallback credentials (when `DOCUMENT_AUTH_USERS_JSON` is not set):

- username: `admin`
- password: `admin123`

## Development

```bash
pnpm install
pnpm dev
```

## Production Build

```bash
pnpm build
pnpm start
```
