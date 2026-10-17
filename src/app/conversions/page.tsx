"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  PlusCircle,
  FileAudio,
  Download,
  Trash2,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";
import { JobStatus } from "@/types/conversion";

interface ConversionRow {
  id: string;
  originalFilename: string;
  outputFilename: string;
  size: number;
  duration: string;
  bitrate: number;
  status: JobStatus;
  date: string;
}

const initialRows: ConversionRow[] = [
  {
    id: "conv_89123",
    originalFilename: "quarterly_presentation_2026.mp4",
    outputFilename: "quarterly_presentation_2026.mp3",
    size: 14.8 * 1024 * 1024,
    duration: "18:42",
    bitrate: 192,
    status: "completed",
    date: "10 mins ago",
  },
  {
    id: "conv_89124",
    originalFilename: "podcast_interview_raw.mp4",
    outputFilename: "podcast_interview_raw.mp3",
    size: 48.2 * 1024 * 1024,
    duration: "45:10",
    bitrate: 320,
    status: "processing",
    date: "Just now",
  },
  {
    id: "conv_89125",
    originalFilename: "webinar_session_part1.mp4",
    outputFilename: "webinar_session_part1.mp3",
    size: 82.5 * 1024 * 1024,
    duration: "01:12:30",
    bitrate: 128,
    status: "failed",
    date: "1 hour ago",
  },
];

export default function ConversionsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [rows, setRows] = useState<ConversionRow[]>(initialRows);

  const filteredRows = rows.filter((r) => {
    const matchesSearch =
      r.originalFilename.toLowerCase().includes(search.toLowerCase()) ||
      r.outputFilename.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "all" ? true : r.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
  };

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
            Manage your recent audio conversions and downloads.
          </p>
        </div>

        <Button asChild variant="gradient" size="default" className="gap-2">
          <Link href="/#converter">
            <PlusCircle className="h-4 w-4" />
            <span>New Conversion</span>
          </Link>
        </Button>
      </div>

      {/* Guest Storage Notice */}
      <div className="rounded-xl border border-slate-800 bg-[#0d1322]/80 p-4 mb-6 flex items-start gap-3 text-xs text-slate-300">
        <Info className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-white">Guest Session Notice:</span>
          <p className="text-slate-400">
            Current conversions are temporarily stored in your browser session and expire after 24 hours. Sign-in for persistent MongoDB storage will be enabled in Phase 4.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        {/* Search Input */}
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

        {/* Filter Pills */}
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

      {/* Conversions List / Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 overflow-hidden shadow-xl">
        {filteredRows.length > 0 ? (
          <div className="divide-y divide-slate-800/70">
            {filteredRows.map((row) => (
              <div
                key={row.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors"
              >
                {/* File info */}
                <div className="flex items-center gap-3.5 min-w-0">
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
                      <span>•</span>
                      <span>{row.duration}</span>
                      <span>•</span>
                      <span className="font-mono">{row.bitrate} kbps</span>
                      <span>•</span>
                      <span className="text-slate-500">{row.date}</span>
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  {getStatusBadge(row.status)}

                  <div className="flex items-center gap-1.5">
                    {row.status === "completed" && (
                      <Button
                        variant="gradient"
                        size="sm"
                        className="h-8 gap-1.5 text-xs font-semibold"
                        onClick={() => alert(`Starting download for ${row.outputFilename}`)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </Button>
                    )}

                    {row.status === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-slate-300 hover:text-white"
                        onClick={() => alert(`Retrying conversion for ${row.originalFilename}`)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Retry</span>
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
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-slate-500">
              <Clock className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-white">
              {search
                ? "No conversions match your search"
                : "You haven't converted any videos yet"}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search
                ? "Try searching for a different keyword or resetting your filter."
                : "Select an MP4 video from the homepage converter to extract your first MP3 audio track."}
            </p>
            {!search && (
              <Button asChild variant="gradient" size="sm" className="mt-2">
                <Link href="/#converter">Convert a Video</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
