# 🔌 API Reference Documentation

This document describes the REST API exposed by the Node.js backend. 

**Base URL**: `http://localhost:5000`

> [!NOTE]
> All `/api/documents/*` endpoints require administrative privileges. You must pass a valid JWT token via the `Authorization: Bearer <token>` header, or rely on the `token` HTTP-only cookie set upon login.
> All `/api/chat/*` endpoints are public and do not require authentication.

---

## 🔐 Authentication

### `POST /api/auth/login`
Authenticates an administrator and issues a JWT session token.

**Request Body** (`application/json`)
```json
{
  "email": "admin@example.com",
  "password": "Admin@12345"
}
```

**Response** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
  "user": {
    "id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### `GET /api/auth/me`
Retrieves the currently authenticated user's profile.

**Headers**
- `Authorization: Bearer <token>` (Optional if cookie is present)

**Response** `200 OK`
```json
{
  "success": true,
  "user": {
    "id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### `POST /api/auth/logout`
Clears the authentication cookie and ends the session.

**Response** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 📚 Knowledge Base Management (Admin)

### `GET /api/documents/dashboard`
Fetches aggregate statistics for the admin dashboard.

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalDocuments": 15,
    "totalChats": 142,
    "totalQuestions": 450,
    "recentDocuments": [
      {
        "id": "64a1b2c3d4e5f6a7b8c9d0e1",
        "originalName": "Employee_Handbook.pdf",
        "processingStatus": "processed",
        "uploadDate": "2023-10-01T12:00:00Z"
      }
    ]
  }
}
```

### `GET /api/documents`
Lists all uploaded documents, with optional search filtering.

**Query Parameters**
- `search` (optional): String to filter documents by filename.

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "64a1b2c3d4e5f6a7b8c9d0e1",
      "originalName": "Q3_Report.pdf",
      "fileSize": 1048576,
      "processingStatus": "processed",
      "chunkCount": 85,
      "uploadDate": "2023-10-02T09:30:00Z"
    }
  ]
}
```

### `POST /api/documents/upload`
Uploads a new PDF and queues it for asynchronous processing by the AI worker.

**Request** (`multipart/form-data`)
- `file`: The PDF file (max 25MB)

**Response** `202 Accepted`
```json
{
  "success": true,
  "message": "Document uploaded and queued for processing",
  "data": {
    "id": "64a1b2c3d4e5f6a7b8c9d0e2",
    "status": "pending"
  }
}
```

### `DELETE /api/documents/:id`
Deletes a document from MongoDB, removes the physical file, and instructs the AI worker to purge its vectors from ChromaDB.

**Path Parameters**
- `id`: The MongoDB ObjectId of the document.

**Response** `200 OK`
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### `POST /api/documents/:id/reprocess`
Triggers a manual re-extraction and re-embedding of an existing PDF.

**Path Parameters**
- `id`: The MongoDB ObjectId of the document.

**Response** `202 Accepted`
```json
{
  "success": true,
  "message": "Document queued for reprocessing"
}
```

---

## 💬 Public Chat

### `POST /api/chat/ask`
Submits a question to the RAG system. The response is streamed back via **Server-Sent Events (SSE)**.

**Request Body** (`application/json`)
```json
{
  "sessionId": "usr-browser-uuid-1234",
  "question": "What is the standard PTO allowance?"
}
```

**Response** (`text/event-stream`)
```text
event: chunk
data: {"token":"Full"}

event: chunk
data: {"token":" time"}

event: chunk
data: {"token":" employees"}

event: chunk
data: {"token":" receive"}

event: chunk
data: {"token":" 20"}

event: chunk
data: {"token":" days."}

event: final
data: {
  "answer": "Full time employees receive 20 days.",
  "sources": [{"documentName": "Handbook.pdf", "page": 12}],
  "suggestedQuestions": ["How do I request time off?", "What holidays are paid?"]
}
```

> [!WARNING]
> If an error occurs during processing (e.g., AI service is down), an `error` event will be emitted over the stream.
> ```text
> event: error
> data: {"message": "AI service timeout"}
> ```

### `GET /api/chat/history/:sessionId`
Retrieves the conversation history for a specific session to provide contextual memory.

**Path Parameters**
- `sessionId`: The unique identifier for the user's chat session.

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "64a1b2c3d4e5f6a7b8c9d0e9",
      "question": "What is the standard PTO allowance?",
      "answer": "Full time employees receive 20 days.",
      "sources": [{"documentName": "Handbook.pdf", "page": 12}],
      "suggestedQuestions": ["How do I request time off?", "What holidays are paid?"],
      "timestamp": "2023-10-02T10:15:00Z"
    }
  ]
}
```

### `GET /api/chat/sessions` (Admin Only)
Retrieves an aggregated list of all chat sessions for the admin dashboard.

**Headers**
- `Authorization: Bearer <token>` (Optional if cookie is present)

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "usr-browser-uuid-1234",
      "firstQuestion": "What is the standard PTO allowance?",
      "messageCount": 4,
      "startTime": "2023-10-02T10:15:00Z",
      "lastTime": "2023-10-02T10:18:00Z"
    }
  ]
}
```

### `DELETE /api/chat/sessions/:sessionId` (Admin Only)
Permanently deletes a chat session and all its associated messages from the database.

**Path Parameters**
- `sessionId`: The unique identifier for the user's chat session.

**Headers**
- `Authorization: Bearer <token>` (Optional if cookie is present)

**Response** `200 OK`
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

---

## 🩺 System Health

### `GET /health` (Node.js API - Port 5000)
### `GET /health` (Python AI Worker - Port 8000)
Liveness probes for container orchestration.

**Response** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2023-10-02T10:20:00Z"
}
```
