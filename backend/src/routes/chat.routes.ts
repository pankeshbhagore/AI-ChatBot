import { Router } from "express";
import { askQuestion, chatHistory, listSessions } from "../controllers/chat.controller";
import { chatLimiter } from "../middleware/rateLimiter";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Public — no authentication required, per spec (Module 2).
router.post("/ask", chatLimiter, askQuestion);
router.get("/history/:sessionId", chatHistory);

// Admin only
router.get("/sessions", requireAuth, listSessions);

export default router;
