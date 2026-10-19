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
  QrCode,
  Share2,
  Check,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/converter/audio-player";
import { formatBytes, formatDuration } from "@/lib/utils";
import { getFormatConfig } from "@/lib/constants";
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
  const [showQrModal, setShowQrModal] = React.useState(false);
  const [qrSvg, setQrSvg] = React.useState<string>("");
  const [isCopied, setIsCopied] = React.useState(false);

  const formatConfig = getFormatConfig(job.format || "mp3");
  const outputName =
    job.outputFilename ||
    `${job.originalFilename.replace(/\.[^/.]+$/, "")}${formatConfig.ext}`;
  const formatLabel = formatConfig.label;
  const isLossless = !!formatConfig.isLossless;

  const shareToken = job.shareToken || job.id;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${shareToken}`
      : `/share/${shareToken}`;

  React.useEffect(() => {
    if (showQrModal && shareUrl) {
      QRCode.toString(shareUrl, {
        type: "svg",
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then(setQrSvg)
        .catch(console.error);
    }
  }, [showQrModal, shareUrl]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    }
  };

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
              <Badge variant="success">{formatLabel} Ready</Badge>
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
            <FileAudio className="h-5 w-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
            <span
              className="text-sm font-medium text-neutral-900 dark:text-white truncate max-w-[200px] sm:max-w-xs"
              title={outputName}
            >
              {outputName}
            </span>
          </div>
          <span className="text-xs font-mono text-neutral-600 dark:text-slate-400">
            {isLossless ? "Lossless Master" : `${job.bitrate} kbps`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-neutral-200 dark:border-slate-800/80 text-xs text-neutral-600 dark:text-slate-400">
          <div>
            <span className="text-neutral-500 dark:text-slate-500 block text-[10px] uppercase">Format</span>
            <span className="text-neutral-900 dark:text-white font-medium">
              {formatLabel} ({formatConfig.mime})
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-slate-500 block text-[10px] uppercase">Est. Size</span>
            <span className="text-neutral-900 dark:text-white font-medium">
              {formatBytes(Math.round(job.fileSize * (isLossless ? 0.45 : 0.15)))}
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
        <AudioPlayer
          src={job.audioUrl}
          duration={job.duration || 120}
          title={outputName}
        />
      </div>

      {/* Download and Mobile QR Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
        <Button
          type="button"
          variant="gradient"
          size="lg"
          onClick={handleDownload}
          className="w-full sm:flex-1 h-12 rounded-xl text-base font-semibold gap-2.5 shadow-xl shadow-blue-950/40 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-600 text-white"
        >
          <Download className="h-5 w-5 text-white" />
          <span>Download {formatLabel}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setShowQrModal(true)}
          className="w-full sm:w-auto h-12 px-5 rounded-xl text-sm font-semibold gap-2 border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:text-white hover:bg-neutral-800"
          title="Scan QR Code to open & download on mobile"
        >
          <QrCode className="h-4 w-4 text-cyan-400" />
          <span>Mobile QR & Share</span>
        </Button>
      </div>

      <p className="text-center text-[11px] text-neutral-500 pt-1">
        File available for download for 24 hours per privacy retention policy.
      </p>

      {/* Mobile QR & Share Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-neutral-800 bg-[#0d1322] p-6 shadow-2xl space-y-5 text-center">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5 text-cyan-400" />
                <span>Mobile Instant Download</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Point your phone camera at this QR code to listen and download immediately without logging in.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-2xl shadow-xl w-48 h-48 flex items-center justify-center">
                {qrSvg ? (
                  <div
                    className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="animate-pulse text-xs text-neutral-400">Generating QR...</div>
                )}
              </div>
            </div>

            {/* Copy Link Row */}
            <div className="space-y-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="w-full h-9 text-xs gap-1.5 border-neutral-700 text-neutral-200 hover:text-white"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-green-400 font-semibold">Share Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    <span>Copy Shareable URL</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
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
