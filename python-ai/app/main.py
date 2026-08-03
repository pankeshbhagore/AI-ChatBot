"""
Entry point for the Python AI service.

FastAPI is used to satisfy the mandatory tech-stack requirement and to expose
a small health-check surface for ops/monitoring. The actual work is driven by
the Redis Pub/Sub listener (app/redis_listener.py), NOT by REST calls from the
Node backend — communication between backend and AI service must go through
Redis, per the assignment spec.
"""

from fastapi import FastAPI
from app.config import settings
from app.redis_listener import start_listener_thread

app = FastAPI(title="Knowledge Base AI Service", version="1.0.0")

_listener_thread = None


@app.on_event("startup")
def on_startup():
    global _listener_thread
    _listener_thread = start_listener_thread()


@app.get("/health")
def health():
    return {"status": "ok", "listening": _listener_thread.is_alive() if _listener_thread else False}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.ai_service_port, reload=False)
