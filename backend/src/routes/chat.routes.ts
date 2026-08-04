import { Router } from "express";
import { askQuestion, chatHistory } from "../controllers/chat.controller";
import { chatLimiter } from "../middleware/rateLimiter";

const router = Router();

// Public — no authentication required, per spec (Module 2).
router.post("/ask", chatLimiter, askQuestion);
router.get("/history/:sessionId", chatHistory);

export default router;
