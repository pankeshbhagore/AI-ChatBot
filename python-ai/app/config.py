import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    channel_pdf_request: str = os.getenv("CHANNEL_PDF_REQUEST", "pdf_process_requests")
    channel_pdf_response: str = os.getenv("CHANNEL_PDF_RESPONSE", "pdf_process_responses")
    channel_question_request: str = os.getenv("CHANNEL_QUESTION_REQUEST", "question_requests")
    channel_question_response: str = os.getenv("CHANNEL_QUESTION_RESPONSE", "question_responses")

    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_chat_model: str = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")

    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "huggingface")
    hf_embedding_model: str = os.getenv("HF_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

    chroma_persist_dir: str = os.getenv("CHROMA_PERSIST_DIR", "chroma_db")

    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1000"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "150"))
    top_k: int = int(os.getenv("TOP_K", "4"))

    ai_service_port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))


settings = Settings()
