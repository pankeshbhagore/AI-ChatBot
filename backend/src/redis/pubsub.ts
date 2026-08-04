import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env";

/**
 * This module implements the MANDATORY Redis Pub/Sub communication channel
 * between the Node.js backend and the Python AI service.
 *
 * Direct HTTP calls between backend <-> python-ai are intentionally NOT used.
 * Instead:
 *   - backend PUBLISHes a request (with a correlation `requestId`) on a request channel
 *   - python-ai SUBSCRIBEs to that channel, processes it, and PUBLISHes the result
 *     on a response channel
 *   - backend SUBSCRIBEs to the response channel and resolves/streams based on requestId
 */

// Separate connections: ioredis requires a dedicated connection for subscribing.
export const publisher = new Redis(env.redisUrl);
export const subscriber = new Redis(env.redisUrl, { enableReadyCheck: false });

type PendingResolver = {
  resolve: (value: any) => void;
  reject: (err: Error) => void;
  timeout: NodeJS.Timeout;
};

type StreamHandlers = {
  onChunk: (token: string) => void;
  onFinal: (payload: any) => void;
  onError: (message: string) => void;
};

const pendingRequests = new Map<string, PendingResolver>();
const streamingRequests = new Map<string, StreamHandlers>();

let subscribed = false;

export function initRedisSubscriptions() {
  if (subscribed) return;
  subscribed = true;

  subscriber.subscribe(
    env.channels.pdfResponse,
    env.channels.questionResponse,
    (err) => {
      if (err) {
        console.error("[redis] Failed to subscribe:", err);
      } else {
        console.log(
          `[redis] Subscribed to "${env.channels.pdfResponse}" and "${env.channels.questionResponse}"`
        );
      }
    }
  );

  subscriber.on("message", (channel, message) => {
    let payload: any;
    try {
      payload = JSON.parse(message);
    } catch (e) {
      console.error("[redis] Invalid JSON message on channel", channel, message);
      return;
    }

    const { requestId } = payload;
    if (!requestId) return;

    if (channel === env.channels.pdfResponse) {
      const pending = pendingRequests.get(requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(requestId);
        pending.resolve(payload);
      }
    }

    if (channel === env.channels.questionResponse) {
      const handlers = streamingRequests.get(requestId);
      if (!handlers) return;

      if (payload.type === "chunk") {
        handlers.onChunk(payload.token);
      } else if (payload.type === "final") {
        handlers.onFinal(payload);
        streamingRequests.delete(requestId);
      } else if (payload.type === "error") {
        handlers.onError(payload.message || "Unknown error from AI service");
        streamingRequests.delete(requestId);
      }
    }
  });
}

/** Request/response pattern used for PDF processing (upload -> process -> ack). */
export function publishAndWait<T = any>(
  channel: string,
  data: Record<string, any>,
  timeoutMs: number = env.redisResponseTimeoutMs
): Promise<T> {
  const requestId = uuidv4();
  const message = { requestId, ...data };

  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error("Timed out waiting for AI service response"));
    }, timeoutMs);

    pendingRequests.set(requestId, { resolve, reject, timeout });

    publisher.publish(channel, JSON.stringify(message)).catch((err) => {
      clearTimeout(timeout);
      pendingRequests.delete(requestId);
      reject(err);
    });
  });
}

/** Streaming pattern used for chat "ask question" (token-by-token via SSE). */
export function publishAndStream(
  channel: string,
  data: Record<string, any>,
  handlers: StreamHandlers
): string {
  const requestId = uuidv4();

  // Safety timeout: if the AI service crashes or hangs, clean up after a period.
  const timeout = setTimeout(() => {
    if (streamingRequests.has(requestId)) {
      streamingRequests.delete(requestId);
      handlers.onError("AI service timed out. Please try again.");
    }
  }, env.redisResponseTimeoutMs);

  // Wrap handlers to clear the timeout when a terminal event arrives.
  const wrappedHandlers: StreamHandlers = {
    onChunk: (token) => handlers.onChunk(token),
    onFinal: (payload) => {
      clearTimeout(timeout);
      handlers.onFinal(payload);
    },
    onError: (message) => {
      clearTimeout(timeout);
      handlers.onError(message);
    },
  };

  streamingRequests.set(requestId, wrappedHandlers);

  publisher.publish(channel, JSON.stringify({ requestId, ...data })).catch((err) => {
    clearTimeout(timeout);
    streamingRequests.delete(requestId);
    handlers.onError(err.message);
  });

  return requestId;
}

export function cancelStream(requestId: string) {
  streamingRequests.delete(requestId);
}
