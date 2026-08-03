import { Router } from "express";
import { askQuestion, chatHistory } from "../controllers/chat.controller";

const router = Router();

// Public — no authentication required, per spec (Module 2).
router.post("/ask", askQuestion);
router.get("/history/:sessionId", chatHistory);

export default router;
