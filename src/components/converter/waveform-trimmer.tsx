"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Clock,
  Volume2,
  VolumeX,
  Repeat,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

interface WaveformTrimmerProps {
  file: File;
  totalDuration: number;
  trimStartSec: number;
  trimEndSec: number;
  onTrimChange: (start: number, end: number) => void;
  disabled?: boolean;
}

const NUM_BARS = 120;

function generateFallbackPeaks(numBars: number, seed: number): number[] {
  const peaks: number[] = [];
  let prev = 0.5;
  for (let i = 0; i < numBars; i++) {
    const angle = (i / numBars) * Math.PI * 4;
    const wave = (Math.sin(angle) + Math.cos(angle * 2.3) + 2) / 4;
    const noise = Math.sin((seed + i * 997) % 100) * 0.25;
    const raw = Math.min(1, Math.max(0.15, wave * 0.7 + noise + prev * 0.3));
    prev = raw;
    peaks.push(raw);
  }
  return peaks;
}

async function extractAudioPeaks(file: File, numBars: number): Promise<number[]> {
  try {
    const maxBytes = 25 * 1024 * 1024;
    const slice = file.size > maxBytes ? file.slice(0, maxBytes) : file;
    const arrayBuffer = await slice.arrayBuffer();

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return generateFallbackPeaks(numBars, file.size);
    }

    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close();

    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / numBars);
    const rawPeaks: number[] = [];

    for (let i = 0; i < numBars; i++) {
      const start = i * blockSize;
      let maxVal = 0;
      const step = Math.max(1, Math.floor(blockSize / 20));
      for (let j = 0; j < blockSize; j += step) {
        const sample = Math.abs(channelData[start + j] || 0);
        if (sample > maxVal) maxVal = sample;
      }
      rawPeaks.push(maxVal);
    }

    const highest = Math.max(...rawPeaks, 0.01);
    return rawPeaks.map((p) => Math.max(0.12, p / highest));
  } catch {
    return generateFallbackPeaks(numBars, file.size);
  }
}

export function WaveformTrimmer({
  file,
  totalDuration,
  trimStartSec,
  trimEndSec,
  onTrimChange,
  disabled = false,
}: WaveformTrimmerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [peaks, setPeaks] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(trimStartSec);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dragState, setDragState] = useState<
    "start" | "end" | "window" | null
  >(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragInitialStart, setDragInitialStart] = useState<number>(0);
  const [dragInitialEnd, setDragInitialEnd] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const duration = Math.max(totalDuration, 1);
  const selectedDuration = Math.max(0, trimEndSec - trimStartSec);

  // Initialize Audio Source
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    extractAudioPeaks(file, NUM_BARS).then(setPeaks);

    return () => {
      URL.revokeObjectURL(url);
      setAudioUrl(null);
    };
  }, [file]);

  // Audio Playback Listener
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);

      if (cur >= trimEndSec) {
        if (isLooping) {
          audio.currentTime = trimStartSec;
          audio.play().catch(() => {});
        } else {
          audio.pause();
          setIsPlaying(false);
          audio.currentTime = trimStartSec;
          setCurrentTime(trimStartSec);
        }
      }
    };

    const handleEnded = () => {
      if (isLooping) {
        audio.currentTime = trimStartSec;
        audio.play().catch(() => {});
      } else {
        setIsPlaying(false);
        setCurrentTime(trimStartSec);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [trimStartSec, trimEndSec, isLooping]);

  // Toggle Audition Playback
  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audio.currentTime < trimStartSec || audio.currentTime >= trimEndSec) {
        audio.currentTime = trimStartSec;
      }
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Playback error:", err));
    }
  };

  // Canvas Drawing
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const barData = peaks.length > 0 ? peaks : generateFallbackPeaks(NUM_BARS, 12345);
    const barCount = barData.length;
    const barSpacing = 2;
    const totalSpacing = (barCount - 1) * barSpacing;
    const barWidth = Math.max(1.5, (width - totalSpacing) / barCount);

    const startX = (trimStartSec / duration) * width;
    const endX = (trimEndSec / duration) * width;
    const playheadX = (currentTime / duration) * width;

    // Draw Excluded Shading (Left)
    if (startX > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(0, 0, startX, height);
    }

    // Draw Excluded Shading (Right)
    if (endX < width) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(endX, 0, width - endX, height);
    }

    // Draw Selected Window Glow
    const glowGradient = ctx.createLinearGradient(startX, 0, endX, 0);
    glowGradient.addColorStop(0, "rgba(147, 51, 234, 0.08)");
    glowGradient.addColorStop(1, "rgba(59, 130, 246, 0.08)");
    ctx.fillStyle = glowGradient;
    ctx.fillRect(startX, 0, Math.max(0, endX - startX), height);

    // Draw Waveform Bars
    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + barSpacing);
      const barPeak = barData[i];
      const barHeight = Math.max(4, barPeak * (height - 18));
      const y = (height - barHeight) / 2;

      const isInsideTrim = x + barWidth >= startX && x <= endX;

      if (isInsideTrim) {
        // Gradient for selected segment
        const barGrad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        barGrad.addColorStop(0, "#a855f7"); // purple-500
        barGrad.addColorStop(1, "#3b82f6"); // blue-500
        ctx.fillStyle = barGrad;
      } else {
        // Dimmed for excluded audio
        ctx.fillStyle = "rgba(100, 116, 139, 0.28)"; // slate-500 dim
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }

    // Draw Playhead
    if (isPlaying && playheadX >= startX && playheadX <= endX) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead top tip
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(playheadX, 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Start Handle Line
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.stroke();

    // Draw End Handle Line
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();

    ctx.restore();
  }, [peaks, trimStartSec, trimEndSec, duration, currentTime, isPlaying]);

  useEffect(() => {
    let animId: number;
    const render = () => {
      drawWaveform();
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [drawWaveform]);

  // Handle Drag Events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const container = containerRef.current;
    if (!container) return;

    container.setPointerCapture(e.pointerId);
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    const startX = (trimStartSec / duration) * width;
    const endX = (trimEndSec / duration) * width;

    const HANDLE_HIT_RADIUS = 16;

    if (Math.abs(x - startX) <= HANDLE_HIT_RADIUS) {
      setDragState("start");
    } else if (Math.abs(x - endX) <= HANDLE_HIT_RADIUS) {
      setDragState("end");
    } else if (x > startX && x < endX) {
      setDragState("window");
      setDragStartX(e.clientX);
      setDragInitialStart(trimStartSec);
      setDragInitialEnd(trimEndSec);
    } else {
      // Direct jump/reposition
      const clickedTime = Math.min(
        duration,
        Math.max(0, (x / width) * duration)
      );
      if (clickedTime < trimStartSec) {
        onTrimChange(Math.round(clickedTime * 10) / 10, trimEndSec);
      } else if (clickedTime > trimEndSec) {
        onTrimChange(trimStartSec, Math.round(clickedTime * 10) / 10);
      } else {
        if (audioRef.current) {
          audioRef.current.currentTime = clickedTime;
          setCurrentTime(clickedTime);
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || disabled) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const width = rect.width;
    const timeAtCursor = (x / width) * duration;

    if (dragState === "start") {
      const newStart = Math.min(
        Math.max(0, timeAtCursor),
        trimEndSec - 0.5
      );
      onTrimChange(Math.round(newStart * 10) / 10, trimEndSec);
    } else if (dragState === "end") {
      const newEnd = Math.max(
        Math.min(duration, timeAtCursor),
        trimStartSec + 0.5
      );
      onTrimChange(trimStartSec, Math.round(newEnd * 10) / 10);
    } else if (dragState === "window") {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = (deltaX / width) * duration;
      const windowLen = dragInitialEnd - dragInitialStart;

      let newStart = dragInitialStart + deltaTime;
      let newEnd = dragInitialEnd + deltaTime;

      if (newStart < 0) {
        newStart = 0;
        newEnd = windowLen;
      } else if (newEnd > duration) {
        newEnd = duration;
        newStart = duration - windowLen;
      }

      onTrimChange(
        Math.round(newStart * 10) / 10,
        Math.round(newEnd * 10) / 10
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragState && containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
    setDragState(null);
  };

  // Quick Preset Chips
  const handleApplyPreset = (preset: "all" | "first30" | "last30" | "center60") => {
    if (preset === "all") {
      onTrimChange(0, Math.round(duration * 10) / 10);
    } else if (preset === "first30") {
      onTrimChange(0, Math.min(duration, 30));
    } else if (preset === "last30") {
      onTrimChange(Math.max(0, duration - 30), duration);
    } else if (preset === "center60") {
      const center = duration / 2;
      onTrimChange(Math.max(0, center - 30), Math.min(duration, center + 30));
    }
  };

  // Fine-tuning adjustments (+/- 1s)
  const stepStart = (delta: number) => {
    const next = Math.max(0, Math.min(trimStartSec + delta, trimEndSec - 0.5));
    onTrimChange(Math.round(next * 10) / 10, trimEndSec);
  };

  const stepEnd = (delta: number) => {
    const next = Math.min(
      duration,
      Math.max(trimEndSec + delta, trimStartSec + 0.5)
    );
    onTrimChange(trimStartSec, Math.round(next * 10) / 10);
  };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#0d1322]/80 p-5 space-y-4 shadow-xl">
      {/* Hidden Audio Element for Preview */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          muted={isMuted}
          playsInline
          className="hidden"
        />
      )}

      {/* Header Bar with Segment Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-neutral-200 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Scissors className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>Interactive Waveform Trimmer</span>
              <span className="text-[10px] text-purple-400 bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.2 rounded-md font-normal">
                Audio Preview
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono text-purple-300 bg-purple-950/40 border border-purple-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-purple-400" />
            <span>
              {formatDuration(trimStartSec)} – {formatDuration(trimEndSec)}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-white font-semibold">
              {formatDuration(selectedDuration)}
            </span>
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleApplyPreset("all")}
            className="h-7 px-2 text-[11px] text-slate-400 hover:text-white"
            title="Reset to full length"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* Interactive Waveform Canvas Container */}
      <div className="space-y-1">
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative h-28 w-full rounded-xl bg-black border border-neutral-800 overflow-hidden cursor-crosshair select-none ${
            disabled ? "opacity-50 pointer-events-none" : ""
          }`}
          title="Drag handles or click to set trim range"
        >
          <canvas ref={canvasRef} className="h-full w-full block" />

          {/* Left Trim Handle Button Indicator */}
          <div
            style={{ left: `${(trimStartSec / duration) * 100}%` }}
            className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col justify-between items-center pointer-events-none z-10"
          >
            <div className="h-5 px-1.5 bg-purple-600 rounded-b-md text-[9px] font-mono font-bold text-white shadow-md shadow-purple-900/60 flex items-center justify-center">
              {formatDuration(trimStartSec)}
            </div>
            <div className="h-4 w-4 rounded-full bg-purple-500 border-2 border-white shadow-lg -mb-1 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
          </div>

          {/* Right Trim Handle Button Indicator */}
          <div
            style={{ left: `${(trimEndSec / duration) * 100}%` }}
            className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col justify-between items-center pointer-events-none z-10"
          >
            <div className="h-5 px-1.5 bg-blue-600 rounded-b-md text-[9px] font-mono font-bold text-white shadow-md shadow-blue-900/60 flex items-center justify-center">
              {formatDuration(trimEndSec)}
            </div>
            <div className="h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-lg -mb-1 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
          </div>
        </div>

        {/* Timeline Axis Ticks */}
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 px-1 pt-0.5">
          <span>00:00</span>
          <span>{formatDuration(duration * 0.25)}</span>
          <span>{formatDuration(duration * 0.5)}</span>
          <span>{formatDuration(duration * 0.75)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Audition Toolbar & Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="gradient"
            size="sm"
            onClick={handleTogglePlay}
            disabled={disabled || selectedDuration <= 0}
            className="h-8 gap-1.5 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 fill-white" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-white ml-0.5" />
            )}
            <span>{isPlaying ? "Pause Audition" : "Play Selection"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsLooping(!isLooping)}
            className={`h-8 px-2 text-xs gap-1 border-slate-800 ${
              isLooping
                ? "bg-purple-950/40 text-purple-300 border-purple-500/40"
                : "text-slate-400 hover:text-white"
            }`}
            title={isLooping ? "Looping enabled" : "Looping disabled"}
          >
            <Repeat className="h-3.5 w-3.5" />
            <span className="text-[11px]">Loop</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-rose-400" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Preset Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-500 text-[10px] mr-1 hidden sm:inline flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-purple-400" /> Presets:
          </span>
          <button
            type="button"
            onClick={() => handleApplyPreset("first30")}
            className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            First 30s
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset("last30")}
            className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            Last 30s
          </button>
          {duration > 70 && (
            <button
              type="button"
              onClick={() => handleApplyPreset("center60")}
              className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            >
              Center 60s
            </button>
          )}
        </div>
      </div>

      {/* Fine-Tuning Numeric Adjustment Steppers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
        {/* Start Position Stepper */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] text-purple-400 font-medium block">
              Trim Start
            </span>
            <span className="text-sm font-mono font-semibold text-white">
              {formatDuration(trimStartSec)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => stepStart(-1)}
              disabled={trimStartSec <= 0}
              className="h-7 w-7 rounded-lg bg-black border border-neutral-800 text-slate-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 flex items-center justify-center text-xs font-mono"
              title="-1 second"
            >
              -1s
            </button>
            <button
              type="button"
              onClick={() => stepStart(1)}
              disabled={trimStartSec >= trimEndSec - 1}
              className="h-7 w-7 rounded-lg bg-black border border-neutral-800 text-slate-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 flex items-center justify-center text-xs font-mono"
              title="+1 second"
            >
              +1s
            </button>
          </div>
        </div>

        {/* End Position Stepper */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] text-blue-400 font-medium block">
              Trim End
            </span>
            <span className="text-sm font-mono font-semibold text-white">
              {formatDuration(trimEndSec)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => stepEnd(-1)}
              disabled={trimEndSec <= trimStartSec + 1}
              className="h-7 w-7 rounded-lg bg-black border border-neutral-800 text-slate-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 flex items-center justify-center text-xs font-mono"
              title="-1 second"
            >
              -1s
            </button>
            <button
              type="button"
              onClick={() => stepEnd(1)}
              disabled={trimEndSec >= duration}
              className="h-7 w-7 rounded-lg bg-black border border-neutral-800 text-slate-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 flex items-center justify-center text-xs font-mono"
              title="+1 second"
            >
              +1s
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
