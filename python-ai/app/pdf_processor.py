"""
PDF processing pipeline: extract text (page-aware) -> chunk -> return chunks
with their originating page number, ready for embedding + storage.
"""

from typing import List, Tuple
from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter

from app.config import settings


def extract_pages(file_path: str) -> List[Tuple[int, str]]:
    """Returns a list of (page_number [1-indexed], page_text)."""
    reader = PdfReader(file_path)
    pages = []
    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append((idx + 1, text))
    return pages


def chunk_document(file_path: str) -> Tuple[List[str], List[int]]:
    """
    Extracts and splits a PDF into chunks, preserving page numbers per chunk.
    Returns (chunks, pages) as parallel lists.
    """
    pages = extract_pages(file_path)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks: List[str] = []
    chunk_pages: List[int] = []

    for page_number, text in pages:
        page_chunks = splitter.split_text(text)
        for c in page_chunks:
            chunks.append(c)
            chunk_pages.append(page_number)

    return chunks, chunk_pages
