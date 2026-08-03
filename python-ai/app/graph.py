"""
Mandatory LangGraph workflow:

    Receive Question -> Retrieve Context -> Generate Answer
                      -> Generate Suggested Questions -> Return Response

Implemented as a LangGraph StateGraph with one node per stage. The "Generate
Answer" node streams tokens back to the caller in real time via a callback,
which the redis_listener publishes to Redis so the frontend can render a
token-by-token streaming response.
"""

import json
from typing import Callable, List, Optional, TypedDict

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain.callbacks.base import BaseCallbackHandler

from app.config import settings
from app import vectorstore


class GraphState(TypedDict, total=False):
    question: str
    history: List[dict]
    context: List[dict]
    answer: str
    suggested_questions: List[str]
    on_token: Optional[Callable[[str], None]]


class _StreamToCallback(BaseCallbackHandler):
    def __init__(self, on_token: Optional[Callable[[str], None]]):
        self.on_token = on_token

    def on_llm_new_token(self, token: str, **kwargs) -> None:
        if self.on_token:
            self.on_token(token)


def _get_llm(streaming: bool, on_token: Optional[Callable[[str], None]] = None) -> ChatOpenAI:
    callbacks = [_StreamToCallback(on_token)] if streaming else []
    return ChatOpenAI(
        api_key=settings.openai_api_key,
        model=settings.openai_chat_model,
        temperature=0.2,
        streaming=streaming,
        callbacks=callbacks,
    )


def node_retrieve_context(state: GraphState) -> GraphState:
    hits = vectorstore.similarity_search(state["question"])
    state["context"] = hits
    return state


def node_generate_answer(state: GraphState) -> GraphState:
    context_text = "\n\n".join(
        f"[Source: {h['document_name']}, page {h['page']}]\n{h['text']}" for h in state.get("context", [])
    )

    history_text = "\n".join(
        f"User: {h['question']}\nAssistant: {h['answer']}" for h in state.get("history", [])
    )

    system_prompt = (
        "You are a helpful knowledge-base assistant. Answer the user's question using ONLY the "
        "provided context extracted from uploaded PDF documents. If the answer is not contained "
        "in the context, say you don't have enough information in the knowledge base. Be concise "
        "and cite which document/page the information came from when relevant."
    )

    user_prompt = (
        f"Conversation so far:\n{history_text}\n\n"
        f"Context from knowledge base:\n{context_text}\n\n"
        f"Question: {state['question']}"
    )

    llm = _get_llm(streaming=True, on_token=state.get("on_token"))
    result = llm.invoke(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )
    state["answer"] = result.content
    return state


def node_generate_suggested_questions(state: GraphState) -> GraphState:
    context_text = "\n\n".join(h["text"] for h in state.get("context", []))

    prompt = (
        "Based on the question, the answer just given, and the retrieved knowledge-base context, "
        "generate 3 to 5 short, relevant follow-up questions a user might ask next. "
        "Respond ONLY with a JSON array of strings, no extra text.\n\n"
        f"Question: {state['question']}\nAnswer: {state['answer']}\nContext: {context_text[:2000]}"
    )

    llm = _get_llm(streaming=False)
    result = llm.invoke([{"role": "user", "content": prompt}])

    content = result.content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    try:
        questions = json.loads(content)
        if not isinstance(questions, list):
            raise ValueError("not a list")
    except Exception:
        # Fall back to naive line-splitting if the model didn't return clean JSON.
        questions = [
            line.strip('"-•,[] ').strip()
            for line in content.splitlines()
            if line.strip() and "```" not in line
        ][:5]

    state["suggested_questions"] = questions[:5]
    return state


def build_graph():
    graph = StateGraph(GraphState)
    graph.add_node("retrieve_context", node_retrieve_context)
    graph.add_node("generate_answer", node_generate_answer)
    graph.add_node("generate_suggested_questions", node_generate_suggested_questions)

    graph.set_entry_point("retrieve_context")
    graph.add_edge("retrieve_context", "generate_answer")
    graph.add_edge("generate_answer", "generate_suggested_questions")
    graph.add_edge("generate_suggested_questions", END)

    return graph.compile()


_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph


def run_conversation(question: str, history: List[dict], on_token: Optional[Callable[[str], None]] = None) -> dict:
    """Entry point called by the Redis listener for each incoming question."""
    graph = get_graph()
    final_state = graph.invoke(
        {"question": question, "history": history or [], "on_token": on_token}
    )

    sources = [
        {"documentName": h["document_name"], "page": h["page"] if h["page"] != -1 else None}
        for h in final_state.get("context", [])
    ]
    # De-duplicate sources by (documentName, page)
    seen = set()
    unique_sources = []
    for s in sources:
        key = (s["documentName"], s["page"])
        if key not in seen:
            seen.add(key)
            unique_sources.append(s)

    answer = final_state.get("answer", "")
    
    # If the LLM indicates it couldn't find the answer in the context, don't show irrelevant sources
    if "don't have enough information" in answer.lower() or "do not have enough information" in answer.lower():
        unique_sources = []

    return {
        "answer": answer,
        "sources": unique_sources,
        "suggestedQuestions": final_state.get("suggested_questions", []),
    }
