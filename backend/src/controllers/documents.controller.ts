import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { KnowledgeDocument } from "../models/Document";
import { publishAndWait } from "../redis/pubsub";
import { env } from "../config/env";

export async function uploadPdf(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, message: "PDF file is required" });
  }

  const vectorCollectionId = uuidv4();

  const doc = await KnowledgeDocument.create({
    fileName: file.filename,
    originalName: file.originalname,
    filePath: file.path,
    fileSize: file.size,
    processingStatus: "pending",
    vectorCollectionId,
  });

  // Kick off async processing via Redis Pub/Sub -> Python AI service.
  processDocumentAsync(doc.id, file.path, file.originalname, vectorCollectionId);

  return res.status(201).json({ success: true, document: doc });
}

async function processDocumentAsync(
  documentId: string,
  filePath: string,
  fileName: string,
  vectorCollectionId: string
) {
  try {
    await KnowledgeDocument.findByIdAndUpdate(documentId, { processingStatus: "processing" });

    const result = await publishAndWait(env.channels.pdfRequest, {
      documentId,
      filePath,
      fileName,
      vectorCollectionId,
    });

    if (result.status === "success") {
      await KnowledgeDocument.findByIdAndUpdate(documentId, {
        processingStatus: "processed",
        chunkCount: result.chunks ?? 0,
        errorMessage: undefined,
      });
    } else {
      await KnowledgeDocument.findByIdAndUpdate(documentId, {
        processingStatus: "failed",
        errorMessage: result.message || "Processing failed",
      });
    }
  } catch (err: any) {
    await KnowledgeDocument.findByIdAndUpdate(documentId, {
      processingStatus: "failed",
      errorMessage: err.message,
    });
  }
}

export async function listPdfs(req: Request, res: Response) {
  const search = (req.query.search as string) || "";
  const filter = search
    ? { originalName: { $regex: search, $options: "i" } }
    : {};

  const docs = await KnowledgeDocument.find(filter).sort({ uploadDate: -1 });
  return res.json({ success: true, documents: docs });
}

export async function deletePdf(req: Request, res: Response) {
  const doc = await KnowledgeDocument.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, message: "Document not found" });
  }

  // Remove vectors from the vector DB via the AI service.
  try {
    await publishAndWait(env.channels.pdfRequest, {
      action: "delete",
      documentId: doc.id,
      vectorCollectionId: doc.vectorCollectionId,
    });
  } catch (err) {
    // Continue deletion even if vector cleanup times out; log for visibility.
    console.error("[documents] vector cleanup failed:", err);
  }

  if (fs.existsSync(doc.filePath)) {
    fs.unlinkSync(doc.filePath);
  }

  await doc.deleteOne();
  return res.json({ success: true });
}

export async function reprocessPdf(req: Request, res: Response) {
  const doc = await KnowledgeDocument.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, message: "Document not found" });
  }

  if (!fs.existsSync(doc.filePath)) {
    return res.status(400).json({ success: false, message: "Original file missing on disk" });
  }

  doc.processingStatus = "pending";
  doc.errorMessage = undefined;
  await doc.save();

  processDocumentAsync(doc.id, doc.filePath, doc.originalName, doc.vectorCollectionId);

  return res.json({ success: true, message: "Reprocessing started", document: doc });
}

export async function dashboardStats(_req: Request, res: Response) {
  const totalPdfs = await KnowledgeDocument.countDocuments();
  const recentDocuments = await KnowledgeDocument.find().sort({ uploadDate: -1 }).limit(5);

  // Chat stats are computed in chat.controller's collection but we query here for the single
  // dashboard endpoint requested by the spec.
  const { Chat } = await import("../models/Chat");
  const totalQuestions = await Chat.countDocuments();
  const sessionIds = await Chat.distinct("sessionId");

  return res.json({
    success: true,
    stats: {
      totalPdfs,
      totalChatSessions: sessionIds.length,
      totalQuestionsAsked: totalQuestions,
      recentDocuments,
    },
  });
}
