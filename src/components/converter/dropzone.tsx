"use client";

import React, { useRef, useState, useCallback } from "react";
import { UploadCloud, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectedFileCard } from "@/components/converter/selected-file-card";
import { validateSelectedFile } from "@/lib/validation/converter";
import { MAX_FILE_SIZE_LABEL } from "@/lib/constants";
import { SelectedFileMetadata } from "@/types/conversion";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  selectedFile: SelectedFileMetadata | null;
  onFileSelect: (fileMeta: SelectedFileMetadata) => void;
  onFileRemove: () => void;
  disabled?: boolean;
}

export function Dropzone({
  selectedFile,
  onFileSelect,
  onFileRemove,
  disabled = false,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to extract duration via client-side video element
  const processFile = useCallback(
    (file: File) => {
      setErrorMessage(null);
      const validation = validateSelectedFile(file);

      if (!validation.valid) {
        setErrorMessage(validation.error || "Invalid file selection.");
        return;
      }

      // Try reading duration in browser
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";

      const handleLoadedMetadata = () => {
        onFileSelect({
          file,
          name: file.name,
          size: file.size,
          type: file.type || "video/mp4",
          duration: video.duration,
        });
        URL.revokeObjectURL(objectUrl);
      };

      const handleError = () => {
        // Fallback without duration
        onFileSelect({
          file,
          name: file.name,
          size: file.size,
          type: file.type || "video/mp4",
        });
        URL.revokeObjectURL(objectUrl);
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata, {
        once: true,
      });
      video.addEventListener("error", handleError, { once: true });
      video.src = objectUrl;
    },
    [onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
    // Reset file input so selecting the same file again triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerFileInput();
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,video/mp4,video/x-m4v"
        className="sr-only"
        onChange={handleFileInputChange}
        disabled={disabled}
        id="mp4-file-input"
        tabIndex={-1}
        aria-label="Upload MP4 video"
      />

      {/* Show Selected File Card if a file is already chosen */}
      {selectedFile ? (
        <SelectedFileCard
          fileMeta={selectedFile}
          onRemove={() => {
            onFileRemove();
            setErrorMessage(null);
          }}
          onReplace={triggerFileInput}
          disabled={disabled}
        />
      ) : (
        /* Empty / Drag-and-Drop Area */
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Drag and drop your MP4 file here or click to choose file"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
            isDragOver
              ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10 scale-[1.005]"
              : "border-neutral-800 hover:border-neutral-700 bg-black hover:bg-[#080808]",
            errorMessage && "border-rose-500/60 bg-rose-500/5",
            disabled && "cursor-not-allowed opacity-50 pointer-events-none"
          )}
        >
          {/* Cloud Icon with Subtle Neutral Ring */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 shadow-md group-hover:scale-105 transition-transform">
            <UploadCloud className="h-8 w-8 text-neutral-300" />
          </div>

          {/* Heading */}
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5">
            {isDragOver ? "Drop your MP4 file here" : "Drag & drop your MP4 file here"}
          </h3>

          <p className="text-xs sm:text-sm text-neutral-400 mb-5">
            or select a file from your device
          </p>

          {/* Choose File Button */}
          <Button
            type="button"
            variant="gradient"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              triggerFileInput();
            }}
            disabled={disabled}
            className="h-11 px-6 rounded-xl font-medium gap-2 text-sm bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-600 text-white shadow-lg shadow-blue-950/60 active:scale-[0.98] transition-all"
          >
            <FileText className="h-4 w-4" />
            <span>Choose File</span>
          </Button>

          {/* Guidelines */}
          <p className="mt-5 text-xs text-neutral-500">
            Supports MP4 files only • Max file size: {MAX_FILE_SIZE_LABEL}
          </p>
        </div>
      )}

      {/* Validation Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-2.5 text-xs text-rose-300 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
