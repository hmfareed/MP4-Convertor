"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { Button } from "@/components/ui/button";
import { Eye, SlidersHorizontal, AlertCircle } from "lucide-react";
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
  const [activeJob, setActiveJob] = useState<ConversionJob | null>(null);
  const [previewState, setPreviewState] = useState<JobStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (uploadXhrRef.current) {
        uploadXhrRef.current.abort();
      }
    };
  }, []);

  // Poll status endpoint while job is queued or processing
  const startStatusPolling = (jobId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/conversions/${jobId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch conversion status.");
        }
        const data = await res.json();

        setActiveJob((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: data.status,
            progress: data.progress ?? prev.progress,
            outputFilename: data.outputFilename,
            duration: data.duration ?? prev.duration,
            downloadUrl: data.downloadUrl,
            audioUrl: data.previewUrl,
            error: data.errorMessage,
            completedAt: data.completedAt,
          };
        });

        // Stop polling on terminal states
        if (["completed", "failed", "cancelled", "expired"].includes(data.status)) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1200);
  };

  const handleStartConversion = async () => {
    if (!selectedFile) return;
    setErrorMessage(null);

    // 1. Initialize Uploading State
    const initialJob: ConversionJob = {
      id: "pending_upload",
      originalFilename: selectedFile.name,
      fileSize: selectedFile.size,
      duration: selectedFile.duration,
      bitrate: settings.bitrate,
      format: settings.format,
      status: "uploading",
      progress: 0,
      statusMessage: "Preparing upload...",
      createdAt: new Date().toISOString(),
    };

    setActiveJob(initialJob);

    // 2. Perform real streaming upload with progress tracking
    const formData = new FormData();
    formData.append("file", selectedFile.file);

    const xhr = new XMLHttpRequest();
    uploadXhrRef.current = xhr;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        setActiveJob((prev) =>
          prev
            ? {
                ...prev,
                progress: percent,
                statusMessage: `Uploading video chunks (${percent}% complete)...`,
              }
            : null
        );
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const uploadData = JSON.parse(xhr.responseText);
          const uploadId = uploadData.uploadId;

          // Transition to queued state
          setActiveJob((prev) =>
            prev
              ? {
                  ...prev,
                  status: "queued",
                  progress: 0,
                  statusMessage: "Enqueued in processing pipeline...",
                }
              : null
          );

          // 3. Request conversion job creation with optional trim parameters
          const convRes = await fetch("/api/conversions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadId,
              bitrate: settings.bitrate,
              trimStartSec: settings.trimStartSec,
              trimEndSec: settings.trimEndSec,
            }),
          });

          if (!convRes.ok) {
            const errJson = await convRes.json().catch(() => ({}));
            throw new Error(errJson.error?.message || "Failed to schedule conversion.");
          }

          const convData = await convRes.json();
          const jobId = convData.jobId;

          setActiveJob((prev) =>
            prev
              ? {
                  ...prev,
                  id: jobId,
                  status: "queued",
                }
              : null
          );

          // 4. Begin polling worker progress
          startStatusPolling(jobId);
        } catch (err: unknown) {
          const error = err as Error;
          setActiveJob((prev) =>
            prev
              ? {
                  ...prev,
                  status: "failed",
                  error: error.message || "Failed to create conversion job.",
                }
              : null
          );
        }
      } else {
        try {
          const errJson = JSON.parse(xhr.responseText);
          setActiveJob((prev) =>
            prev
              ? {
                  ...prev,
                  status: "failed",
                  error: errJson.error?.message || "Upload failed. Please try again.",
                }
              : null
          );
        } catch {
          setActiveJob((prev) =>
            prev
              ? {
                  ...prev,
                  status: "failed",
                  error: "Network upload error occurred.",
                }
              : null
          );
        }
      }
    };

    xhr.onerror = () => {
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              status: "failed",
              error: "Network connection lost during upload.",
            }
          : null
      );
    };

    xhr.open("POST", "/api/uploads");
    xhr.send(formData);
  };

  const handleRetryJob = async () => {
    if (!activeJob || activeJob.id === "pending_upload") {
      handleStartConversion();
      return;
    }

    try {
      setActiveJob((prev) => (prev ? { ...prev, status: "queued", progress: 0 } : null));

      const res = await fetch(`/api/conversions/${activeJob.id}/retry`, {
        method: "POST",
      });

      if (!res.ok) {
        // If retry fails (e.g. upload expired), fallback to full re-conversion
        handleStartConversion();
        return;
      }

      startStatusPolling(activeJob.id);
    } catch {
      handleStartConversion();
    }
  };

  const handleCancelJob = async () => {
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
      uploadXhrRef.current = null;
    }

    if (activeJob && activeJob.id !== "pending_upload") {
      try {
        await fetch(`/api/conversions/${activeJob.id}/cancel`, { method: "POST" });
      } catch (err) {
        console.error("Cancel error:", err);
      }
    }

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setActiveJob((prev) => (prev ? { ...prev, status: "cancelled" } : null));
  };

  const handleReset = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
      uploadXhrRef.current = null;
    }

    setSelectedFile(null);
    setActiveJob(null);
    setPreviewState(null);
    setErrorMessage(null);
  };

  // Demo job for static preview button clicks
  const demoJob: ConversionJob = {
    id: "job_demo_preview",
    originalFilename: selectedFile ? selectedFile.name : "presentation_recording.mp4",
    outputFilename: selectedFile
      ? `${selectedFile.name.replace(/\.[^/.]+$/, "")}.mp3`
      : "presentation_recording.mp3",
    fileSize: selectedFile ? selectedFile.size : 42 * 1024 * 1024,
    duration: selectedFile?.duration || 184,
    bitrate: settings.bitrate,
    format: settings.format,
    status: previewState || "completed",
    progress: previewState === "uploading" ? 45 : previewState === "processing" ? 78 : 100,
    statusMessage:
      previewState === "uploading"
        ? "Uploading video chunks (45% complete)..."
        : previewState === "processing"
        ? "Extracting audio and encoding with LAME MP3 codec..."
        : undefined,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  return (
    <div id="converter" className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      <Card className="border-neutral-800 bg-[#0a0a0a] shadow-2xl relative overflow-hidden">
        {/* Subtle top gradient accent glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600" />

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Active Job State Render */}
          {activeJob && !previewState ? (
            <div className="space-y-4">
              {activeJob.status === "uploading" && (
                <UploadingState job={activeJob} onCancel={handleCancelJob} />
              )}
              {activeJob.status === "queued" && (
                <QueuedState job={activeJob} onCancel={handleCancelJob} />
              )}
              {activeJob.status === "processing" && (
                <ProcessingState job={activeJob} onCancel={handleCancelJob} />
              )}
              {activeJob.status === "completed" && (
                <CompletedState job={activeJob} onReset={handleReset} />
              )}
              {activeJob.status === "failed" && (
                <FailedState
                  job={activeJob}
                  onRetry={handleRetryJob}
                  onReset={handleReset}
                />
              )}
              {activeJob.status === "cancelled" && (
                <CancelledState job={activeJob} onReset={handleReset} />
              )}
              {activeJob.status === "expired" && <ExpiredState onReset={handleReset} />}
            </div>
          ) : previewState ? (
            /* Explicit Dev Preview Mode */
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
            /* Standard Upload & Conversion Controls */
            <>
              <Dropzone
                selectedFile={selectedFile}
                onFileSelect={(meta) => {
                  setSelectedFile(meta);
                  setErrorMessage(null);
                }}
                onFileRemove={handleReset}
              />

              <ConversionSettings
                settings={settings}
                onSettingsChange={setSettings}
                onConvert={handleStartConversion}
                disabled={!selectedFile}
                hasFile={!!selectedFile}
                detectedDuration={selectedFile?.duration}
              />

              {errorMessage && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-center gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}

          {/* Component State Inspector */}
          <div className="pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium text-neutral-300">
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
                      ? "bg-purple-600 text-white shadow-sm shadow-purple-900/40"
                      : "bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800"
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
