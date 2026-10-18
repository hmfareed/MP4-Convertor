"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dropzone } from "@/components/converter/dropzone";
import { ConversionSettings } from "@/components/converter/conversion-settings";
import { BatchConversionCard } from "@/components/converter/batch-conversion-card";
import {
  UploadingState,
  QueuedState,
  ProcessingState,
  CompletedState,
  FailedState,
  CancelledState,
  ExpiredState,
} from "@/components/converter/conversion-states";
import { CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { DEFAULT_BITRATE, DEFAULT_FORMAT } from "@/lib/constants";
import {
  SelectedFileMetadata,
  ConversionSettings as IConversionSettings,
  ConversionJob,
} from "@/types/conversion";

// Conic gradient with short, separated color beams that never touch each other
const MOVING_BORDER_BEAMS =
  "conic-gradient(from 0deg, transparent 0deg, #3b82f6 4deg, #3b82f6 14deg, transparent 18deg, transparent 60deg, #8b5cf6 64deg, #8b5cf6 74deg, transparent 78deg, transparent 120deg, #ec4899 124deg, #ec4899 134deg, transparent 138deg, transparent 180deg, #f59e0b 184deg, #f59e0b 194deg, transparent 198deg, transparent 240deg, #10b981 244deg, #10b981 254deg, transparent 258deg, transparent 300deg, #06b6d4 304deg, #06b6d4 314deg, transparent 318deg, transparent 360deg)";

interface BatchState {
  batchId: string;
  jobs: ConversionJob[];
  overallProgress: number;
}

export function ConverterPanel() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileMetadata[]>([]);
  const [settings, setSettings] = useState<IConversionSettings>({
    format: DEFAULT_FORMAT,
    bitrate: DEFAULT_BITRATE,
  });
  const [activeJob, setActiveJob] = useState<ConversionJob | null>(null);
  const [batchState, setBatchState] = useState<BatchState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);

  // Convenience accessor for single-file scenarios
  const selectedFile = selectedFiles[0] || null;

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

  // Poll status endpoint while single job is queued or processing
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

  // Poll status endpoint for batch conversions
  const startBatchPolling = (batchId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/conversions/batch/${batchId}`);
        if (!res.ok) return;

        const data = await res.json();

        setBatchState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            jobs: data.jobs || prev.jobs,
            overallProgress: data.overallProgress ?? prev.overallProgress,
          };
        });

        // Stop polling once all jobs are complete or failed
        if (data.isComplete) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error("Batch polling error:", err);
      }
    }, 1200);
  };

  // Single-file conversion flow
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

    // 2. Perform streaming upload with progress tracking
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

          // Request conversion job creation
          const convRes = await fetch("/api/conversions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadId,
              format: settings.format,
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

  // Multi-file batch conversion flow
  const handleStartBatchConversion = async () => {
    if (selectedFiles.length === 0) return;
    setErrorMessage(null);

    const batchId = crypto.randomUUID();

    // Initialize batch state
    const initialJobs: ConversionJob[] = selectedFiles.map((file, idx) => ({
      id: `temp_${idx}`,
      batchId,
      originalFilename: file.name,
      outputFilename: `${file.name.replace(/\.[^/.]+$/, "")}.mp3`,
      fileSize: file.size,
      duration: file.duration,
      bitrate: settings.bitrate,
      format: settings.format,
      status: "uploading",
      progress: 0,
      statusMessage: "Starting upload...",
      createdAt: new Date().toISOString(),
    }));

    setBatchState({
      batchId,
      jobs: initialJobs,
      overallProgress: 0,
    });

    // Upload & enqueue each file
    for (let i = 0; i < selectedFiles.length; i++) {
      const fileMeta = selectedFiles[i];

      try {
        const formData = new FormData();
        formData.append("file", fileMeta.file);

        // Upload
        const uploadRes = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || "Upload failed.");
        }

        const uploadData = await uploadRes.json();

        // Enqueue with shared batchId
        const convRes = await fetch("/api/conversions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId: uploadData.uploadId,
            format: settings.format,
            bitrate: settings.bitrate,
            batchId,
          }),
        });

        if (!convRes.ok) {
          const errData = await convRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || "Conversion enqueue failed.");
        }

        const convData = await convRes.json();

        // Update real job ID in batch state
        setBatchState((prev) => {
          if (!prev) return null;
          const updated = [...prev.jobs];
          updated[i] = {
            ...updated[i],
            id: convData.jobId,
            status: "queued",
            progress: 10,
            statusMessage: "Enqueued",
          };
          return { ...prev, jobs: updated };
        });
      } catch (err: unknown) {
        const error = err as Error;
        setBatchState((prev) => {
          if (!prev) return null;
          const updated = [...prev.jobs];
          updated[i] = {
            ...updated[i],
            status: "failed",
            error: error.message || "Failed to process video.",
          };
          return { ...prev, jobs: updated };
        });
      }
    }

    // Start polling the batch endpoint for live worker progress
    startBatchPolling(batchId);
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

  const handleCancelBatch = async () => {
    if (batchState) {
      for (const job of batchState.jobs) {
        if (
          job.id &&
          !job.id.startsWith("temp_") &&
          (job.status === "queued" || job.status === "processing")
        ) {
          fetch(`/api/conversions/${job.id}/cancel`, { method: "POST" }).catch(() => {});
        }
      }
    }

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setBatchState((prev) =>
      prev
        ? {
            ...prev,
            jobs: prev.jobs.map((j) =>
              ["completed", "failed"].includes(j.status) ? j : { ...j, status: "cancelled" }
            ),
          }
        : null
    );
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

    setSelectedFiles([]);
    setActiveJob(null);
    setBatchState(null);
    setErrorMessage(null);
  };

  return (
    <div id="converter" className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      {/* Animated Multi-Color Rotating Border Shell with adaptive neutral base */}
      <div className="relative rounded-2xl p-[2px] overflow-hidden shadow-2xl bg-neutral-200 dark:bg-neutral-800/80">
        {/* Soft rotating ambient aura for separated beams */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 w-[220%] aspect-square -translate-x-1/2 -translate-y-1/2 animate-border-rotate opacity-40 blur-md pointer-events-none"
          style={{ background: MOVING_BORDER_BEAMS }}
        />

        {/* Sharp rotating separated multi-color border beams */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 w-[220%] aspect-square -translate-x-1/2 -translate-y-1/2 animate-border-rotate pointer-events-none"
          style={{ background: MOVING_BORDER_BEAMS }}
        />

        {/* Inner Card Container on Adaptive Background */}
        <div className="relative rounded-[14px] bg-white dark:bg-black overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* 1. Batch Conversion Active State */}
            {batchState ? (
              <BatchConversionCard
                batchId={batchState.batchId}
                jobs={batchState.jobs}
                overallProgress={batchState.overallProgress}
                onReset={handleReset}
                onCancelAll={handleCancelBatch}
              />
            ) : activeJob ? (
              /* 2. Single-File Active Job State Render */
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
            ) : (
              /* 3. Standard Upload & Conversion Controls */
              <>
                <Dropzone
                  selectedFiles={selectedFiles}
                  onFilesSelect={(newFiles) => {
                    setSelectedFiles((prev) => {
                      const existingNames = new Set(prev.map((f) => f.name));
                      const unique = newFiles.filter((f) => !existingNames.has(f.name));
                      return [...prev, ...unique];
                    });
                    setErrorMessage(null);
                  }}
                  onFileRemove={(idx) => {
                    if (idx !== undefined) {
                      setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                    } else {
                      setSelectedFiles([]);
                    }
                  }}
                  onClearAll={() => setSelectedFiles([])}
                />

                <ConversionSettings
                  settings={settings}
                  onSettingsChange={setSettings}
                  onConvert={() => {
                    if (selectedFiles.length > 1) {
                      handleStartBatchConversion();
                    } else if (selectedFiles.length === 1) {
                      handleStartConversion();
                    }
                  }}
                  disabled={selectedFiles.length === 0}
                  hasFile={selectedFiles.length > 0}
                  fileCount={selectedFiles.length}
                  detectedDuration={selectedFiles[0]?.duration}
                />

                {errorMessage && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-center gap-2.5 text-xs text-rose-300">
                    <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </div>
      </div>
    </div>
  );
}
