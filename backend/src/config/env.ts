import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

export const env = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: required("MONGO_URI", "mongodb://localhost:27017/kb_chatbot"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  jwtSecret: required("JWT_SECRET", "dev_secret_change_me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@12345",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  channels: {
    pdfRequest: process.env.CHANNEL_PDF_REQUEST || "pdf_process_requests",
    pdfResponse: process.env.CHANNEL_PDF_RESPONSE || "pdf_process_responses",
    questionRequest: process.env.CHANNEL_QUESTION_REQUEST || "question_requests",
    questionResponse: process.env.CHANNEL_QUESTION_RESPONSE || "question_responses",
  },
  redisResponseTimeoutMs: parseInt(process.env.REDIS_RESPONSE_TIMEOUT_MS || "60000", 10),
};
