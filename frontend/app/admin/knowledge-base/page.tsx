"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { RefreshCw, Trash2, Upload, Search, FileText, Database } from "lucide-react";

interface KBDocument {
  _id: string;
  originalName: string;
  fileSize: number;
  uploadDate: string;
  processingStatus: "pending" | "processing" | "processed" | "failed";
  chunkCount: number;
  errorMessage?: string;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async (q = "") => {
    try {
      const data = await apiFetch(`/api/documents${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      setDocuments(data.documents);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    // Poll every 4s so "processing" -> "processed" status updates without manual refresh.
    const interval = setInterval(() => loadDocuments(search), 4000);
    return () => clearInterval(interval);
  }, [loadDocuments, search]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiFetch("/api/documents/upload", { method: "POST", body: formData });
      await loadDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this PDF and its vectors from the knowledge base?")) return;
    await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
    await loadDocuments(search);
  }

  async function handleReprocess(id: string) {
    await apiFetch(`/api/documents/${id}/reprocess`, { method: "POST" });
    await loadDocuments(search);
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-2">Manage your uploaded PDFs and vector embeddings.</p>
        </div>
        
        <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:from-violet-500 hover:to-indigo-500 has-[:disabled]:opacity-50 has-[:disabled]:pointer-events-none">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading..." : "Upload PDF"}
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 animate-fade-in">
          {error}
        </div>
      )}

      <Card className="glass-card">
        <CardHeader className="border-b border-black/5 dark:border-white/5 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-semibold">Document Library</CardTitle>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search PDFs..."
                className="pl-9 bg-black/5 border-black/10 dark:bg-white/5 dark:border-white/10 focus:border-primary/50"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  loadDocuments(e.target.value);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground border-b border-black/5 dark:border-white/5">
                <tr>
                  <th className="py-4 px-4 font-medium">Name</th>
                  <th className="py-4 px-4 font-medium">Size</th>
                  <th className="py-4 px-4 font-medium">Uploaded</th>
                  <th className="py-4 px-4 font-medium">Status</th>
                  <th className="py-4 px-4 font-medium">Chunks</th>
                  <th className="py-4 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {documents.map((doc, i) => (
                  <tr 
                    key={doc._id} 
                    className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors animate-slide-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary opacity-70" />
                        <span className="font-medium text-foreground">{doc.originalName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">{(doc.fileSize / 1024).toFixed(0)} KB</td>
                    <td className="py-4 px-4 text-muted-foreground">{new Date(doc.uploadDate).toLocaleDateString()}</td>
                    <td className="py-4 px-4">
                      <Badge
                        variant={
                          doc.processingStatus === "processed"
                            ? "success"
                            : doc.processingStatus === "failed"
                            ? "destructive"
                            : doc.processingStatus === "processing"
                            ? "warning"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {doc.processingStatus}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5 opacity-50" />
                        {doc.chunkCount}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 hover:text-primary transition-colors"
                          onClick={() => handleReprocess(doc._id)} 
                          title="Reprocess"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 bg-transparent border-black/10 dark:border-white/10 hover:bg-destructive/10 dark:hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30 transition-colors"
                          onClick={() => handleDelete(doc._id)} 
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="mb-4 h-10 w-10 opacity-20" />
                        <p>No PDFs uploaded yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
