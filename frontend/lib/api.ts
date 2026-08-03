export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export interface Source {
  documentName: string;
  page?: number | null;
}

/**
 * Opens an SSE stream to /api/chat/ask. The backend relays this request to
 * the Python AI service over Redis Pub/Sub and streams tokens back as they
 * are generated.
 */
export function streamAskQuestion(
  sessionId: string,
  question: string,
  handlers: {
    onChunk: (token: string) => void;
    onFinal: (data: { answer: string; sources: Source[]; suggestedQuestions: string[] }) => void;
    onError: (message: string) => void;
  }
) {
  const controller = new AbortController();

  fetch(`${API_BASE_URL}/api/chat/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, question }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.body) throw new Error("No response body for stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const evt of events) {
          const lines = evt.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.replace("event:", "").trim();
          const data = JSON.parse(dataLine.replace("data:", "").trim());

          if (eventType === "chunk") handlers.onChunk(data.token);
          else if (eventType === "final") handlers.onFinal(data);
          else if (eventType === "error") handlers.onError(data.message);
        }
      }
    })
    .catch((err) => handlers.onError(err.message));

  return () => controller.abort();
}
