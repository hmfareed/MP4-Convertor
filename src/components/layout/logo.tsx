import React from "react";
import Link from "next/link";
import { Music2, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const iconSizes = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg",
        className
      )}
      aria-label="MP4 to MP3 Converter Home"
    >
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 p-0.5 shadow-md shadow-purple-900/30 group-hover:shadow-purple-700/50 transition-all duration-200",
          iconSizes[size]
        )}
      >
        <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0c101c]/90 relative overflow-hidden">
          <Film className="h-4 w-4 text-purple-400 absolute -bottom-1 -left-1 opacity-40 transform -rotate-12" />
          <Music2 className="h-4 w-4 text-white relative z-10 drop-shadow" />
        </div>
      </div>
      <span
        className={cn(
          "font-bold tracking-tight text-white transition-colors group-hover:text-slate-100",
          textSizes[size]
        )}
      >
        MP4 to MP3
      </span>
    </Link>
  );
}
