"use client";

import React, { useState } from "react";
import { Music, ArrowRightLeft, Loader2, Scissors, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BITRATE_OPTIONS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";
import { AudioBitrate, ConversionSettings as IConversionSettings } from "@/types/conversion";

interface ConversionSettingsProps {
  settings: IConversionSettings;
  onSettingsChange: (settings: IConversionSettings) => void;
  onConvert: () => void;
  disabled: boolean;
  isLoading?: boolean;
  hasFile: boolean;
  detectedDuration?: number;
}

export function ConversionSettings({
  settings,
  onSettingsChange,
  onConvert,
  disabled,
  isLoading = false,
  hasFile,
  detectedDuration = 0,
}: ConversionSettingsProps) {
  const [showTrim, setShowTrim] = useState<boolean>(false);

  const totalDuration = detectedDuration > 0 ? Math.round(detectedDuration) : 300;
  const currentStart = settings.trimStartSec ?? 0;
  const currentEnd = settings.trimEndSec ?? totalDuration;

  const handleBitrateChange = (val: string) => {
    const num = parseInt(val, 10) as AudioBitrate;
    onSettingsChange({
      ...settings,
      bitrate: num,
    });
  };

  const handleToggleTrim = () => {
    if (!showTrim) {
      setShowTrim(true);
      onSettingsChange({
        ...settings,
        trimStartSec: 0,
        trimEndSec: totalDuration,
      });
    } else {
      setShowTrim(false);
      onSettingsChange({
        ...settings,
        trimStartSec: undefined,
        trimEndSec: undefined,
      });
    }
  };

  const handleSliderChange = (vals: number[]) => {
    const [start, end] = vals;
    onSettingsChange({
      ...settings,
      trimStartSec: start,
      trimEndSec: end,
    });
  };

  const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(0, Math.min(parseInt(e.target.value, 10) || 0, currentEnd - 1));
    onSettingsChange({
      ...settings,
      trimStartSec: val,
    });
  };

  const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(
      totalDuration,
      Math.max(parseInt(e.target.value, 10) || totalDuration, currentStart + 1)
    );
    onSettingsChange({
      ...settings,
      trimEndSec: val,
    });
  };

  return (
    <div className="pt-4 border-t border-neutral-800/80 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
        {/* Output Format */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300 block">
            Output Format
          </label>
          <div className="flex h-11 w-full items-center justify-between rounded-xl border border-neutral-800 bg-black px-3.5 py-2 text-sm text-white">
            <span className="flex items-center gap-2">
              <Music className="h-4 w-4 text-purple-400" />
              <span className="font-medium">MP3</span>
            </span>
            <span className="text-[11px] text-neutral-400 font-mono bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
              Fixed
            </span>
          </div>
        </div>

        {/* Quality / Bitrate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="bitrate-select"
              className="text-xs font-semibold text-slate-300 block"
            >
              Quality
            </label>
            <button
              type="button"
              onClick={handleToggleTrim}
              disabled={disabled || !hasFile}
              className={`text-xs flex items-center gap-1 transition-colors ${
                showTrim
                  ? "text-purple-400 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Scissors className="h-3 w-3" />
              <span>{showTrim ? "Trim Active" : "Trim Audio"}</span>
            </button>
          </div>
          <Select
            value={settings.bitrate.toString()}
            onValueChange={handleBitrateChange}
            disabled={disabled || isLoading}
          >
            <SelectTrigger id="bitrate-select" aria-label="Select audio quality">
              <SelectValue placeholder="Select quality" />
            </SelectTrigger>
            <SelectContent>
              {BITRATE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  <div className="flex flex-col text-left py-0.5">
                    <span className="font-medium text-white">{opt.label}</span>
                    <span className="text-[11px] text-slate-400">
                      {opt.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Convert to MP3 Button */}
        <div className="sm:col-span-2 md:col-span-1">
          <Button
            type="button"
            variant="gradient"
            size="lg"
            onClick={onConvert}
            disabled={disabled || !hasFile || isLoading}
            className="w-full h-11 rounded-xl text-sm font-semibold gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/30 transition-all"
            aria-label="Convert MP4 video to MP3"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Preparing...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 text-white" />
                <span>
                  {showTrim ? "Trim & Convert to MP3" : "Convert to MP3"}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable Audio Trimming Control Card */}
      {showTrim && hasFile && (
        <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Scissors className="h-3.5 w-3.5 text-purple-400" />
              <span>Select Audio Trim Window</span>
            </span>
            <span className="text-[11px] font-mono text-neutral-300 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Segment: {formatDuration(currentStart)} - {formatDuration(currentEnd)} ({formatDuration(currentEnd - currentStart)})
            </span>
          </div>

          <div className="pt-2 px-1">
            <Slider
              min={0}
              max={totalDuration}
              step={1}
              value={[currentStart, currentEnd]}
              onValueChange={handleSliderChange}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-neutral-400">Start Time (seconds):</label>
              <input
                type="number"
                min={0}
                max={currentEnd - 1}
                value={currentStart}
                onChange={handleStartInputChange}
                className="w-full h-8 px-2.5 rounded-lg border border-neutral-800 bg-neutral-900 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-neutral-400">End Time (seconds):</label>
              <input
                type="number"
                min={currentStart + 1}
                max={totalDuration}
                value={currentEnd}
                onChange={handleEndInputChange}
                className="w-full h-8 px-2.5 rounded-lg border border-neutral-800 bg-neutral-900 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
