"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileAudio,
  Download,
  Share2,
  Check,
  Clock,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/converter/audio-player";
import { formatBytes, formatDuration } from "@/lib/utils";
import { getFormatConfig } from "@/lib/constants";
import { OutputFormat } from "@/types/conversion";

interface SharedData {
  id: string;
  filename: string;
  sizeBytes: number;
  durationSec: number;
  format: OutputFormat;
  bitrateKbps: number;
  title: string;
  artist?: string;
  album?: string;
  expiresAt: string;
  previewUrl: string;
  downloadUrl: string;
}

export default function SharePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<SharedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || "This shared audio file is not available.");
        }
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [params.token]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-28 flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-neutral-400">Loading shared audio track...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-lg text-center space-y-6">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-red-950/40 border border-red-500/30 text-red-400 shadow-xl">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Audio Link Unavailable</h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            {error || "This audio file has expired or the link is invalid in accordance with our storage retention policy."}
          </p>
        </div>
        <div className="pt-2">
          <Button asChild variant="gradient" size="default">
            <Link href="/" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Convert Your Own Video</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const formatConfig = getFormatConfig(data.format);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-2xl space-y-6">
      {/* Header link back to app */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-neutral-400 hover:text-white">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Converter</span>
          </Link>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="gap-1.5 h-8 text-xs border-neutral-800 text-neutral-300 hover:text-white"
        >
          {isCopied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400 font-medium">Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" />
              <span>Copy Share Link</span>
            </>
          )}
        </Button>
      </div>

      {/* Main Track Presentation Card */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 border border-blue-500/30 text-blue-400 shadow-lg">
            <FileAudio className="h-7 w-7" />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono border-blue-500/40 text-blue-400">
                {formatConfig.label}
              </Badge>
              {data.bitrateKbps && (
                <span className="text-[10px] font-mono text-neutral-400">
                  {data.bitrateKbps} kbps
                </span>
              )}
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white truncate">
              {data.title || data.filename}
            </h1>

            {data.artist && (
              <p className="text-xs text-neutral-500 dark:text-slate-400">
                Artist: <span className="text-neutral-300 font-medium">{data.artist}</span>
                {data.album && ` · Album: ${data.album}`}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-neutral-400 pt-1 font-mono">
              <span>{formatBytes(data.sizeBytes)}</span>
              <span>·</span>
              <span>{formatDuration(data.durationSec)}</span>
            </div>
          </div>
        </div>

        {/* Real Audio Waveform Player */}
        <div className="pt-2">
          <AudioPlayer
            src={data.previewUrl}
            duration={data.durationSec}
            title={data.title || data.filename}
          />
        </div>

        {/* Download Button */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <Clock className="h-3.5 w-3.5 text-neutral-400" />
            <span>
              Expires {new Date(data.expiresAt).toLocaleDateString()} at {new Date(data.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <Button
            asChild
            variant="gradient"
            size="lg"
            className="w-full sm:w-auto h-11 px-8 rounded-xl font-semibold gap-2 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-600 text-white shadow-lg shadow-blue-950/60 transition-all"
          >
            <a href={data.downloadUrl} download={data.filename}>
              <Download className="h-4 w-4" />
              <span>Download {formatConfig.label}</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Convert Video CTA */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-black/60 p-5 text-center space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Need to convert an MP4 video of your own?
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
          Extract high-fidelity MP3, WAV, FLAC, and AAC audio with built-in 5-band equalizer, loudness normalization, and trimming.
        </p>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-neutral-700">
          <Link href="/">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>Open Free Converter</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
