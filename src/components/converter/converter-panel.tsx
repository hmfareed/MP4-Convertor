"use client";

import React, { useState } from "react";
import { Dropzone } from "@/components/converter/dropzone";
import { ConversionSettings } from "@/components/converter/conversion-settings";
import {
  UploadingState,
  QueuedState,
  ProcessingState,
  CompletedState,
  FailedState,
  CancelledState,
  ExpiredState,
} from "@/components/converter/conversion-states";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle2, SlidersHorizontal, AlertCircle, Info } from "lucide-react";
import { DEFAULT_BITRATE, DEFAULT_FORMAT } from "@/lib/constants";
import {
  SelectedFileMetadata,
  ConversionSettings as IConversionSettings,
  ConversionJob,
  JobStatus,
} from "@/types/conversion";

export function ConverterPanel() {
  const [selectedFile, setSelectedFile] = useState<SelectedFileMetadata | null>(null);
  const [settings, setSettings] = useState<IConversionSettings>({
    format: DEFAULT_FORMAT,
    bitrate: DEFAULT_BITRATE,
  });
  const [showValidatedNotice, setShowValidatedNotice] = useState<boolean>(false);
  const [previewState, setPreviewState] = useState<JobStatus | null>(null);

  // Sample job data for state inspector / preview
  const demoJob: ConversionJob = {
    id: "job_demo_98412",
    originalFilename: selectedFile ? selectedFile.name : "presentation_recording.mp4",
    outputFilename: selectedFile
      ? `${selectedFile.name.replace(/\.[^/.]+$/, "")}.mp3`
      : "presentation_recording.mp3",
    fileSize: selectedFile ? selectedFile.size : 42 * 1024 * 1024,
    duration: selectedFile?.duration || 184,
    bitrate: settings.bitrate,
    format: settings.format,
    status: previewState || "completed",
    progress: previewState === "uploading" ? 42 : previewState === "processing" ? 76 : 100,
    statusMessage:
      previewState === "uploading"
        ? "Uploading video chunks (42% complete)..."
        : previewState === "processing"
        ? "Extracting audio and encoding with LAME MP3 codec..."
        : undefined,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  const handleConvertClick = () => {
    if (!selectedFile) return;
    // Show validated submission summary notice honestly
    setShowValidatedNotice(true);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setShowValidatedNotice(false);
    setPreviewState(null);
  };

  return (
    <div id="converter" className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      <Card className="border-slate-800/80 bg-[#0d1322]/90 backdrop-blur-xl shadow-2xl shadow-purple-950/20 relative overflow-hidden">
        {/* Subtle top gradient accent glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* If a state preview is explicitly selected, render that state component */}
          {previewState ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Eye className="h-4 w-4" /> State Preview Mode: {previewState.toUpperCase()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewState(null)}
                  className="text-xs text-slate-400 hover:text-white h-7"
                >
                  Exit Preview
                </Button>
              </div>

              {previewState === "uploading" && (
                <UploadingState job={demoJob} onCancel={() => setPreviewState("cancelled")} />
              )}
              {previewState === "queued" && (
                <QueuedState job={demoJob} onCancel={() => setPreviewState("cancelled")} />
              )}
              {previewState === "processing" && (
                <ProcessingState job={demoJob} onCancel={() => setPreviewState("cancelled")} />
              )}
              {previewState === "completed" && (
                <CompletedState job={demoJob} onReset={handleReset} />
              )}
              {previewState === "failed" && (
                <FailedState
                  job={demoJob}
                  onRetry={() => setPreviewState("processing")}
                  onReset={handleReset}
                />
              )}
              {previewState === "cancelled" && (
                <CancelledState job={demoJob} onReset={handleReset} />
              )}
              {previewState === "expired" && <ExpiredState onReset={handleReset} />}
            </div>
          ) : (
            <>
              {/* Uploader / Dropzone */}
              <Dropzone
                selectedFile={selectedFile}
                onFileSelect={(meta) => {
                  setSelectedFile(meta);
                  setShowValidatedNotice(false);
                }}
                onFileRemove={handleReset}
              />

              {/* Conversion Settings & Primary CTA */}
              <ConversionSettings
                settings={settings}
                onSettingsChange={setSettings}
                onConvert={handleConvertClick}
                disabled={!selectedFile}
                hasFile={!!selectedFile}
              />

              {/* Phase 1 Client-Side Validation Notice (Honest UI) */}
              {showValidatedNotice && selectedFile && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 animate-in fade-in slide-in-from-top-2 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">
                        Client Validation Passed — Ready for Conversion Engine
                      </h4>
                      <p className="text-xs text-slate-300">
                        File <span className="font-mono text-purple-300">{selectedFile.name}</span>{" "}
                        has been validated in the browser. Target format:{" "}
                        <span className="font-semibold text-white">MP3</span> at{" "}
                        <span className="font-semibold text-white">{settings.bitrate} kbps</span>.
                      </p>
                      <p className="text-[11px] text-slate-400 pt-1">
                        In Phase 2, this triggers the multipart streaming upload to the BullMQ conversion queue and FFmpeg worker. You can preview all backend conversion states below.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Interactive State Component Inspector Bar */}
          <div className="pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <SlidersHorizontal className="h-3.5 w-3.5 text-purple-400" />
              <span>Conversion State Components:</span>
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  "uploading",
                  "queued",
                  "processing",
                  "completed",
                  "failed",
                  "cancelled",
                  "expired",
                ] as JobStatus[]
              ).map((st) => (
                <button
                  key={st}
                  onClick={() => setPreviewState(previewState === st ? null : st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all capitalize ${
                    previewState === st
                      ? "bg-purple-600 text-white shadow-sm shadow-purple-900/50"
                      : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                  title={`Preview ${st} component`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
