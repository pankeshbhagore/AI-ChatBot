# PDF Knowledge Base AI Chatbot (RAG System)

A microservice AI chatbot: admins upload PDFs that become a searchable
knowledge base; a public chatbot answers questions using RAG over that
knowledge base, with source citations, streaming responses, and suggested
follow-up questions.

**Architecture**: Next.js frontend → Node.js/Express backend → **Redis Pub/Sub**
→ Python FastAPI/LangChain/LangGraph AI service → ChromaDB (vectors) + MongoDB
(metadata). See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for diagrams
and the full Redis message contract, and [`docs/API.md`](docs/API.md) for API
docs.

## Tech stack

| Layer      | Technology                                             |
|------------|---------------------------------------------------------|
| Frontend   | Next.js (App Router), TypeScript, Tailwind CSS, shadcn-style UI |
| Backend    | Node.js, Express, TypeScript                             |
| AI Service | Python, FastAPI, LangChain, LangGraph                    |
| Database   | MongoDB                                                  |
| Vector DB  | ChromaDB (persisted locally, free)                       |
| Messaging  | Redis Pub/Sub (mandatory bridge between backend & AI service) |

## Project structure

```
frontend/       Next.js app (admin panel + public chat)
backend/        Express/TypeScript API + Redis pub/sub + MongoDB models
python-ai/      FastAPI service: PDF processing, LangChain, LangGraph, Chroma
shared/         (reserved for shared types/contracts if you extend the project)
docs/           Architecture diagram + API documentation
docker-compose.yml
```

## Quick start (Docker — recommended)

1. Copy the root env file and fill in secrets:
   ```bash
   cp .env.example .env
   ```
   At minimum set `OPENAI_API_KEY` (used for answer generation and suggested
   questions; embeddings default to a **free** local HuggingFace model so you
   don't need an OpenAI key just to embed PDFs — see `EMBEDDING_PROVIDER`).

2. Start everything:
   ```bash
   docker-compose up --build
   ```

3. Open:
   - Public chatbot: http://localhost:3000/chat
   - Admin panel: http://localhost:3000/admin/login
   - Backend health: http://localhost:5000/health
   - AI service health: http://localhost:8000/health

4. Default admin credentials (seeded automatically on first backend boot;
   change them in `.env` before first run):
   ```
   email:    admin@example.com
   password: Admin@12345
   ```

## Running locally without Docker

You'll need MongoDB and Redis running locally (or point the `.env` files at
hosted instances).

### 1. Backend
```bash
cd backend
cp .env.example .env      # edit as needed
npm install
npm run dev                # http://localhost:5000
```

### 2. Python AI service
```bash
cd python-ai
cp .env.example .env       # edit as needed, add OPENAI_API_KEY
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.main          # http://localhost:8000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

## How it works end to end

1. **Admin uploads a PDF** → backend stores the file + a `pending` `Document`
   record in MongoDB → publishes a job on Redis (`pdf_process_requests`).
2. **Python AI service** (subscribed to that channel) extracts text page by
   page, chunks it, generates embeddings, and stores vectors in ChromaDB with
   metadata (document name, page number). It publishes the result back on
   `pdf_process_responses`; the backend updates the document's status to
   `processed`/`failed`.
3. **A user asks a question** in the public chat → backend publishes it on
   `question_requests` (including recent conversation history for memory) and
   opens an SSE stream to the browser.
4. **The AI service's LangGraph workflow** retrieves relevant chunks from
   Chroma, generates a streamed answer (publishing token chunks on
   `question_responses` as they're produced), then generates 3–5 suggested
   follow-up questions, and finally publishes the full result.
5. **The backend forwards everything to the browser over SSE** in real time,
   and persists the finished exchange (question, answer, sources, suggested
   questions) in the `Chat` collection.

Direct HTTP calls between the backend and the AI service are intentionally
never used — everything mandatory goes through Redis Pub/Sub, per spec.

## Environment variables

See `.env.example` in the root, `backend/.env.example`,
`python-ai/.env.example`, and `frontend/.env.example` for the full list, with
comments.

## Database schema & API docs

- Schema: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#database-schema)
- API reference: [`docs/API.md`](docs/API.md)

## Notes on free vector DB & embeddings

- Vector DB: **ChromaDB**, running embedded and persisted to local disk
  (`python-ai/chroma_db` by default, or a Docker volume) — no paid service
  required.
- Embeddings default to `EMBEDDING_PROVIDER=huggingface`
  (`sentence-transformers/all-MiniLM-L6-v2`, runs locally, free). Set
  `EMBEDDING_PROVIDER=openai` to use OpenAI embeddings instead if you prefer.
- Answer generation and suggested-question generation use OpenAI's chat
  models (`OPENAI_CHAT_MODEL`, default `gpt-4o-mini`) — swap
  `python-ai/app/graph.py`'s `_get_llm()` for another LangChain chat model if
  you'd rather use a different/free LLM provider.

## Submission checklist (per assignment brief)

- [x] Public GitHub repository — push this folder to a new public repo
- [x] Complete source code (frontend/backend/python-ai/shared)
- [x] README with setup instructions (this file)
- [x] `.env.example` (root + per-service)
- [x] Database schema (`docs/ARCHITECTURE.md`)
- [x] Architecture diagram (`docs/ARCHITECTURE.md`)
- [x] API documentation (`docs/API.md`)
- [ ] Record a 5–10 min Loom/YouTube video demonstrating: project overview,
      folder structure, codebase walkthrough, system architecture, Redis
      communication, LangGraph workflow, PDF upload process, the chatbot
      working end-to-end with follow-up questions and cited PDFs, and the
      suggested-questions feature — then add the link here before submitting.

## Suggested video walkthrough script (5–10 min)

1. **Overview** (30s) — what the app does, tech stack.
2. **Folder structure** (30s) — `frontend/`, `backend/`, `python-ai/`, `docs/`.
3. **Architecture** (1 min) — walk through `docs/ARCHITECTURE.md` diagram;
   emphasize Redis Pub/Sub is the only bridge between backend and AI service.
4. **Redis communication** (1 min) — show `backend/src/redis/pubsub.ts` and
   `python-ai/app/redis_listener.py` side by side; explain request/response +
   streaming patterns.
5. **LangGraph workflow** (1 min) — open `python-ai/app/graph.py`, show the
   4-node graph and run it live, pointing at logs showing each stage.
6. **Admin panel demo** (1–2 min) — login, upload a PDF, watch status go
   pending → processing → processed, show dashboard counts update.
7. **Chatbot demo** (2 min) — ask a question, show streaming tokens, markdown
   rendering, source/page citation badges, then click a suggested follow-up
   question to show conversation memory in action.
8. **Wrap-up** (30s) — mention `.env.example`, docker-compose, and where the
   README/API docs live.
