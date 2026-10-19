"use client";

import React, { useState } from "react";
import {
  Music,
  ArrowRightLeft,
  Loader2,
  Scissors,
  Clock,
  Sparkles,
  SlidersHorizontal,
  Volume2,
  RotateCcw,
  Gauge,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BITRATE_OPTIONS, FORMAT_OPTIONS, getFormatConfig } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";
import {
  AudioBitrate,
  OutputFormat,
  ConversionSettings as IConversionSettings,
} from "@/types/conversion";

interface ConversionSettingsProps {
  settings: IConversionSettings;
  onSettingsChange: (settings: IConversionSettings) => void;
  onConvert: () => void;
  disabled: boolean;
  isLoading?: boolean;
  hasFile: boolean;
  detectedDuration?: number;
  fileCount?: number;
}

export function ConversionSettings({
  settings,
  onSettingsChange,
  onConvert,
  disabled,
  isLoading = false,
  hasFile,
  detectedDuration = 0,
  fileCount = 1,
}: ConversionSettingsProps) {
  const [showTrim, setShowTrim] = useState<boolean>(false);
  const [showStudio, setShowStudio] = useState<boolean>(false);

  const totalDuration = detectedDuration > 0 ? Math.round(detectedDuration) : 300;
  const currentStart = settings.trimStartSec ?? 0;
  const currentEnd = settings.trimEndSec ?? totalDuration;

  const currentVolume = settings.volumeMultiplier ?? 1.0;
  const currentSpeed = settings.playbackSpeed ?? 1.0;
  const currentFadeIn = settings.fadeInDurationSec ?? 0;
  const currentFadeOut = settings.fadeOutDurationSec ?? 0;
  const isNormalized = !!settings.normalizeAudio;

  const activeEnhancementsCount = [
    isNormalized ? 1 : 0,
    currentVolume !== 1.0 ? 1 : 0,
    currentFadeIn > 0 ? 1 : 0,
    currentFadeOut > 0 ? 1 : 0,
    currentSpeed !== 1.0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const currentFormatConfig = getFormatConfig(settings.format || "mp3");
  const isLossless = !!currentFormatConfig.isLossless;

  const handleFormatChange = (val: string) => {
    onSettingsChange({
      ...settings,
      format: val as OutputFormat,
    });
  };

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

  const handleToggleNormalize = () => {
    onSettingsChange({
      ...settings,
      normalizeAudio: !isNormalized,
    });
  };

  const handleVolumeChange = (vol: number) => {
    onSettingsChange({
      ...settings,
      volumeMultiplier: vol,
    });
  };

  const handleFadeInChange = (sec: number) => {
    onSettingsChange({
      ...settings,
      fadeInDurationSec: sec,
    });
  };

  const handleFadeOutChange = (sec: number) => {
    onSettingsChange({
      ...settings,
      fadeOutDurationSec: sec,
    });
  };

  const handleSpeedChange = (speed: number) => {
    onSettingsChange({
      ...settings,
      playbackSpeed: speed,
    });
  };

  const handleResetEnhancements = () => {
    onSettingsChange({
      ...settings,
      normalizeAudio: false,
      volumeMultiplier: 1.0,
      fadeInDurationSec: 0,
      fadeOutDurationSec: 0,
      playbackSpeed: 1.0,
    });
  };

  return (
    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800/80 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
        {/* Output Format Select */}
        <div className="space-y-1.5">
          <label
            htmlFor="format-select"
            className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block"
          >
            Output Format
          </label>
          <Select
            value={settings.format}
            onValueChange={handleFormatChange}
            disabled={disabled || isLoading}
          >
            <SelectTrigger
              id="format-select"
              aria-label="Select output audio format"
              className="h-11 rounded-xl bg-neutral-50 dark:bg-black border-neutral-300 dark:border-neutral-800"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Music className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {currentFormatConfig.label}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-1.5 py-0.5 rounded ml-1 truncate">
                  {currentFormatConfig.badge}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent
              side="bottom"
              align="start"
              sideOffset={6}
              avoidCollisions={false}
              className="max-h-72 overflow-y-auto"
            >
              {FORMAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col text-left py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {opt.label}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-1.5 py-0.2 rounded">
                        {opt.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500 dark:text-slate-400">
                      {opt.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quality / Bitrate + Studio Tools Toolbar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="bitrate-select"
              className="text-xs font-semibold text-neutral-700 dark:text-slate-300 block"
            >
              Quality / Bitrate
            </label>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowStudio((prev) => !prev)}
                disabled={disabled || !hasFile}
                className={`text-xs flex items-center gap-1 transition-colors ${
                  showStudio || activeEnhancementsCount > 0
                    ? "text-cyan-400 font-semibold"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>
                  {activeEnhancementsCount > 0
                    ? `Studio (${activeEnhancementsCount})`
                    : "Studio"}
                </span>
              </button>
              {fileCount <= 1 && (
                <button
                  type="button"
                  onClick={handleToggleTrim}
                  disabled={disabled || !hasFile}
                  className={`text-xs flex items-center gap-1 transition-colors ${
                    showTrim
                      ? "text-blue-500 font-semibold"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Scissors className="h-3 w-3" />
                  <span>{showTrim ? "Trim Active" : "Trim"}</span>
                </button>
              )}
            </div>
          </div>

          {isLossless ? (
            <div className="flex h-11 w-full items-center justify-between rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-black px-3.5 py-2 text-sm text-neutral-900 dark:text-white">
              <span className="flex items-center gap-1.5 text-xs font-mono text-neutral-300">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Lossless (Master PCM / 1411k)</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                Auto
              </span>
            </div>
          ) : (
            <Select
              value={settings.bitrate.toString()}
              onValueChange={handleBitrateChange}
              disabled={disabled || isLoading}
            >
              <SelectTrigger id="bitrate-select" aria-label="Select audio quality">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent
                side="bottom"
                align="start"
                sideOffset={6}
                avoidCollisions={false}
                className="max-h-72 overflow-y-auto"
              >
                {BITRATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    <div className="flex flex-col text-left py-0.5">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-slate-400">
                        {opt.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Convert Button */}
        <div className="sm:col-span-2 md:col-span-1">
          <Button
            type="button"
            variant="gradient"
            size="lg"
            onClick={onConvert}
            disabled={disabled || !hasFile || isLoading}
            className="w-full h-11 rounded-xl text-sm font-semibold gap-2 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-600 text-white shadow-lg shadow-blue-950/60 active:scale-[0.98] transition-all"
            aria-label={`Convert MP4 video to ${currentFormatConfig.label}`}
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
                  {fileCount > 1
                    ? `Convert ${fileCount} Files to ${currentFormatConfig.label}`
                    : activeEnhancementsCount > 0
                    ? `Enhance & Convert to ${currentFormatConfig.label}`
                    : showTrim
                    ? `Trim & Convert to ${currentFormatConfig.label}`
                    : `Convert to ${currentFormatConfig.label}`}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable Audio Studio Enhancements Drawer */}
      {showStudio && hasFile && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-black p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800/80">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                Audio Enhancement & Studio Suite
              </span>
              {activeEnhancementsCount > 0 ? (
                <span className="text-[10px] font-medium bg-cyan-950/60 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded-full">
                  {activeEnhancementsCount} active
                </span>
              ) : (
                <span className="text-[10px] font-medium text-neutral-500 dark:text-slate-500">
                  (Original master audio)
                </span>
              )}
            </div>

            {activeEnhancementsCount > 0 && (
              <button
                type="button"
                onClick={handleResetEnhancements}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset All</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Loudness Normalization (EBU R128) */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-950/50 p-3 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Loudness Normalization
                  </span>
                  <span className="text-[9px] font-mono bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 px-1 rounded">
                    EBU R128
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-slate-400 leading-relaxed">
                  Balances inconsistent volume levels across videos & eliminates audio clipping.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleNormalize}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isNormalized ? "bg-cyan-500 shadow-sm shadow-cyan-500/50" : "bg-neutral-300 dark:bg-neutral-800"
                }`}
                role="switch"
                aria-checked={isNormalized}
                aria-label="Toggle loudness normalization"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isNormalized ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* 2. Playback Speed & Tempo */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-950/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Playback Speed / Tempo
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-indigo-400">
                  {currentSpeed.toFixed(2).replace(/\.00$/, "")}×
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-slate-400">
                Speed up or slow down while preserving natural voice pitch.
              </p>
              <div className="flex items-center gap-1.5 pt-0.5">
                {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSpeedChange(s)}
                    className={`flex-1 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                      currentSpeed === s
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/50"
                        : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-slate-400 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Volume Booster Slider */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-950/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Volume Gain / Booster
                  </span>
                </div>
                <span className="text-[11px] font-mono text-blue-400 font-semibold">
                  {Math.round(currentVolume * 100)}%
                  <span className="text-neutral-500 dark:text-slate-500 ml-1 font-normal">
                    {currentVolume === 1.0
                      ? "(0 dB)"
                      : currentVolume > 1.0
                      ? `(+${(20 * Math.log10(currentVolume)).toFixed(1)} dB)`
                      : `(${(20 * Math.log10(currentVolume)).toFixed(1)} dB)`}
                  </span>
                </span>
              </div>

              <div className="pt-1 px-1">
                <Slider
                  min={50}
                  max={250}
                  step={10}
                  value={[Math.round(currentVolume * 100)]}
                  onValueChange={(vals) => handleVolumeChange(vals[0] / 100)}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-1 text-[10px]">
                {[
                  { label: "50%", val: 0.5 },
                  { label: "100% (Default)", val: 1.0 },
                  { label: "150% (+3.5dB)", val: 1.5 },
                  { label: "200% (+6dB)", val: 2.0 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => handleVolumeChange(preset.val)}
                    className={`px-1.5 py-0.5 rounded font-mono transition-colors ${
                      Math.abs(currentVolume - preset.val) < 0.05
                        ? "bg-blue-600/30 text-blue-400 border border-blue-500/40"
                        : "text-neutral-500 dark:text-slate-400 hover:text-white"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Fade In & Fade Out Transitions */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-950/50 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                  Fade Transitions
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-slate-400 font-mono">
                  Smooth intro & outro
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Fade In */}
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-500 dark:text-slate-400 block">
                    Fade In: {currentFadeIn > 0 ? `${currentFadeIn}s` : "Off"}
                  </span>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 5].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleFadeInChange(sec)}
                        className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors ${
                          currentFadeIn === sec
                            ? "bg-cyan-600 text-white font-semibold"
                            : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-slate-400 hover:text-white"
                        }`}
                      >
                        {sec === 0 ? "Off" : `${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fade Out */}
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-500 dark:text-slate-400 block">
                    Fade Out: {currentFadeOut > 0 ? `${currentFadeOut}s` : "Off"}
                  </span>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 5].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleFadeOutChange(sec)}
                        className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors ${
                          currentFadeOut === sec
                            ? "bg-cyan-600 text-white font-semibold"
                            : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-slate-400 hover:text-white"
                        }`}
                      >
                        {sec === 0 ? "Off" : `${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Audio Trimming Control Card */}
      {showTrim && hasFile && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-black p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Scissors className="h-3.5 w-3.5 text-blue-500" />
              <span>Select Audio Trim Window</span>
            </span>
            <span className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 bg-neutral-200/80 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 px-2 py-0.5 rounded-full flex items-center gap-1">
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
              <label className="text-neutral-600 dark:text-neutral-400">Start Time (seconds):</label>
              <input
                type="number"
                min={0}
                max={currentEnd - 1}
                value={currentStart}
                onChange={handleStartInputChange}
                className="w-full h-8 px-2.5 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-neutral-600 dark:text-neutral-400">End Time (seconds):</label>
              <input
                type="number"
                min={currentStart + 1}
                max={totalDuration}
                value={currentEnd}
                onChange={handleEndInputChange}
                className="w-full h-8 px-2.5 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
