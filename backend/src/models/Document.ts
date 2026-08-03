import { Schema, model, Document as MDocument } from "mongoose";

export type ProcessingStatus = "pending" | "processing" | "processed" | "failed";

export interface IKnowledgeDocument extends MDocument {
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  uploadDate: Date;
  processingStatus: ProcessingStatus;
  chunkCount: number;
  errorMessage?: string;
  vectorCollectionId: string; // id used as metadata filter / collection name in Chroma
}

const documentSchema = new Schema<IKnowledgeDocument>({
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadDate: { type: Date, default: Date.now },
  processingStatus: {
    type: String,
    enum: ["pending", "processing", "processed", "failed"],
    default: "pending",
  },
  chunkCount: { type: Number, default: 0 },
  errorMessage: { type: String },
  vectorCollectionId: { type: String, required: true },
});

export const KnowledgeDocument = model<IKnowledgeDocument>("KnowledgeDocument", documentSchema);
