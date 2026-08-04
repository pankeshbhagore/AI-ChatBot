"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, LogOut, ExternalLink, Sparkles, Menu, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const sidebarContent = (
    <>
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/20">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <span className="bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-xl font-bold text-transparent">
          KB Admin
        </span>
        {/* Close button — visible only on mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto md:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                active
                  ? "bg-black/5 dark:bg-white/10 text-foreground shadow-sm border border-black/5 dark:border-white/10"
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 transition-colors ${active ? "text-violet-500 dark:text-violet-400" : "group-hover:text-violet-500 dark:group-hover:text-violet-400"}`} />
              {item.label}
              {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 mt-auto pt-6 border-t border-black/5 dark:border-white/5">
        <div className="px-2 mb-4">
          <ThemeToggle />
        </div>
        <Link
          href="/"
          onClick={() => setSidebarOpen(false)}
          className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
        >
          <div className="flex h-5 w-5 items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          Home
        </Link>
        <Link
          href="/chat"
          onClick={() => setSidebarOpen(false)}
          className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
        >
          <ExternalLink className="h-5 w-5 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
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
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible; mobile: slide-over drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 glass-sidebar flex flex-col p-6 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      <main className="flex-1 relative z-10 min-h-screen overflow-y-auto">
        {/* Mobile top bar with hamburger */}
        <div className="sticky top-0 z-20 flex items-center gap-3 p-4 md:hidden bg-background/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-lg font-bold text-transparent">
            KB Admin
          </span>
        </div>

        {/* Subtle background radial gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/10 via-background to-background" />
        <div className="relative p-6 md:p-10 max-w-6xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
