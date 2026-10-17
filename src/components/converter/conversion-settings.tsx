"use client";

import React from "react";
import { Music, ArrowRightLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BITRATE_OPTIONS } from "@/lib/constants";
import { AudioBitrate, ConversionSettings as IConversionSettings } from "@/types/conversion";

interface ConversionSettingsProps {
  settings: IConversionSettings;
  onSettingsChange: (settings: IConversionSettings) => void;
  onConvert: () => void;
  disabled: boolean;
  isLoading?: boolean;
  hasFile: boolean;
}

export function ConversionSettings({
  settings,
  onSettingsChange,
  onConvert,
  disabled,
  isLoading = false,
  hasFile,
}: ConversionSettingsProps) {
  const handleBitrateChange = (val: string) => {
    const num = parseInt(val, 10) as AudioBitrate;
    onSettingsChange({
      ...settings,
      bitrate: num,
    });
  };

  return (
    <div className="pt-4 border-t border-slate-800/80">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
        {/* Output Format */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 block">
            Output Format
          </label>
          <div className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-700/80 bg-[#0d1424] px-3.5 py-2 text-sm text-white">
            <span className="flex items-center gap-2">
              <Music className="h-4 w-4 text-purple-400" />
              <span className="font-medium">MP3</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded">
              Fixed
            </span>
          </div>
        </div>

        {/* Quality / Bitrate */}
        <div className="space-y-1.5">
          <label
            htmlFor="bitrate-select"
            className="text-xs font-semibold text-slate-300 block"
          >
            Quality
          </label>
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
            className="w-full h-11 rounded-xl text-sm font-semibold gap-2 shadow-lg shadow-purple-900/25 transition-all"
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
                <span>Convert to MP3</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
