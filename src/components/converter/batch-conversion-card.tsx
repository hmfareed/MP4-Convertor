"use client";

import React, { useState } from "react";
import {
  Archive,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  FileAudio,
  HardDrive,
  RefreshCw,
  XCircle,
  Play,
  Pause,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatDuration } from "@/lib/utils";
import { ConversionJob } from "@/types/conversion";

interface BatchConversionCardProps {
  batchId: string;
  jobs: ConversionJob[];
  overallProgress: number;
  onReset: () => void;
  onCancelAll?: () => void;
}

export function BatchConversionCard({
  batchId,
  jobs,
  overallProgress,
  onReset,
  onCancelAll,
}: BatchConversionCardProps) {
  const [playingJobId, setPlayingJobId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const totalCount = jobs.length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const failedCount = jobs.filter((j) => j.status === "failed" || j.status === "cancelled").length;
  const activeCount = totalCount - (completedCount + failedCount);
  const isFinished = activeCount === 0;

  const zipDownloadUrl = `/api/conversions/batch/${batchId}/download`;

  const handlePlayAudio = (job: ConversionJob) => {
    if (!job.audioUrl) return;

    if (playingJobId === job.id) {
      audioElement?.pause();
      setPlayingJobId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(job.audioUrl);
    audio.play();
    audio.onended = () => setPlayingJobId(null);
    audio.onerror = () => setPlayingJobId(null);

    setAudioElement(audio);
    setPlayingJobId(job.id);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Main Progress & Action Panel */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5 sm:p-6 shadow-xl space-y-5">
        {/* Header: Batch Title + Global Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                  Batch Conversion
                </h3>
                <Badge
                  variant={isFinished ? (failedCount === 0 ? "success" : "warning") : "info"}
                  className="text-[10px] px-2 py-0.5 capitalize font-semibold"
                >
                  {isFinished ? "Batch Ready" : "In Progress"}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {isFinished
                  ? `Completed ${completedCount} of ${totalCount} audio files`
                  : `Processing ${activeCount} of ${totalCount} files • ${overallProgress}% overall`}
              </p>
            </div>
          </div>

          {/* Quick Global Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Download All as ZIP button */}
            <Button
              asChild={completedCount > 0}
              variant="gradient"
              size="sm"
              disabled={completedCount === 0}
              className={`h-9 px-4 rounded-xl gap-2 text-xs font-semibold shadow-lg transition-all ${
                completedCount > 0
                  ? "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-600 text-white shadow-blue-950/60 active:scale-[0.98]"
                  : "opacity-50 cursor-not-allowed bg-neutral-800 text-neutral-400"
              }`}
            >
              {completedCount > 0 ? (
                <a href={zipDownloadUrl} download={`converted-audio-${batchId.slice(0, 8)}.zip`}>
                  <Archive className="h-4 w-4" />
                  <span>Download All as ZIP ({completedCount})</span>
                </a>
              ) : (
                <span className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  <span>Download ZIP (Waiting...)</span>
                </span>
              )}
            </Button>

            {/* Cancel or New Batch button */}
            {!isFinished && onCancelAll ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancelAll}
                className="h-9 px-3 text-xs border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-rose-500 hover:border-rose-500/40"
              >
                <XCircle className="h-3.5 w-3.5 mr-1 text-neutral-400" />
                <span>Cancel All</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReset}
                className="h-9 px-3 text-xs border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-white hover:bg-neutral-900"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                <span>New Conversion</span>
              </Button>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-neutral-600 dark:text-neutral-400">
              {isFinished ? "Conversion Pipeline Complete" : "Pipeline Processing"}
            </span>
            <span className="font-mono text-neutral-900 dark:text-white font-bold">
              {overallProgress}%
            </span>
          </div>

          <Progress value={overallProgress} className="h-2.5 rounded-full" />

          {/* Quick Metrics Pills */}
          <div className="flex items-center gap-3 pt-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>{completedCount} Completed</span>
            </span>
            {activeCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 dark:text-blue-400" />
                <span>{activeCount} In Flight</span>
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                <span>{failedCount} Failed</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Itemized List of Batch Files */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-4 sm:p-5 shadow-sm space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Converted Audio Files ({jobs.length})
        </h4>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
          {jobs.map((job, idx) => {
            const isCompleted = job.status === "completed";
            const isFailed = job.status === "failed" || job.status === "cancelled";
            const isProcessing = job.status === "processing";
            const isUploading = job.status === "uploading";
            const isQueued = job.status === "queued";
            const isPlaying = playingJobId === job.id;

            return (
              <div
                key={job.id || idx}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-950/40 px-2 rounded-xl transition-colors"
              >
                {/* Left: File icon + Metadata */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
                      isCompleted
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : isFailed
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    }`}
                  >
                    <FileAudio className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-white truncate max-w-xs sm:max-w-md">
                      {job.outputFilename || job.originalFilename}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3 text-neutral-400" />
                        {formatBytes(job.fileSize)}
                      </span>
                      {job.duration !== undefined && job.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-neutral-400" />
                          {formatDuration(job.duration)}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-neutral-400">
                        {job.bitrate}k MP3
                      </span>
                    </div>

                    {/* Progress Bar for active file */}
                    {(isProcessing || isUploading) && (
                      <div className="mt-1.5 w-full max-w-xs">
                        <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                          <span>{isUploading ? "Uploading" : "Encoding"}</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Status badge & Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Badge
                    variant={
                      isCompleted
                        ? "success"
                        : isFailed
                        ? "destructive"
                        : isProcessing
                        ? "info"
                        : "outline"
                    }
                    className="text-[10px] px-2 py-0.5 capitalize flex-shrink-0"
                  >
                    {isProcessing ? `${job.progress}%` : job.status}
                  </Badge>

                  {/* Play audio preview */}
                  {isCompleted && job.audioUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlayAudio(job)}
                      className="h-8 w-8 p-0 text-neutral-400 hover:text-white rounded-lg"
                      title={isPlaying ? "Pause preview" : "Play MP3 preview"}
                    >
                      {isPlaying ? (
                        <Pause className="h-3.5 w-3.5 text-blue-400" />
                      ) : (
                        <Play className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                    </Button>
                  )}

                  {/* Individual Download MP3 */}
                  {isCompleted && job.downloadUrl && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-white hover:bg-neutral-900 gap-1"
                    >
                      <a href={job.downloadUrl} download={job.outputFilename || "audio.mp3"}>
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">MP3</span>
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
