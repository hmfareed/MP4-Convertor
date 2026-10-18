"use client";

import React from "react";
import { FileVideo, Trash2, Plus, Clock, HardDrive, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDuration } from "@/lib/utils";
import { SelectedFileMetadata } from "@/types/conversion";

interface SelectedFilesListProps {
  files: SelectedFileMetadata[];
  onRemoveFile: (index: number) => void;
  onClearAll: () => void;
  onAddMore: () => void;
  disabled?: boolean;
}

export function SelectedFilesList({
  files,
  onRemoveFile,
  onClearAll,
  onAddMore,
  disabled = false,
}: SelectedFilesListProps) {
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-4 sm:p-5 space-y-3.5 transition-all shadow-sm">
      {/* Top Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Batch Upload Queue
              </h4>
              <Badge variant="gradient" className="text-[10px] px-2 py-0">
                {files.length} {files.length === 1 ? "file" : "files"}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Total combined size: <strong>{formatBytes(totalBytes)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddMore}
            disabled={disabled}
            className="h-8 gap-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border-neutral-300 dark:border-neutral-800 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900"
            title="Add more MP4 files to batch"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add More</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            disabled={disabled}
            className="h-8 px-2 text-xs text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            title="Clear all selected files"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            <span>Clear</span>
          </Button>
        </div>
      </div>

      {/* Scrollable File Items */}
      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {files.map((fileMeta, idx) => (
          <div
            key={`${fileMeta.name}-${idx}`}
            className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-950/60 hover:border-blue-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-600 w-4 text-center">
                {idx + 1}
              </span>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400">
                <FileVideo className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-neutral-900 dark:text-white truncate max-w-xs sm:max-w-md">
                  {fileMeta.name}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-2.5 w-2.5" />
                    {formatBytes(fileMeta.size)}
                  </span>
                  {fileMeta.duration !== undefined && fileMeta.duration > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDuration(fileMeta.duration)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemoveFile(idx)}
              disabled={disabled}
              className="h-7 w-7 p-0 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg flex-shrink-0"
              title="Remove file from batch"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
