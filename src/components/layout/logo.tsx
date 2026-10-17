import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  href?: string;
}

export function Logo({
  className,
  size = "md",
  iconOnly = false,
  href = "/",
}: LogoProps) {
  const iconDimensions = {
    sm: { w: 28, h: 28, box: "h-7 w-7", text: "text-base" },
    md: { w: 36, h: 36, box: "h-9 w-9", text: "text-xl" },
    lg: { w: 44, h: 44, box: "h-11 w-11", text: "text-2xl" },
  };

  const dim = iconDimensions[size];

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg transition-transform hover:opacity-95",
        className
      )}
      aria-label="Audiq — Video to Audio Converter"
    >
      <div className={cn("relative flex items-center justify-center flex-shrink-0", dim.box)}>
        <Image
          src="/audiq-icon.png"
          alt="Audiq Logo"
          width={dim.w}
          height={dim.h}
          className="h-full w-full object-contain"
          priority
        />
      </div>

      {!iconOnly && (
        <span
          className={cn(
            "font-extrabold tracking-tight text-neutral-900 dark:text-white transition-colors group-hover:text-neutral-700 dark:group-hover:text-slate-100",
            dim.text
          )}
        >
          Audiq
        </span>
      )}
    </Link>
  );
}
