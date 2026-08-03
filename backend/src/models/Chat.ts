import { Schema, model, Document as MDocument } from "mongoose";

export interface ISource {
  documentName: string;
  page?: number;
}

export interface IChat extends MDocument {
  sessionId: string;
  question: string;
  answer: string;
  sources: ISource[];
  suggestedQuestions: string[];
  timestamp: Date;
}

const chatSchema = new Schema<IChat>({
  sessionId: { type: String, required: true, index: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  sources: [
    {
      documentName: { type: String },
      page: { type: Number },
    },
  ],
  suggestedQuestions: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
});

export const Chat = model<IChat>("Chat", chatSchema);
