import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { env } from "./config/env";
import { initRedisSubscriptions } from "./redis/pubsub";
import { User } from "./models/User";

import authRoutes from "./routes/auth.routes";
import documentsRoutes from "./routes/documents.routes";
import chatRoutes from "./routes/chat.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/chat", chatRoutes);

// Central error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal server error" });
});

async function seedAdmin() {
  const existing = await User.findOne({ email: env.adminEmail.toLowerCase() });
  if (!existing) {
    const hash = await bcrypt.hash(env.adminPassword, 10);
    await User.create({ email: env.adminEmail.toLowerCase(), password: hash, role: "admin" });
    console.log(`[seed] Created default admin user: ${env.adminEmail}`);
  }
}

async function connectWithRetry(uri: string, retries = 5, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log("[mongo] Connected");
      return;
    } catch (err) {
      console.warn(`[mongo] Connection attempt ${attempt}/${retries} failed. Retrying in ${delayMs / 1000}s...`);
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2; // exponential backoff
    }
  }
}

async function bootstrap() {
  await connectWithRetry(env.mongoUri);

  initRedisSubscriptions();

  await seedAdmin();

  app.listen(env.port, () => {
    console.log(`[server] Backend listening on port ${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
