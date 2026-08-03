import Link from "next/link";
import { Sparkles, Shield, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="animate-fade-in mx-auto w-full max-w-3xl text-center">
        <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-2xl shadow-violet-500/20">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Knowledge Base <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Assistant</span>
        </h1>
        
        <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
          Your intelligent RAG-powered chatbot. Ask questions and get precise answers derived directly from your uploaded PDF documents.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Public Chat Card */}
          <Link href="/chat" className="group relative overflow-hidden rounded-3xl bg-white/[0.03] p-8 border border-white/[0.05] backdrop-blur-xl transition-all hover:bg-white/[0.05] hover:border-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl transition-all group-hover:bg-violet-500/20"></div>
            <div className="relative z-10 flex flex-col items-start text-left">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-foreground">Public Chat</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Ask the AI assistant questions about the knowledge base. No login required.
              </p>
              <div className="mt-auto flex items-center text-sm font-semibold text-violet-400 group-hover:text-violet-300">
                Start Chatting <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Admin Login Card */}
          <Link href="/admin/login" className="group relative overflow-hidden rounded-3xl bg-white/[0.03] p-8 border border-white/[0.05] backdrop-blur-xl transition-all hover:bg-white/[0.05] hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl transition-all group-hover:bg-indigo-500/20"></div>
            <div className="relative z-10 flex flex-col items-start text-left">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-foreground">Admin Portal</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Manage the knowledge base, upload PDFs, and view usage analytics.
              </p>
              <div className="mt-auto flex items-center text-sm font-semibold text-indigo-400 group-hover:text-indigo-300">
                Login as Admin <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
