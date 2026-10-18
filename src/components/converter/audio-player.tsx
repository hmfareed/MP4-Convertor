"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  FastForward,
  Rewind,
  Gauge,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

interface AudioPlayerProps {
  src?: string;
  duration?: number;
  title?: string;
  className?: string;
}

const BAR_COUNT = 75;
const PLAYBACK_SPEEDS = [1.0, 1.25, 1.5, 2.0];

// Fallback aesthetic waveform generator if real audio is loading or mock
function generateFallbackPeaks(count: number): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    const progress = i / count;
    // Layered sines to look like natural speech/music tracks
    const v1 = Math.sin(progress * Math.PI * 4);
    const v2 = Math.cos(progress * Math.PI * 9) * 0.5;
    const v3 = Math.sin(progress * Math.PI * 18) * 0.25;
    const envelope = Math.sin(progress * Math.PI); // fade in and out at ends
    const raw = Math.abs(v1 + v2 + v3) * envelope;
    peaks.push(Math.max(0.18, Math.min(1.0, raw * 0.7 + 0.15)));
  }
  return peaks;
}

export function AudioPlayer({
  src,
  duration = 0,
  title,
  className = "",
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [playbackSpeedIdx, setPlaybackSpeedIdx] = useState(0);
  const [peaks, setPeaks] = useState<number[]>(() => generateFallbackPeaks(BAR_COUNT));
  const [isLoadingPeaks, setIsLoadingPeaks] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; time: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 1. Decode real audio peaks if audio URL is provided
  useEffect(() => {
    if (!src || src.startsWith("#") || src.startsWith("demo_")) {
      setPeaks(generateFallbackPeaks(BAR_COUNT));
      return;
    }

    let isCancelled = false;
    setIsLoadingPeaks(true);

    const extractPeaks = async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error("Fetch failed");
        const arrayBuffer = await res.arrayBuffer();

        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) throw new Error("AudioContext unsupported");

        const audioCtx = new AudioCtx();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        if (isCancelled) return;

        const channelData = audioBuffer.getChannelData(0);
        const step = Math.floor(channelData.length / BAR_COUNT);
        const decodedPeaks: number[] = [];

        for (let i = 0; i < BAR_COUNT; i++) {
          let max = 0;
          const start = i * step;
          const end = Math.min(start + step, channelData.length);
          for (let j = start; j < end; j += 4) {
            const val = Math.abs(channelData[j]);
            if (val > max) max = val;
          }
          decodedPeaks.push(max);
        }

        // Normalize
        const peakMax = Math.max(0.01, ...decodedPeaks);
        const normalized = decodedPeaks.map((p) => Math.max(0.12, Math.min(1.0, p / peakMax)));

        if (!isCancelled) {
          setPeaks(normalized);
          if (audioBuffer.duration && audioBuffer.duration > 0) {
            setAudioDuration(audioBuffer.duration);
          }
        }

        audioCtx.close().catch(() => {});
      } catch {
        // Fallback to organic synthetic waveform
        if (!isCancelled) {
          setPeaks(generateFallbackPeaks(BAR_COUNT));
        }
      } finally {
        if (!isCancelled) setIsLoadingPeaks(false);
      }
    };

    extractPeaks();

    return () => {
      isCancelled = true;
    };
  }, [src]);

  // 2. Audio playback events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  // 3. Draw high-fidelity interactive waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const effectiveDuration = audioDuration || duration || 1;
    const progress = Math.min(1, Math.max(0, currentTime / effectiveDuration));

    const totalBars = peaks.length;
    const gap = 2.5;
    const totalGap = gap * (totalBars - 1);
    const barWidth = Math.max(2, (rect.width - totalGap) / totalBars);
    const centerY = rect.height / 2;
    const maxBarHeight = rect.height * 0.88;

    peaks.forEach((peak, i) => {
      const x = i * (barWidth + gap);
      const barRatio = (i + 0.5) / totalBars;
      const isPlayed = barRatio <= progress;

      // Dynamic subtle bounce while playing
      let animatedPeak = peak;
      if (isPlaying && isPlayed) {
        const waveOsc = Math.sin((currentTime * 8) + i * 0.4) * 0.08;
        animatedPeak = Math.max(0.15, Math.min(1.0, peak + waveOsc));
      }

      const barHeight = Math.max(4, animatedPeak * maxBarHeight);
      const y = centerY - barHeight / 2;

      // Color gradients
      if (isPlayed) {
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, "#38bdf8"); // Sky cyan
        grad.addColorStop(0.5, "#3b82f6"); // Vibrant blue
        grad.addColorStop(1, "#1d4ed8"); // Deep blue
        ctx.fillStyle = grad;
        ctx.shadowColor = "rgba(59, 130, 246, 0.4)";
        ctx.shadowBlur = 4;
      } else {
        ctx.fillStyle = "#262626"; // AMOLED neutral-800
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }

      // Draw rounded bar
      ctx.beginPath();
      const radius = barWidth / 2;
      ctx.roundRect ? ctx.roundRect(x, y, barWidth, barHeight, radius) : ctx.rect(x, y, barWidth, barHeight);
      ctx.fill();
    });

    // Draw hover cursor guide if hovering
    if (hoverPosition) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(hoverPosition.x, 4);
      ctx.lineTo(hoverPosition.x, rect.height - 4);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [peaks, currentTime, audioDuration, duration, isPlaying, hoverPosition]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Request animation frame loop when playing for smooth pulse
  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;

    const loop = () => {
      drawWaveform();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, drawWaveform]);

  // Seeking & mouse handlers
  const seekToPosition = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const effectiveDuration = audioDuration || duration || 1;
    const targetTime = ratio * effectiveDuration;

    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    seekToPosition(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const effectiveDuration = audioDuration || duration || 1;
    setHoverPosition({ x, time: ratio * effectiveDuration });

    if (isDragging) {
      seekToPosition(e.clientX);
    }
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Playback control functions
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const skipSeconds = (seconds: number) => {
    if (!audioRef.current) return;
    const effectiveDuration = audioDuration || duration || 1;
    const targetTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, effectiveDuration));
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const cycleSpeed = () => {
    const nextIdx = (playbackSpeedIdx + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackSpeedIdx(nextIdx);
    const speed = PLAYBACK_SPEEDS[nextIdx];
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const effectiveDuration = audioDuration || duration || 1;
  const currentSpeed = PLAYBACK_SPEEDS[playbackSpeedIdx];

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-2xl border border-neutral-800/90 bg-black p-4 sm:p-5 space-y-4 shadow-2xl relative select-none ${className}`}
    >
      {/* Hidden audio element if real audio URL provided */}
      {src && <audio ref={audioRef} src={src} preload="metadata" />}

      {/* Top Track Header (if title provided) */}
      {title && (
        <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 ${isPlaying ? "" : "hidden"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? "bg-blue-500" : "bg-neutral-600"}`} />
            </span>
            <span className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-mono">
            <Sparkles className="h-3 w-3 text-blue-400" />
            <span>Interactive Waveform</span>
          </div>
        </div>
      )}

      {/* Interactive Waveform Canvas Container */}
      <div className="relative pt-1">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          className="w-full h-20 sm:h-24 cursor-pointer rounded-xl bg-neutral-950/60 border border-neutral-900/80 p-2 touch-none"
        />

        {/* Hover Time Tooltip */}
        {hoverPosition && (
          <div
            className="absolute top-0 -translate-y-full -translate-x-1/2 pointer-events-none bg-neutral-900 text-white border border-neutral-700 px-2 py-0.5 rounded text-[10px] font-mono shadow-lg transition-transform"
            style={{ left: `${hoverPosition.x}px` }}
          >
            {formatDuration(hoverPosition.time)}
          </div>
        )}

        {/* Loading Indicator Pill */}
        {isLoadingPeaks && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/80 border border-neutral-800 text-[10px] px-2 py-0.5 rounded-full text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
            <span>Analyzing Peaks...</span>
          </div>
        )}
      </div>

      {/* Primary Control Deck */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-2">
          {/* Main Play / Pause Button */}
          <Button
            type="button"
            size="icon"
            onClick={togglePlay}
            className="h-11 w-11 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-950/60 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-600 active:scale-95 transition-all flex-shrink-0"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-white" />
            ) : (
              <Play className="h-5 w-5 fill-white ml-0.5" />
            )}
          </Button>

          {/* Skip Backwards 5s */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => skipSeconds(-5)}
            className="h-9 w-9 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl"
            title="Rewind 5 seconds"
          >
            <Rewind className="h-4 w-4" />
          </Button>

          {/* Skip Forwards 5s */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => skipSeconds(5)}
            className="h-9 w-9 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl"
            title="Forward 5 seconds"
          >
            <FastForward className="h-4 w-4" />
          </Button>

          {/* Restart */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
                if (!isPlaying) {
                  audioRef.current.play().catch(() => {});
                  setIsPlaying(true);
                }
              }
            }}
            className="h-9 w-9 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl"
            title="Restart from beginning"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Digital Time Readout */}
        <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
          <span className="font-bold text-white text-sm">
            {formatDuration(currentTime)}
          </span>
          <span className="text-neutral-600">/</span>
          <span>{formatDuration(effectiveDuration)}</span>
        </div>

        {/* Secondary Controls: Speed & Volume */}
        <div className="flex items-center gap-3">
          {/* Speed Selector Pill */}
          <button
            type="button"
            onClick={cycleSpeed}
            className="px-2.5 py-1 rounded-lg border border-neutral-800 bg-neutral-900/80 text-[11px] font-mono font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="Toggle playback speed"
          >
            <Gauge className="h-3 w-3 text-blue-400" />
            <span>{currentSpeed}x</span>
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-neutral-300" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Named export WaveformPlayer alias for semantic clarity
export { AudioPlayer as WaveformPlayer };
