import { Request, Response } from "express";
import { z } from "zod";
import { Chat } from "../models/Chat";
import { publishAndStream } from "../redis/pubsub";
import { env } from "../config/env";

const askSchema = z.object({
  sessionId: z.string().min(1),
  question: z.string().min(1),
});

/**
 * Streams the AI answer back to the client over Server-Sent Events (SSE).
 * Internally, this request is relayed to the Python AI service over Redis
 * Pub/Sub (see redis/pubsub.ts) — the backend never calls python-ai directly.
 */
export async function askQuestion(req: Request, res: Response) {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "sessionId and question are required" });
  }
  const { sessionId, question } = parsed.data;

  // Pull recent conversation memory for this session so the AI service has context.
  const history = await Chat.find({ sessionId })
    .sort({ timestamp: -1 })
    .limit(6)
    .then((docs) => docs.reverse().map((d) => ({ question: d.question, answer: d.answer })));

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  publishAndStream(
    env.channels.questionRequest,
    { sessionId, question, history },
    {
      onChunk: (token: string) => send("chunk", { token }),
      onFinal: async (payload: any) => {
        const { answer, sources, suggestedQuestions } = payload;
        await Chat.create({ sessionId, question, answer, sources, suggestedQuestions });
        send("final", { answer, sources, suggestedQuestions });
        res.end();
      },
      onError: (message: string) => {
        send("error", { message });
        res.end();
      },
    }
  );

  req.on("close", () => {
    // Client disconnected; nothing further to clean up beyond letting the
    // stream handler map entry expire naturally on final/error/timeout.
  });
}

export async function chatHistory(req: Request, res: Response) {
  const { sessionId } = req.params;
  const history = await Chat.find({ sessionId }).sort({ timestamp: 1 });
  return res.json({ success: true, history });
}

export async function listSessions(req: Request, res: Response) {
  const sessions = await Chat.aggregate([
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: "$sessionId",
        firstQuestion: { $first: "$question" },
        messageCount: { $sum: 1 },
        startTime: { $first: "$timestamp" },
        lastTime: { $last: "$timestamp" },
      },
    },
    { $sort: { lastTime: -1 } },
  ]);

  return res.json({ success: true, data: sessions });
}

export async function deleteSession(req: Request, res: Response) {
  const { sessionId } = req.params;
  await Chat.deleteMany({ sessionId });
  return res.json({ success: true, message: "Session deleted successfully" });
}
