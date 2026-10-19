"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  PlusCircle,
  FileAudio,
  Download,
  Trash2,
  Clock,
  Loader2,
  Info,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDuration } from "@/lib/utils";
import { JobStatus } from "@/types/conversion";

interface ConversionItem {
  id: string;
  originalFilename: string;
  outputFilename: string;
  size: number;
  duration: number;
  bitrate: number;
  status: JobStatus;
  createdAt: string;
  downloadUrl?: string;
  previewUrl?: string;
}

export default function ConversionsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [rows, setRows] = useState<ConversionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState<boolean>(false);

  const fetchConversions = async () => {
    try {
      const res = await fetch("/api/conversions");
      if (res.ok) {
        const data = await res.json();
        setRows(data.conversions || []);
      }
    } catch (err) {
      console.error("Failed to fetch conversions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchConversions();
    fetchUser();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/conversions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to delete conversion:", err);
    }
  };

  const toggleSelectAll = (itemsToSelect: ConversionItem[]) => {
    if (itemsToSelect.length === 0) return;
    const allSelected = itemsToSelect.every((r) => selectedIds.has(r.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        itemsToSelect.forEach((r) => next.delete(r.id));
      } else {
        itemsToSelect.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDownload = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkDownloading(true);
    try {
      const res = await fetch("/api/conversions/batch/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: ids }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error?.message || "Failed to download selected conversions");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversions_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Bulk download error:", err);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${ids.length} conversion(s)?`)) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch("/api/conversions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: ids }),
      });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const filteredRows = rows.filter((r) => {
    const matchesSearch =
      r.originalFilename.toLowerCase().includes(search.toLowerCase()) ||
      r.outputFilename.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "all" ? true : r.status === filter;
    return matchesSearch && matchesFilter;
  });

  const selectedCompletedCount = filteredRows.filter(
    (r) => selectedIds.has(r.id) && r.status === "completed"
  ).length;

  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id));

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "processing":
        return <Badge variant="info">Processing</Badge>;
      case "queued":
        return <Badge variant="gradient">Queued</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            My Conversions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {currentUser
              ? `Signed in as ${currentUser.name} (${currentUser.email}). History is saved to your account.`
              : "Manage your recent audio conversions and downloads."}
          </p>
        </div>

        <Button asChild variant="gradient" size="default" className="gap-2">
          <Link href="/#converter">
            <PlusCircle className="h-4 w-4" />
            <span>New Conversion</span>
          </Link>
        </Button>
      </div>

      {/* Guest vs User notice */}
      {!currentUser && (
        <div className="rounded-xl border border-slate-800 bg-[#0d1322]/80 p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-white">Guest Session Mode:</span>
              <p className="text-slate-400">
                Conversions in your current session are stored for 24 hours. Sign in or register to sync your conversions across devices.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild variant="gradient" size="sm" className="h-7 text-xs">
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-800 bg-[#0d1424] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {["all", "completed", "processing", "queued", "failed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all capitalize ${
                filter === f
                  ? "bg-purple-600 text-white shadow-sm shadow-purple-900/40"
                  : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Conversions List */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 overflow-hidden shadow-xl mb-16">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <p className="text-sm text-slate-400">Loading your conversions...</p>
          </div>
        ) : filteredRows.length > 0 ? (
          <div>
            {/* List Selection Header Bar */}
            <div className="px-4 sm:px-5 py-2.5 bg-slate-900/60 border-b border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-2.5 cursor-pointer select-none hover:text-white">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={() => toggleSelectAll(filteredRows)}
                  className="rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                />
                <span>Select All ({filteredRows.length})</span>
              </label>

              {selectedIds.size > 0 && (
                <span className="text-purple-400 font-medium">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-800/70">
              {filteredRows.map((row) => (
                <div
                  key={row.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                    selectedIds.has(row.id) ? "bg-purple-950/20" : "hover:bg-slate-800/20"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelectOne(row.id)}
                      className="rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500 h-4 w-4 flex-shrink-0 cursor-pointer"
                      aria-label={`Select ${row.outputFilename}`}
                    />

                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-950/40 border border-purple-500/20 text-purple-400">
                      <FileAudio className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p
                        className="font-medium text-white text-sm truncate max-w-xs sm:max-w-md"
                        title={row.outputFilename}
                      >
                        {row.outputFilename}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
                        <span>{formatBytes(row.size)}</span>
                        {row.duration > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(row.duration)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="font-mono">{row.bitrate} kbps</span>
                        <span>•</span>
                        <span className="text-slate-500">
                          {new Date(row.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {getStatusBadge(row.status)}

                    <div className="flex items-center gap-1.5">
                      {row.status === "completed" && row.downloadUrl && (
                        <Button
                          asChild
                          variant="gradient"
                          size="sm"
                          className="h-8 gap-1.5 text-xs font-semibold"
                        >
                          <a href={row.downloadUrl} download={row.outputFilename}>
                            <Download className="h-3.5 w-3.5" />
                            <span>Download</span>
                          </a>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(row.id)}
                        className="h-8 w-8 text-slate-400 hover:text-rose-400"
                        aria-label={`Delete ${row.outputFilename}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-slate-500">
              <Clock className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-white">
              {search ? "No conversions match your search" : "No conversions yet"}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search
                ? "Try searching for a different keyword or resetting your filter."
                : "Select an MP4 video from the converter to extract and download high-quality MP3 audio."}
            </p>
            {!search && (
              <Button asChild variant="gradient" size="sm" className="mt-2">
                <Link href="/#converter">Convert a Video</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Dock */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 px-4 py-3 rounded-2xl bg-[#0b101b]/95 border border-purple-500/30 shadow-2xl backdrop-blur-md">
          <span className="text-xs font-semibold text-white px-1 sm:px-2 whitespace-nowrap">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <Button
            variant="gradient"
            size="sm"
            onClick={handleBulkDownload}
            disabled={isBulkDownloading || selectedCompletedCount === 0}
            className="h-8 gap-1.5 text-xs font-medium"
            title={selectedCompletedCount === 0 ? "No completed items in selection" : "Download selected as ZIP"}
          >
            {isBulkDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
            <span>ZIP ({selectedCompletedCount})</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            {isBulkDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>Delete</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="h-8 text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
