# API Documentation

Base URL (default): `http://localhost:5000`

All admin endpoints require `Authorization: Bearer <token>` (or the `token`
httpOnly cookie set at login). Chat endpoints are public per the spec.

---

## Auth

### POST `/api/auth/login`
Admin login.

**Body**
```json
{ "email": "admin@example.com", "password": "Admin@12345" }
```

**Response `200`**
```json
{ "success": true, "token": "jwt...", "user": { "id": "...", "email": "...", "role": "admin" } }
```

### GET `/api/auth/me`
Returns the currently authenticated admin (requires auth).

### POST `/api/auth/logout`
Clears the auth cookie.

---

## Knowledge Base (admin, requires auth)

### GET `/api/documents/dashboard`
Returns dashboard stats: total PDFs, total chat sessions, total questions asked, recent documents.

### POST `/api/documents/upload`
`multipart/form-data` with a `file` field (PDF only, max 25MB).
Creates a `Document` record with `processingStatus: "pending"`, then
asynchronously publishes a job to Redis for the Python AI service to extract,
chunk, embed, and store vectors. Status transitions to `processing` then
`processed` (or `failed`).

### GET `/api/documents?search=<term>`
Lists all uploaded PDFs, optionally filtered by filename.

### DELETE `/api/documents/:id`
Deletes the PDF's DB record, its file on disk, and its vectors from ChromaDB
(via a Redis Pub/Sub round-trip to the AI service).

### POST `/api/documents/:id/reprocess`
Re-runs extraction/chunking/embedding for an existing PDF.

---

## Chat (public, no auth)

### POST `/api/chat/ask`
Streams the AI's answer via **Server-Sent Events**.

**Body**
```json
{ "sessionId": "uuid-per-browser-session", "question": "What is the refund policy?" }
```

**SSE events**
```
event: chunk
data: {"token":"The"}

event: chunk
data: {"token":" refund"}

event: final
data: {"answer":"...","sources":[{"documentName":"policy.pdf","page":2}],"suggestedQuestions":["...","..."]}
```
or, on failure:
```
event: error
data: {"message":"..."}
```

### GET `/api/chat/history/:sessionId`
Returns the full stored conversation history for a session (question, answer,
sources, suggestedQuestions, timestamp) — powers conversation memory.

---

## Health

### GET `/health` (backend)
### GET `/health` (python-ai, port 8000)
Simple liveness checks.
