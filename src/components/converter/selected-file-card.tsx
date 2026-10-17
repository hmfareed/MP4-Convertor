"use client";

import React from "react";
import { FileVideo, Trash2, RefreshCw, Clock, HardDrive, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDuration } from "@/lib/utils";
import { SelectedFileMetadata } from "@/types/conversion";

interface SelectedFileCardProps {
  fileMeta: SelectedFileMetadata;
  onRemove: () => void;
  onReplace: () => void;
  disabled?: boolean;
}

export function SelectedFileCard({
  fileMeta,
  onRemove,
  onReplace,
  disabled = false,
}: SelectedFileCardProps) {
  return (
    <div className="w-full rounded-xl border border-blue-950/60 bg-black/90 p-4 sm:p-5 transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Icon & File Details */}
        <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-400">
            <FileVideo className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                className="font-medium text-white text-sm sm:text-base truncate max-w-[240px] sm:max-w-xs md:max-w-md"
                title={fileMeta.name}
              >
                {fileMeta.name}
              </p>
              <Badge variant="success" className="hidden sm:inline-flex text-[10px] px-1.5 py-0">
                Ready
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5 text-slate-500" />
                {formatBytes(fileMeta.size)}
              </span>

              {fileMeta.duration !== undefined && fileMeta.duration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  {formatDuration(fileMeta.duration)}
                </span>
              )}

              <span className="text-slate-500">• MP4 Video</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReplace}
            disabled={disabled}
            className="h-8 gap-1.5 text-xs text-slate-300 hover:text-white"
            title="Replace selected file"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Replace</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={disabled}
            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
            title="Remove selected file"
            aria-label="Remove file"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
