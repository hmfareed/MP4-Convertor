"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

interface AudioPlayerProps {
  src?: string;
  duration?: number;
}

export function AudioPlayer({ src, duration = 0 }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const restartAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const effectiveDuration = audioDuration || duration || 1;
  const progressPercent = (currentTime / effectiveDuration) * 100;

  return (
    <div className="w-full rounded-xl bg-black border border-neutral-800 p-3 sm:p-4 flex flex-col gap-3">
      {/* Hidden audio element if real audio URL provided */}
      {src && <audio ref={audioRef} src={src} preload="metadata" />}

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <Button
          type="button"
          size="icon"
          onClick={togglePlay}
          className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-md shadow-blue-950/60 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-600 active:scale-95 transition-all"
          aria-label={isPlaying ? "Pause audio preview" : "Play audio preview"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>

        {/* Restart Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={restartAudio}
          className="h-8 w-8 text-neutral-400 hover:text-white"
          aria-label="Restart audio preview"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        {/* Track Slider & Time */}
        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min="0"
            max={effectiveDuration}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            aria-label="Seek audio preview"
          />
          <div className="flex justify-between text-[11px] font-mono text-neutral-400">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(effectiveDuration)}</span>
          </div>
        </div>

        {/* Mute Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="h-8 w-8 text-neutral-400 hover:text-white"
          aria-label={isMuted ? "Unmute audio preview" : "Mute audio preview"}
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
