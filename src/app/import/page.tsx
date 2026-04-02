"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useLists } from "@/hooks/useLists";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import Papa from "papaparse";
import { EnrichedRecommendation } from "@/lib/types";

export default function ImportPage() {
  const { user } = useSession();
  const router = useRouter();
  const { createList } = useLists();

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = (fileToProcess: File) => {
    if (!fileToProcess.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file.");
      return;
    }
    setFile(fileToProcess);
    setError(null);
    setSuccess(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          
          // Map standard CSV fields (Trakt, SIMKL, or custom) to Craveo items
          const items: EnrichedRecommendation[] = rows.map((row) => ({
            title: row.Title || row.title || row.Name || row.name || "Unknown Title",
            year: Number(row.Year || row.year) || 0,
            type: (row.Type || row.type || "movie").toLowerCase().includes("movie") 
                  ? "movie" : "tv",
            creator: row.Creator || row.Director || row.Author || "Unknown",
            description: row.Description || row.Overview || "Imported item.",
            genres: row.Genres ? row.Genres.split(",") : ["Imported"],
            posterUrl: row.Poster || row.Image || null,
            rating: null,
            ratingSource: null,
            runtime: null,
            externalId: null,
          }));

          if (items.length === 0) {
            throw new Error("No readable records found in the CSV.");
          }

          const listName = `Imported: ${file.name.replace(".csv", "")}`;
          const listDescription = `Imported ${items.length} items from CSV on ${new Date().toLocaleDateString()}`;

          await createList(listName, listDescription, items, { isPublic: false });

          setSuccess(`Successfully imported ${items.length} items into a new Cravelist!`);
          setTimeout(() => {
            router.push("/profile");
          }, 2000);
        } catch (err: any) {
          setError(err.message || "Failed to process importing items.");
        } finally {
          setIsProcessing(false);
        }
      },
      error: (err) => {
        setError(`CSV Parser Error: ${err.message}`);
        setIsProcessing(false);
      },
    });
  };

  if (!user) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center p-8 liquid-glass rounded-2xl">
          <UploadCloud className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Sign in Required</h2>
          <p className="text-zinc-400">You must be signed in to import lists.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full pt-20 md:pt-8 rounded-3xl pwa-safe-area-main min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Import Cravelists</h1>
        <p className="text-zinc-400 text-sm md:text-base">
          Bring your existing watchlists from SIMKL, Trakt, or custom CSVs into Craveo.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div
            className={`relative group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-3xl transition-all ${
              isDragging
                ? "border-purple-500 bg-purple-500/10 scale-[1.02]"
                : "border-white/20 bg-white/5 hover:bg-white/10"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="flex flex-col items-center justify-center text-center p-6 pointer-events-none">
              <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${isDragging ? "text-purple-400" : "text-white/40 group-hover:text-white/60"}`} />
              <p className="text-lg font-semibold text-white mb-1">
                Drag & drop your CSV file here
              </p>
              <p className="text-sm text-zinc-400">
                or click to browse from your device
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 animate-slide-up">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 animate-slide-up">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{success}</div>
            </div>
          )}

          {file && !error && !success && (
            <div className="flex flex-col gap-4 p-5 rounded-2xl liquid-glass border border-white/10 animate-slide-up">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import Now"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="liquid-glass rounded-2xl p-5 border border-white/10">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> Supported Columns
            </h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>• <span className="text-zinc-200">Title / Name</span> (Required)</li>
              <li>• <span className="text-zinc-200">Year</span></li>
              <li>• <span className="text-zinc-200">Type</span> (movie, tv, book, etc.)</li>
              <li>• <span className="text-zinc-200">Creator / Director</span></li>
              <li>• <span className="text-zinc-200">Description / Overview</span></li>
            </ul>
            <div className="mt-4 pt-4 border-t border-white/5 text-xs text-zinc-500 leading-relaxed">
              We try our best to automatically map fields from standard SIMKL and Trakt CSV exports.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
