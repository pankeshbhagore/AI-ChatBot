import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { upload } from "../middleware/upload";
import {
  uploadPdf,
  listPdfs,
  deletePdf,
  reprocessPdf,
  dashboardStats,
} from "../controllers/documents.controller";

const router = Router();

router.use(requireAuth); // all knowledge-base management routes require admin auth

router.get("/dashboard", dashboardStats);
router.post("/upload", upload.single("file"), uploadPdf);
router.get("/", listPdfs);
router.delete("/:id", deletePdf);
router.post("/:id/reprocess", reprocessPdf);

export default router;
