import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User";
import { signToken } from "../middleware/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Invalid credentials payload" });
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const token = signToken({ id: user._id, email: user.email, role: user.role });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.json({
    success: true,
    token,
    user: { id: user._id, email: user.email, role: user.role },
  });
}

export async function me(req: Request, res: Response) {
  // req.user is populated by requireAuth middleware
  return res.json({ success: true, user: (req as any).user });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("token");
  return res.json({ success: true });
}
