/**
 * Shared type definitions for Redis Pub/Sub payloads exchanged between
 * the Node.js backend and the Python AI service.
 *
 * These are the "contracts" that both services agree on when publishing
 * and subscribing to Redis channels.
 */

// ─── PDF Processing ─────────────────────────────────────────────────────────

export interface PdfProcessRequest {
  requestId: string;
  documentId: string;
  filePath: string;
  fileName: string;
  vectorCollectionId: string;
  action?: "process" | "delete";
}

export interface PdfProcessResponse {
  requestId: string;
  status: "success" | "error";
  chunks?: number;
  message?: string;
}

// ─── Question / Chat ────────────────────────────────────────────────────────

export interface HistoryEntry {
  question: string;
  answer: string;
}

export interface QuestionRequest {
  requestId: string;
  sessionId: string;
  question: string;
  history: HistoryEntry[];
}

export interface QuestionChunk {
  requestId: string;
  type: "chunk";
  token: string;
}

export interface QuestionFinalResponse {
  requestId: string;
  type: "final";
  answer: string;
  sources: Array<{ documentName: string; page?: number | null }>;
  suggestedQuestions: string[];
}

export interface QuestionErrorResponse {
  requestId: string;
  type: "error";
  message: string;
}

export type QuestionResponse = QuestionChunk | QuestionFinalResponse | QuestionErrorResponse;
