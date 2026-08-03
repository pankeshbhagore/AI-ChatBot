"""
Subscribes to the two REQUEST channels published by the Node.js backend and
publishes results back on the corresponding RESPONSE channels. This is the
MANDATORY Redis Pub/Sub bridge — the AI service never talks to the backend
over HTTP directly.
"""

import json
import threading
import redis

from app.config import settings
from app import pdf_processor, vectorstore, graph


def _get_redis_client() -> redis.Redis:
    return redis.from_url(settings.redis_url, decode_responses=True)


def _handle_pdf_message(publisher: redis.Redis, payload: dict):
    request_id = payload.get("requestId")
    action = payload.get("action", "process")

    try:
        if action == "delete":
            vectorstore.delete_document(payload["vectorCollectionId"])
            publisher.publish(
                settings.channel_pdf_response,
                json.dumps({"requestId": request_id, "status": "success"}),
            )
            return

        # Default action: process a newly uploaded PDF.
        file_path = payload["filePath"]
        document_id = payload["documentId"]
        document_name = payload["fileName"]
        vector_collection_id = payload["vectorCollectionId"]

        chunks, pages = pdf_processor.chunk_document(file_path)
        count = vectorstore.add_chunks(document_id, document_name, vector_collection_id, chunks, pages)

        publisher.publish(
            settings.channel_pdf_response,
            json.dumps({"requestId": request_id, "status": "success", "chunks": count}),
        )
    except Exception as exc:  # noqa: BLE001
        publisher.publish(
            settings.channel_pdf_response,
            json.dumps({"requestId": request_id, "status": "error", "message": str(exc)}),
        )


def _handle_question_message(publisher: redis.Redis, payload: dict):
    request_id = payload.get("requestId")
    question = payload.get("question", "")
    history = payload.get("history", [])

    def on_token(token: str):
        publisher.publish(
            settings.channel_question_response,
            json.dumps({"requestId": request_id, "type": "chunk", "token": token}),
        )

    try:
        result = graph.run_conversation(question, history, on_token=on_token)
        publisher.publish(
            settings.channel_question_response,
            json.dumps(
                {
                    "requestId": request_id,
                    "type": "final",
                    "answer": result["answer"],
                    "sources": result["sources"],
                    "suggestedQuestions": result["suggestedQuestions"],
                }
            ),
        )
    except Exception as exc:  # noqa: BLE001
        publisher.publish(
            settings.channel_question_response,
            json.dumps({"requestId": request_id, "type": "error", "message": str(exc)}),
        )


def start_listener_thread():
    """Runs the blocking pub/sub loop in a background thread so FastAPI can
    still serve a lightweight health-check endpoint on the same process."""

    def _run():
        client = _get_redis_client()
        publisher = _get_redis_client()
        pubsub = client.pubsub()
        pubsub.subscribe(settings.channel_pdf_request, settings.channel_question_request)

        print(
            f"[redis-listener] Subscribed to '{settings.channel_pdf_request}' and "
            f"'{settings.channel_question_request}'"
        )

        for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                payload = json.loads(message["data"])
            except json.JSONDecodeError:
                continue

            channel = message["channel"]
            if channel == settings.channel_pdf_request:
                threading.Thread(target=_handle_pdf_message, args=(publisher, payload), daemon=True).start()
            elif channel == settings.channel_question_request:
                threading.Thread(target=_handle_question_message, args=(publisher, payload), daemon=True).start()

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return thread
