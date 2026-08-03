# Architecture

## High-level system diagram

```
┌──────────────────┐
│  Next.js Frontend │  (App Router, TS, Tailwind, shadcn-style UI)
│  - /admin/*        │  Admin panel (login, dashboard, KB management)
│  - /chat           │  Public chatbot (SSE streaming, markdown, sources)
└─────────┬─────────┘
          │ REST + SSE (HTTP)
          ▼
┌──────────────────┐
│ Node.js Backend    │  (Express + TypeScript)
│  - JWT auth         │
│  - PDF upload (multer) + metadata (MongoDB)
│  - Publishes jobs / questions to Redis
│  - Subscribes to Redis for results, relays to frontend via SSE
└─────────┬─────────┘
          │ Redis PUBLISH / SUBSCRIBE only
          │ (no direct HTTP calls to python-ai)
          ▼
┌──────────────────┐
│   Redis Pub/Sub    │
│  Channels:
│   - pdf_process_requests / pdf_process_responses
│   - question_requests / question_responses
└─────────┬─────────┘
          ▼
┌──────────────────┐
│ Python AI Service  │  (FastAPI + LangChain + LangGraph)
│  - Redis listener (background thread)
│  - PDF extraction (pypdf) + chunking (RecursiveCharacterTextSplitter)
│  - Embeddings (HuggingFace sentence-transformers, free — or OpenAI)
│  - LangGraph RAG workflow (see below)
└─────────┬─────────┘
          ▼
┌──────────────────┐        ┌──────────────────┐
│   ChromaDB         │        │   MongoDB          │
│  (vector store,     │        │  (Users, Documents, │
│   persisted to disk)│        │   Chats)            │
└──────────────────┘        └──────────────────┘
```

## LangGraph workflow (mandatory)

```
Receive Question
      │
      ▼
Retrieve Context   (similarity search against ChromaDB)
      │
      ▼
Generate Answer    (streamed token-by-token via callback -> Redis -> SSE)
      │
      ▼
Generate Suggested Questions  (3-5 follow-ups, JSON output)
      │
      ▼
Return Response    (answer + sources + suggested questions)
```

This is implemented as a `StateGraph` in `python-ai/app/graph.py` with one
node per stage, wired together with `add_edge`, matching the assignment's
required flow exactly.

## Redis Pub/Sub contract (mandatory — no direct HTTP between backend and AI service)

### PDF processing
- Backend publishes to `pdf_process_requests`:
  ```json
  { "requestId": "uuid", "documentId": "...", "filePath": "uploads/x.pdf", "fileName": "x.pdf", "vectorCollectionId": "uuid" }
  ```
- Python AI publishes to `pdf_process_responses`:
  ```json
  { "requestId": "uuid", "status": "success", "chunks": 42 }
  ```

### Question answering (streamed)
- Backend publishes to `question_requests`:
  ```json
  { "requestId": "uuid", "sessionId": "...", "question": "...", "history": [{"question":"...","answer":"..."}] }
  ```
- Python AI publishes multiple messages to `question_responses` as the LLM generates:
  ```json
  { "requestId": "uuid", "type": "chunk", "token": "The" }
  { "requestId": "uuid", "type": "chunk", "token": " answer" }
  { "requestId": "uuid", "type": "final", "answer": "...", "sources": [...], "suggestedQuestions": [...] }
  ```

The backend maintains an in-memory map of `requestId -> SSE response object`
(for questions) or `requestId -> Promise` (for PDF processing) so multiple
concurrent requests can be multiplexed over the same Redis connection safely.

## Database schema

**users**
| field    | type   | notes            |
|----------|--------|------------------|
| _id      | ObjectId |                |
| email    | string | unique           |
| password | string | bcrypt hash      |
| role     | string | "admin"          |
| createdAt| Date   |                  |

**knowledgedocuments** (Documents collection from the spec)
| field             | type   | notes                                |
|-------------------|--------|---------------------------------------|
| _id               | ObjectId |                                     |
| fileName          | string | stored filename on disk               |
| originalName      | string | original uploaded filename            |
| filePath          | string | path on disk                          |
| fileSize          | number | bytes                                 |
| uploadDate        | Date   |                                        |
| processingStatus  | string | pending / processing / processed / failed |
| chunkCount        | number | number of chunks stored in Chroma     |
| errorMessage      | string | populated if processing failed        |
| vectorCollectionId| string | metadata key used to filter/delete vectors in Chroma |

**chats**
| field              | type     | notes                          |
|--------------------|----------|---------------------------------|
| _id                | ObjectId |                                |
| sessionId          | string   | groups a conversation           |
| question           | string   |                                |
| answer             | string   |                                |
| sources            | array    | `{documentName, page}[]`        |
| suggestedQuestions | array    | `string[]`                      |
| timestamp          | Date     |                                |
