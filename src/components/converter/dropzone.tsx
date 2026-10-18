"use client";

import React, { useRef, useState, useCallback } from "react";
import { UploadCloud, FileText, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectedFileCard } from "@/components/converter/selected-file-card";
import { SelectedFilesList } from "@/components/converter/selected-files-list";
import { validateSelectedFile } from "@/lib/validation/converter";
import { MAX_FILE_SIZE_LABEL } from "@/lib/constants";
import { SelectedFileMetadata } from "@/types/conversion";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  selectedFile?: SelectedFileMetadata | null;
  selectedFiles?: SelectedFileMetadata[];
  onFileSelect?: (fileMeta: SelectedFileMetadata) => void;
  onFilesSelect?: (fileMetas: SelectedFileMetadata[]) => void;
  onFileRemove?: (index?: number) => void;
  onClearAll?: () => void;
  disabled?: boolean;
}

export function Dropzone({
  selectedFile,
  selectedFiles,
  onFileSelect,
  onFilesSelect,
  onFileRemove,
  onClearAll,
  disabled = false,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize selected files list
  const currentFiles: SelectedFileMetadata[] =
    selectedFiles !== undefined
      ? selectedFiles
      : selectedFile
      ? [selectedFile]
      : [];

  // Helper to extract duration via client-side video element for a single file
  const readDuration = (file: File): Promise<number | undefined> => {
    return new Promise((resolve) => {
      try {
        const objectUrl = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";

        const cleanup = () => {
          URL.revokeObjectURL(objectUrl);
        };

        video.addEventListener(
          "loadedmetadata",
          () => {
            const dur = video.duration;
            cleanup();
            resolve(dur);
          },
          { once: true }
        );

        video.addEventListener(
          "error",
          () => {
            cleanup();
            resolve(undefined);
          },
          { once: true }
        );

        // Timeout fallback after 2s
        setTimeout(() => {
          cleanup();
          resolve(undefined);
        }, 2000);

        video.src = objectUrl;
      } catch {
        resolve(undefined);
      }
    });
  };

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setErrorMessage(null);
      const filesArray = Array.from(fileList);

      if (filesArray.length === 0) return;

      const validMetas: SelectedFileMetadata[] = [];
      const errorMessages: string[] = [];

      for (const file of filesArray) {
        const validation = validateSelectedFile(file);
        if (!validation.valid) {
          errorMessages.push(`${file.name}: ${validation.error || "Invalid file"}`);
          continue;
        }

        const duration = await readDuration(file);
        validMetas.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type || "video/mp4",
          duration,
        });
      }

      if (errorMessages.length > 0) {
        setErrorMessage(errorMessages.join(" • "));
      }

      if (validMetas.length > 0) {
        if (onFilesSelect) {
          onFilesSelect(validMetas);
        } else if (onFileSelect) {
          onFileSelect(validMetas[0]);
        }
      }
    },
    [onFileSelect, onFilesSelect]
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
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
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

  const handleRemoveSingle = () => {
    if (onFileRemove) onFileRemove(0);
    if (onClearAll) onClearAll();
    setErrorMessage(null);
  };

  return (
    <div className="w-full space-y-3">
      {/* Hidden native input supporting multi-selection */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".mp4,video/mp4,video/x-m4v"
        className="sr-only"
        onChange={handleFileInputChange}
        disabled={disabled}
        id="mp4-file-input"
        tabIndex={-1}
        aria-label="Upload MP4 video files"
      />

      {/* Render multi-file batch list if more than 1 file */}
      {currentFiles.length > 1 ? (
        <SelectedFilesList
          files={currentFiles}
          onRemoveFile={(idx) => {
            if (onFileRemove) onFileRemove(idx);
          }}
          onClearAll={() => {
            if (onClearAll) onClearAll();
            else if (onFileRemove) onFileRemove(0);
            setErrorMessage(null);
          }}
          onAddMore={triggerFileInput}
          disabled={disabled}
        />
      ) : currentFiles.length === 1 ? (
        /* Single file view with option to add more files to turn into batch */
        <div className="space-y-2">
          <SelectedFileCard
            fileMeta={currentFiles[0]}
            onRemove={handleRemoveSingle}
            onReplace={triggerFileInput}
            disabled={disabled}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={disabled}
              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 font-medium px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add another video for batch conversion</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty / Drag-and-Drop Area */
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Drag and drop your MP4 files here or click to choose files"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            isDragOver
              ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 scale-[1.005]"
              : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-700 bg-neutral-50/70 hover:bg-neutral-100/70 dark:bg-black dark:hover:bg-black",
            errorMessage && "border-rose-500/60 bg-rose-500/5",
            disabled && "cursor-not-allowed opacity-50 pointer-events-none"
          )}
        >
          {/* Cloud Icon */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 shadow-md group-hover:scale-105 transition-transform">
            <UploadCloud className="h-8 w-8 text-neutral-600 dark:text-neutral-300" />
          </div>

          {/* Heading */}
          <h3 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white mb-1.5">
            {isDragOver ? "Drop your MP4 files here" : "Drag & drop your MP4 files here"}
          </h3>

          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mb-5">
            Single or multiple files • Batch conversion supported
          </p>

          {/* Choose Files Button */}
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
            <span>Choose Files</span>
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
