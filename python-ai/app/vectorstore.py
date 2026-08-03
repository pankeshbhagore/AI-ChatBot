"""
Vector database layer backed by ChromaDB (free, embedded, persisted to local disk).

All chunks from all PDFs are stored in a single Chroma collection, "knowledge_base".
Each chunk carries metadata (document_id, document_name, page, vector_collection_id)
so that:
  - retrieval can be scoped/filtered if needed
  - deleting a single PDF's vectors (on admin "Delete PDF") is a metadata-filtered delete
"""

from typing import List, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings

_client = None
_collection = None
_embedder = None


def _get_embedder():
    global _embedder
    if _embedder is not None:
        return _embedder

    if settings.embedding_provider == "openai":
        from langchain_openai import OpenAIEmbeddings

        _embedder = OpenAIEmbeddings(api_key=settings.openai_api_key)
    else:
        # Free, local, no API key required.
        from langchain_community.embeddings import HuggingFaceEmbeddings

        _embedder = HuggingFaceEmbeddings(
            model_name=settings.hf_embedding_model,
            model_kwargs={'device': 'cpu'}
        )

    return _embedder


def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection

    _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    _collection = _client.get_or_create_collection(name="knowledge_base")
    return _collection


def add_chunks(
    document_id: str,
    document_name: str,
    vector_collection_id: str,
    chunks: List[str],
    pages: List[Optional[int]],
) -> int:
    """Embeds and stores chunks. Returns the number of chunks stored."""
    collection = _get_collection()
    embedder = _get_embedder()

    embeddings = embedder.embed_documents(chunks)

    ids = [f"{document_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "document_id": document_id,
            "document_name": document_name,
            "vector_collection_id": vector_collection_id,
            "page": pages[i] if pages[i] is not None else -1,
        }
        for i in range(len(chunks))
    ]

    collection.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)
    return len(chunks)


def delete_document(vector_collection_id: str) -> None:
    collection = _get_collection()
    collection.delete(where={"vector_collection_id": vector_collection_id})


def similarity_search(query: str, top_k: Optional[int] = None) -> List[dict]:
    collection = _get_collection()
    embedder = _get_embedder()
    k = top_k or settings.top_k

    query_embedding = embedder.embed_query(query)
    results = collection.query(query_embeddings=[query_embedding], n_results=k)

    hits = []
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    for doc, meta in zip(docs, metas):
        hits.append({"text": doc, "document_name": meta.get("document_name"), "page": meta.get("page")})
    return hits
