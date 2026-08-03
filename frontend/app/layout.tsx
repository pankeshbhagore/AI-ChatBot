import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knowledge Base AI Chatbot",
  description: "RAG-powered chatbot over your uploaded PDF knowledge base",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
