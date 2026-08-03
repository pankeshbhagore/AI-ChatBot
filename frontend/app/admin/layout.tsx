"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, LogOut, ExternalLink, Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    document.cookie = "token=; path=/; max-age=0";
    router.push("/admin/login");
  }

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/knowledge-base", label: "Knowledge Base", icon: FileText },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-72 shrink-0 glass-sidebar flex flex-col p-6 z-20">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-xl font-bold text-transparent">
            KB Admin
          </span>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  active 
                    ? "bg-white/10 text-white shadow-sm border border-white/10" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`h-5 w-5 transition-colors ${active ? "text-violet-400" : "group-hover:text-violet-400"}`} />
                {item.label}
                {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 mt-auto pt-6 border-t border-white/5">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-white/5 hover:text-white"
          >
            <div className="flex h-5 w-5 items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-indigo-400 transition-colors"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            Home
          </Link>
          <Link
            href="/chat"
            className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-white/5 hover:text-white"
          >
            <ExternalLink className="h-5 w-5 group-hover:text-blue-400 transition-colors" />
            Public Chat
          </Link>
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5 group-hover:text-destructive transition-colors" />
            Logout
          </button>
        </div>
      </aside>
      
      <main className="flex-1 relative z-10 h-screen overflow-y-auto">
        {/* Subtle background radial gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/10 via-background to-background" />
        <div className="relative p-10 max-w-6xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
