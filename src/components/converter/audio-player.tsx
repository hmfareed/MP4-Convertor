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
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Activity,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import {
  EQ_BANDS,
  EQ_PRESETS,
  clampGain,
  detectPreset,
  formatGainDb,
  isEqFlat,
  MIN_GAIN_DB,
  MAX_GAIN_DB,
  EqPreset,
} from "@/lib/audio/equalizer";

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
    const v1 = Math.sin(progress * Math.PI * 4);
    const v2 = Math.cos(progress * Math.PI * 9) * 0.5;
    const v3 = Math.sin(progress * Math.PI * 18) * 0.25;
    const envelope = Math.sin(progress * Math.PI);
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

  // Web Audio Equalizer DSP Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);

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

  // Equalizer State
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [gains, setGains] = useState<number[]>([0, 0, 0, 0, 0]);
  const [activePresetId, setActivePresetId] = useState<string>("flat");

  // 1. Initialize Web Audio DSP Chain safely
  const initEqualizer = useCallback(() => {
    if (sourceNodeRef.current || !audioRef.current) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;

      // Create and configure 5 Biquad filters
      const filters = EQ_BANDS.map((band, idx) => {
        const filter = ctx.createBiquadFilter();
        filter.type = band.type;
        filter.frequency.setValueAtTime(band.frequency, ctx.currentTime);
        if (band.q) {
          filter.Q.setValueAtTime(band.q, ctx.currentTime);
        }
        filter.gain.setValueAtTime(gains[idx] || 0, ctx.currentTime);
        return filter;
      });

      filtersRef.current = filters;

      // Connect: audio element source -> band[0] -> ... -> band[4] -> ctx.destination
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      let prevNode: AudioNode = source;
      filters.forEach((filter) => {
        prevNode.connect(filter);
        prevNode = filter;
      });
      prevNode.connect(ctx.destination);
    } catch {
      // Graceful fallback to default native audio if AudioContext or CORS restricted
    }
  }, [gains]);

  // Update specific equalizer band
  const handleGainChange = (bandIndex: number, newGain: number) => {
    initEqualizer();
    const clamped = clampGain(newGain);
    const updatedGains = [...gains];
    updatedGains[bandIndex] = clamped;
    setGains(updatedGains);

    // Apply to Web Audio DSP in real-time
    const filter = filtersRef.current[bandIndex];
    if (filter && audioCtxRef.current) {
      filter.gain.setTargetAtTime(clamped, audioCtxRef.current.currentTime, 0.015);
    }

    setActivePresetId(detectPreset(updatedGains));
  };

  // Apply a sound preset
  const handleApplyPreset = (preset: EqPreset) => {
    initEqualizer();
    setGains([...preset.gains]);
    setActivePresetId(preset.id);

    if (filtersRef.current.length === 5 && audioCtxRef.current) {
      preset.gains.forEach((g, idx) => {
        const filter = filtersRef.current[idx];
        if (filter) {
          filter.gain.setTargetAtTime(g, audioCtxRef.current!.currentTime, 0.02);
        }
      });
    }
  };

  // Reset EQ to flat 0 dB
  const handleResetEq = () => {
    const flat = EQ_PRESETS[0];
    handleApplyPreset(flat);
  };

  // 2. Decode real audio peaks if audio URL is provided
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

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
        const normalized = decodedPeaks.map((p) =>
          Math.max(0.12, Math.min(1.0, p / peakMax))
        );

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

  // 3. Audio playback events
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

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // 4. Draw high-fidelity interactive waveform with dynamic EQ modulation
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

      // Dynamic EQ frequency scaling across waveform bands
      // (low-end on left, high-end on right)
      let eqMultiplier = 1.0;
      if (i < 15) {
        // Sub bass (60Hz)
        eqMultiplier = 1.0 + (gains[0] / 12) * 0.28;
      } else if (i < 30) {
        // Bass (250Hz)
        eqMultiplier = 1.0 + (gains[1] / 12) * 0.22;
      } else if (i < 48) {
        // Mids (1kHz)
        eqMultiplier = 1.0 + (gains[2] / 12) * 0.18;
      } else if (i < 62) {
        // Presence (4kHz)
        eqMultiplier = 1.0 + (gains[3] / 12) * 0.22;
      } else {
        // Treble/Air (16kHz)
        eqMultiplier = 1.0 + (gains[4] / 12) * 0.26;
      }
      eqMultiplier = Math.max(0.4, Math.min(1.4, eqMultiplier));

      let animatedPeak = peak * eqMultiplier;
      if (isPlaying && isPlayed) {
        const waveOsc = Math.sin((currentTime * 8) + i * 0.4) * 0.08;
        animatedPeak = Math.max(0.15, Math.min(1.0, animatedPeak + waveOsc));
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
        ctx.shadowColor = "rgba(59, 130, 246, 0.45)";
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
      ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(hoverPosition.x, 4);
      ctx.lineTo(hoverPosition.x, rect.height - 4);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [peaks, currentTime, audioDuration, duration, isPlaying, hoverPosition, gains]);

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
  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      initEqualizer();
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume().catch(() => {});
      }
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
  const eqIsActive = !isEqFlat(gains);
  const activePreset = EQ_PRESETS.find((p) => p.id === activePresetId);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-2xl border border-neutral-800/90 bg-black p-4 sm:p-5 space-y-4 shadow-2xl relative select-none ${className}`}
    >
      {/* Hidden audio element */}
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          crossOrigin="anonymous"
        />
      )}

      {/* Top Track Header */}
      {title && (
        <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 ${
                  isPlaying ? "" : "hidden"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isPlaying ? "bg-blue-500" : "bg-neutral-600"
                }`}
              />
            </span>
            <span className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
            {eqIsActive && (
              <span className="flex items-center gap-1 text-cyan-400 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-800/60">
                <Activity className="h-2.5 w-2.5 animate-pulse" />
                <span>{activePreset ? activePreset.name : "Custom EQ"}</span>
              </span>
            )}
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-400" />
              <span>Interactive Waveform</span>
            </div>
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
                  initEqualizer();
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

        {/* Secondary Controls: EQ, Speed & Volume */}
        <div className="flex items-center gap-2.5">
          {/* Equalizer Drawer Toggle Pill */}
          <button
            type="button"
            onClick={() => {
              setIsEqOpen(!isEqOpen);
              initEqualizer();
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              isEqOpen || eqIsActive
                ? "bg-blue-950/50 border-cyan-500/70 text-cyan-300 shadow-sm shadow-cyan-900/40"
                : "border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:text-white hover:border-neutral-700"
            }`}
            title="Toggle 5-Band Sound Equalizer"
          >
            <SlidersHorizontal className="h-3 w-3 text-cyan-400" />
            <span>EQ</span>
            {eqIsActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
            {isEqOpen ? (
              <ChevronUp className="h-3 w-3 text-neutral-400" />
            ) : (
              <ChevronDown className="h-3 w-3 text-neutral-400" />
            )}
          </button>

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
              className="w-14 sm:w-16 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>
      </div>

      {/* Expandable 5-Band Equalizer Drawer */}
      {isEqOpen && (
        <div className="pt-3 border-t border-neutral-900 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* EQ Header & Presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white tracking-wide uppercase font-mono">
                5-Band Graphic Equalizer
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                (Web Audio DSP)
              </span>
            </div>

            {/* Reset to Flat Button */}
            <button
              type="button"
              onClick={handleResetEq}
              disabled={!eqIsActive}
              className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors self-start sm:self-auto cursor-pointer ${
                eqIsActive
                  ? "border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900"
                  : "border-neutral-900 text-neutral-600 cursor-not-allowed"
              }`}
              title="Reset all frequencies to 0 dB"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Flat</span>
            </button>
          </div>

          {/* Quick Preset Selector Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {EQ_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  title={preset.description}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border-cyan-400/80 text-cyan-200 shadow-md shadow-blue-950/50"
                      : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
                  }`}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 text-cyan-400" />}
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>

          {/* 5-Band Vertical Graphic Faders */}
          <div className="grid grid-cols-5 gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl bg-neutral-950/80 border border-neutral-900/80">
            {EQ_BANDS.map((band, idx) => {
              const gain = gains[idx] || 0;
              const normalized = (gain - MIN_GAIN_DB) / (MAX_GAIN_DB - MIN_GAIN_DB); // 0 to 1
              const percentage = Math.round(normalized * 100);

              return (
                <div
                  key={band.frequency}
                  className="flex flex-col items-center space-y-2 select-none group"
                >
                  {/* Gain Value Readout */}
                  <span
                    className={`font-mono text-[10px] sm:text-xs font-semibold ${
                      gain > 0
                        ? "text-cyan-400"
                        : gain < 0
                        ? "text-rose-400"
                        : "text-neutral-500"
                    }`}
                  >
                    {formatGainDb(gain)}
                  </span>

                  {/* Vertical Fader Track */}
                  <div className="relative h-28 sm:h-32 w-8 sm:w-10 flex items-center justify-center">
                    {/* Zero Reference Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-neutral-800/80 pointer-events-none" />

                    {/* Fader Track Bar */}
                    <div className="h-full w-2 rounded-full bg-neutral-900 border border-neutral-800 relative overflow-hidden pointer-events-none">
                      {/* Active fill from center 0dB */}
                      {gain > 0 && (
                        <div
                          className="absolute bottom-1/2 left-0 right-0 bg-gradient-to-t from-blue-600 to-cyan-400"
                          style={{
                            height: `${((gain) / MAX_GAIN_DB) * 50}%`,
                          }}
                        />
                      )}
                      {gain < 0 && (
                        <div
                          className="absolute top-1/2 left-0 right-0 bg-gradient-to-b from-rose-500 to-rose-700"
                          style={{
                            height: `${(Math.abs(gain) / Math.abs(MIN_GAIN_DB)) * 50}%`,
                          }}
                        />
                      )}
                    </div>

                    {/* Draggable Vertical Slider Thumb */}
                    <div
                      className="absolute w-6 sm:w-7 h-3 rounded bg-neutral-200 group-hover:bg-white shadow-md border border-neutral-400/50 pointer-events-none transition-transform"
                      style={{
                        bottom: `calc(${percentage}% - 6px)`,
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-3 h-0.5 bg-neutral-700 rounded-full" />
                      </div>
                    </div>

                    {/* Native Invisible Range Input for Full Touch/Mouse & Accessibility */}
                    <input
                      type="range"
                      min={MIN_GAIN_DB}
                      max={MAX_GAIN_DB}
                      step="1"
                      value={gain}
                      onChange={(e) =>
                        handleGainChange(idx, parseInt(e.target.value, 10))
                      }
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full [writing-mode:vertical-lr] [direction:rtl]"
                      aria-label={`${band.label} Gain`}
                    />
                  </div>

                  {/* Frequency Label & Role */}
                  <div className="text-center pt-1">
                    <span className="block text-[11px] sm:text-xs font-mono font-bold text-neutral-300">
                      {band.label}
                    </span>
                    <span className="block text-[9px] text-neutral-500 truncate max-w-[50px] sm:max-w-none">
                      {band.sublabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Named export WaveformPlayer alias for semantic clarity
export { AudioPlayer as WaveformPlayer };
