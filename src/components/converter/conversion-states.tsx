"use client";

import React from "react";
import {
  UploadCloud,
  Clock,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileAudio,
  Download,
  RotateCcw,
  PlusCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/converter/audio-player";
import { formatBytes, formatDuration } from "@/lib/utils";
import { ConversionJob } from "@/types/conversion";

interface StateProps {
  job: ConversionJob;
  onCancel?: () => void;
  onRetry?: () => void;
  onReset?: () => void;
}

/** 1. Uploading State Component */
export function UploadingState({ job, onCancel }: StateProps) {
  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 animate-pulse">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Uploading video…
            </h4>
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              {job.originalFilename} • {formatBytes(job.fileSize)}
            </p>
          </div>
        </div>
        <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
          {job.progress}%
        </span>
      </div>

      <Progress value={job.progress} />

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-neutral-500 dark:text-slate-400">
          {job.statusMessage || "Transferring media to secure conversion buffer..."}
        </p>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs text-neutral-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 h-8"
          >
            Cancel Upload
          </Button>
        )}
      </div>
    </div>
  );
}

/** 2. Queued State Component */
export function QueuedState({ job, onCancel }: StateProps) {
  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 animate-bounce">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Waiting in queue…
            </h4>
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              Job reference: <span className="font-mono text-neutral-700 dark:text-slate-300">{job.id.slice(0, 8)}</span>
            </p>
          </div>
        </div>
        <Badge variant="gradient">In Queue</Badge>
      </div>

      <div className="rounded-xl bg-neutral-100 dark:bg-slate-900/60 border border-neutral-200 dark:border-slate-800 p-3.5 text-xs text-neutral-700 dark:text-slate-300 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
        <p>
          Your video is scheduled for processing. An FFmpeg worker will allocate resources and extract the audio stream shortly.
        </p>
      </div>

      <div className="flex items-center justify-end pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs text-neutral-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 h-8"
          >
            Cancel Task
          </Button>
        )}
      </div>
    </div>
  );
}

/** 3. Processing State Component */
export function ProcessingState({ job, onCancel }: StateProps) {
  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Cpu className="h-5 w-5 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Converting audio…
            </h4>
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              Extracting audio track at {job.bitrate} kbps
            </p>
          </div>
        </div>
        <span className="text-sm font-mono font-semibold text-indigo-600 dark:text-indigo-400">
          {job.progress}%
        </span>
      </div>

      <Progress value={job.progress} />

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-neutral-500 dark:text-slate-400">
          {job.statusMessage || "Encoding MP3 stream with FFmpeg..."}
        </p>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs text-neutral-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 h-8"
          >
            Cancel Conversion
          </Button>
        )}
      </div>
    </div>
  );
}

/** 4. Completed State Component */
export function CompletedState({ job, onReset }: StateProps) {
  const outputName =
    job.outputFilename ||
    `${job.originalFilename.replace(/\.[^/.]+$/, "")}.mp3`;

  const handleDownload = () => {
    if (job.downloadUrl) {
      const a = document.createElement("a");
      a.href = job.downloadUrl;
      a.download = outputName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert("Demo completed state: In Phase 2, this triggers the authorized download stream.");
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Success Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-neutral-900 dark:text-white">
                Conversion Complete!
              </h4>
              <Badge variant="success">MP3 Ready</Badge>
            </div>
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              Audio stream successfully extracted and encoded
            </p>
          </div>
        </div>

        {onReset && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-8 gap-1.5 text-xs text-neutral-700 dark:text-slate-300 self-start sm:self-auto"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Convert another file</span>
          </Button>
        )}
      </div>

      {/* Output Details Box */}
      <div className="rounded-xl bg-neutral-100/80 dark:bg-slate-900/60 border border-neutral-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileAudio className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span
              className="text-sm font-medium text-neutral-900 dark:text-white truncate max-w-[200px] sm:max-w-xs"
              title={outputName}
            >
              {outputName}
            </span>
          </div>
          <span className="text-xs font-mono text-neutral-600 dark:text-slate-400">
            {job.bitrate} kbps
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-neutral-200 dark:border-slate-800/80 text-xs text-neutral-600 dark:text-slate-400">
          <div>
            <span className="text-neutral-500 dark:text-slate-500 block text-[10px] uppercase">Format</span>
            <span className="text-neutral-900 dark:text-white font-medium">MP3 (audio/mpeg)</span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-slate-500 block text-[10px] uppercase">Est. Size</span>
            <span className="text-neutral-900 dark:text-white font-medium">
              {formatBytes(Math.round(job.fileSize * 0.15))}
            </span>
          </div>
          {job.duration && job.duration > 0 ? (
            <div>
              <span className="text-neutral-500 dark:text-slate-500 block text-[10px] uppercase">Duration</span>
              <span className="text-neutral-900 dark:text-white font-medium">{formatDuration(job.duration)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Audio Player Preview */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-700 dark:text-slate-300">
          Audio Preview
        </label>
        <AudioPlayer src={job.audioUrl} duration={job.duration || 120} />
      </div>

      {/* Download Action Button */}
      <div className="pt-2">
        <Button
          type="button"
          variant="gradient"
          size="lg"
          onClick={handleDownload}
          className="w-full h-12 rounded-xl text-base font-semibold gap-2.5 shadow-xl shadow-blue-950/40 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-600 text-white"
        >
          <Download className="h-5 w-5 text-white" />
          <span>Download MP3</span>
        </Button>
        <p className="text-center text-[11px] text-neutral-500 pt-2">
          File available for download for 24 hours per privacy retention policy.
        </p>
      </div>
    </div>
  );
}

/** 5. Failed State Component */
export function FailedState({ job, onRetry, onReset }: StateProps) {
  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-base font-semibold text-neutral-900 dark:text-white">
            Conversion Failed
          </h4>
          <p className="text-xs text-neutral-500 dark:text-slate-400">
            {job.originalFilename}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-600 dark:text-rose-300 space-y-1">
        <p className="font-semibold text-rose-700 dark:text-rose-200">What went wrong?</p>
        <p>
          {job.error ||
            "The conversion worker encountered an error while demuxing or encoding the audio stream. Please check that the MP4 has a valid audio stream."}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        {onRetry && (
          <Button
            type="button"
            variant="gradient"
            size="default"
            onClick={onRetry}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
        )}
        {onReset && (
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onReset}
            className="w-full sm:w-auto gap-2 text-neutral-700 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Choose another file</span>
          </Button>
        )}
      </div>
    </div>
  );
}

/** 6. Cancelled State Component */
export function CancelledState({ job, onReset }: StateProps) {
  return (
    <div className="space-y-5 py-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 border border-neutral-300 dark:border-slate-700">
        <XCircle className="h-6 w-6" />
      </div>

      <div className="space-y-1">
        <h4 className="text-base font-semibold text-neutral-900 dark:text-white">Conversion Cancelled</h4>
        <p className="text-xs text-neutral-500 dark:text-slate-400 max-w-sm mx-auto">
          The conversion job was cancelled at your request. All temporary files have been discarded.
        </p>
      </div>

      {onReset && (
        <div className="pt-2">
          <Button
            type="button"
            variant="gradient"
            size="default"
            onClick={onReset}
            className="gap-2 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Convert another file</span>
          </Button>
        </div>
      )}
    </div>
  );
}

/** 7. Expired State Component */
export function ExpiredState({ onReset }: { onReset?: () => void }) {
  return (
    <div className="space-y-5 py-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
        <Clock className="h-6 w-6" />
      </div>

      <div className="space-y-1">
        <h4 className="text-base font-semibold text-neutral-900 dark:text-white">File Has Expired</h4>
        <p className="text-xs text-neutral-500 dark:text-slate-400 max-w-sm mx-auto">
          In accordance with our 24-hour privacy retention policy, temporary source and output files are automatically purged from storage.
        </p>
      </div>

      {onReset && (
        <div className="pt-2">
          <Button
            type="button"
            variant="gradient"
            size="default"
            onClick={onReset}
            className="gap-2 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Start a new conversion</span>
          </Button>
        </div>
      )}
    </div>
  );
}
