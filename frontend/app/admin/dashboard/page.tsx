"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { FileText, MessageSquare, HelpCircle, Activity } from "lucide-react";

interface Stats {
  totalPdfs: number;
  totalChatSessions: number;
  totalQuestionsAsked: number;
  recentDocuments: Array<{
    _id: string;
    originalName: string;
    uploadDate: string;
    processingStatus: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/documents/dashboard")
      .then((data) => setStats(data.stats))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground mt-2">Metrics and recent activity across your knowledge base.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 animate-fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="glass-card relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total PDFs</CardTitle>
            <div className="rounded-xl bg-violet-500/20 p-2.5 text-violet-400">
              <FileText className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight text-white">{stats?.totalPdfs ?? "—"}</div>
          </CardContent>
        </Card>

        <Card className="glass-card relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chat Sessions</CardTitle>
            <div className="rounded-xl bg-blue-500/20 p-2.5 text-blue-400">
              <MessageSquare className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight text-white">{stats?.totalChatSessions ?? "—"}</div>
          </CardContent>
        </Card>

        <Card className="glass-card relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Questions Asked</CardTitle>
            <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-400">
              <HelpCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight text-white">{stats?.totalQuestionsAsked ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Recently Uploaded Documents</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {stats?.recentDocuments?.length ? (
              stats.recentDocuments.map((doc, i) => (
                <div 
                  key={doc._id} 
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04] animate-slide-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-white/90">{doc.originalName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(doc.uploadDate).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={doc.processingStatus} />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <FileText className="mb-4 h-10 w-10 opacity-20" />
                <p>No documents uploaded yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "processed" ? "success" : status === "failed" ? "destructive" : status === "processing" ? "warning" : "secondary";
  return <Badge variant={variant as any} className="capitalize">{status}</Badge>;
}
