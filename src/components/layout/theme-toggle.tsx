"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * System theme icon matching user specification:
 * Circular outline with filled right-half semi-circle.
 */
function SystemThemeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 18a6 6 0 0 0 0-12v12z" fill="currentColor" />
    </svg>
  );
}

/**
 * Pixel-accurate Light Mode miniature window preview matching the UI design:
 * - Rounded window outline
 * - Header bar with 3 tabs on the left and a blue primary tab on the right
 * - Empty left sidebar
 * - Right content pane with pill badge and 4 placeholder text lines
 */
function LightPreview() {
  return (
    <svg
      width="54"
      height="38"
      viewBox="0 0 64 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 rounded-[5px] shadow-sm"
    >
      {/* Background & outer border */}
      <rect x="0.5" y="0.5" width="63" height="45" rx="5" fill="#FFFFFF" stroke="#D1D5DB" />

      {/* Top Header Bar Divider */}
      <line x1="0" y1="11" x2="64" y2="11" stroke="#E5E7EB" strokeWidth="1" />

      {/* Header Tabs (Left: 3 gray rounded pill tabs) */}
      <rect x="5" y="4.5" width="8" height="2.5" rx="1.25" fill="#D1D5DB" />
      <rect x="15.5" y="4.5" width="8" height="2.5" rx="1.25" fill="#D1D5DB" />
      <rect x="26" y="4.5" width="8" height="2.5" rx="1.25" fill="#D1D5DB" />

      {/* Header Tab (Right: Blue active accent tab) */}
      <rect x="50" y="4.5" width="9" height="2.5" rx="1.25" fill="#1A73E8" />

      {/* Sidebar vertical divider */}
      <line x1="18" y1="11" x2="18" y2="46" stroke="#E5E7EB" strokeWidth="1" />

      {/* Main Content Area */}
      {/* Pill header/badge */}
      <rect x="23" y="16" width="16" height="5" rx="2.5" fill="#80868B" />

      {/* 4 horizontal content lines */}
      <rect x="23" y="25" width="34" height="2.5" rx="1.25" fill="#E5E7EB" />
      <rect x="23" y="30" width="34" height="2.5" rx="1.25" fill="#E5E7EB" />
      <rect x="23" y="35" width="34" height="2.5" rx="1.25" fill="#E5E7EB" />
      <rect x="23" y="40" width="20" height="2.5" rx="1.25" fill="#E5E7EB" />
    </svg>
  );
}

/**
 * Pixel-accurate Dark Mode miniature window preview matching the UI design
 */
function DarkPreview() {
  return (
    <svg
      width="54"
      height="38"
      viewBox="0 0 64 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 rounded-[5px] shadow-sm"
    >
      {/* Background & outer border */}
      <rect x="0.5" y="0.5" width="63" height="45" rx="5" fill="#13171F" stroke="#2D3748" />

      {/* Top Header Bar Divider */}
      <line x1="0" y1="11" x2="64" y2="11" stroke="#262E3D" strokeWidth="1" />

      {/* Header Tabs (Left: 3 dark pill tabs) */}
      <rect x="5" y="4.5" width="8" height="2.5" rx="1.25" fill="#2D3748" />
      <rect x="15.5" y="4.5" width="8" height="2.5" rx="1.25" fill="#2D3748" />
      <rect x="26" y="4.5" width="8" height="2.5" rx="1.25" fill="#2D3748" />

      {/* Header Tab (Right: Blue active accent tab) */}
      <rect x="50" y="4.5" width="9" height="2.5" rx="1.25" fill="#1A73E8" />

      {/* Sidebar vertical divider */}
      <line x1="18" y1="11" x2="18" y2="46" stroke="#262E3D" strokeWidth="1" />

      {/* Main Content Area */}
      {/* Pill header/badge */}
      <rect x="23" y="16" width="16" height="5" rx="2.5" fill="#4A5568" />

      {/* 4 horizontal content lines */}
      <rect x="23" y="25" width="34" height="2.5" rx="1.25" fill="#262E3D" />
      <rect x="23" y="30" width="34" height="2.5" rx="1.25" fill="#262E3D" />
      <rect x="23" y="35" width="34" height="2.5" rx="1.25" fill="#262E3D" />
      <rect x="23" y="40" width="20" height="2.5" rx="1.25" fill="#262E3D" />
    </svg>
  );
}

/**
 * Pixel-accurate "Match browser" (System) split window preview:
 * - Exactly 50% Dark on the left, 50% Light on the right
 * - All lines, tabs, and badges smoothly cross the split
 */
function SystemPreview() {
  return (
    <svg
      width="54"
      height="38"
      viewBox="0 0 64 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 rounded-[5px] shadow-sm"
    >
      <defs>
        <clipPath id="match-browser-left-clip">
          <rect x="0" y="0" width="32" height="46" />
        </clipPath>
        <clipPath id="match-browser-right-clip">
          <rect x="32" y="0" width="32" height="46" />
        </clipPath>
      </defs>

      {/* Left 50%: Dark Mode */}
      <g clipPath="url(#match-browser-left-clip)">
        <rect x="0.5" y="0.5" width="63" height="45" rx="5" fill="#13171F" stroke="#2D3748" />
        <line x1="0" y1="11" x2="64" y2="11" stroke="#262E3D" strokeWidth="1" />
        <rect x="5" y="4.5" width="8" height="2.5" rx="1.25" fill="#2D3748" />
        <rect x="15.5" y="4.5" width="8" height="2.5" rx="1.25" fill="#2D3748" />
        <rect x="26" y="4.5" width="8" height="2.5" rx="1.25" fill="#2D3748" />
        <line x1="18" y1="11" x2="18" y2="46" stroke="#262E3D" strokeWidth="1" />
        <rect x="23" y="16" width="16" height="5" rx="2.5" fill="#4A5568" />
        <rect x="23" y="25" width="34" height="2.5" rx="1.25" fill="#262E3D" />
        <rect x="23" y="30" width="34" height="2.5" rx="1.25" fill="#262E3D" />
        <rect x="23" y="35" width="34" height="2.5" rx="1.25" fill="#262E3D" />
        <rect x="23" y="40" width="20" height="2.5" rx="1.25" fill="#262E3D" />
      </g>

      {/* Right 50%: Light Mode */}
      <g clipPath="url(#match-browser-right-clip)">
        <rect x="0.5" y="0.5" width="63" height="45" rx="5" fill="#FFFFFF" stroke="#D1D5DB" />
        <line x1="0" y1="11" x2="64" y2="11" stroke="#E5E7EB" strokeWidth="1" />
        <rect x="50" y="4.5" width="9" height="2.5" rx="1.25" fill="#1A73E8" />
        <rect x="23" y="16" width="16" height="5" rx="2.5" fill="#80868B" />
        <rect x="23" y="25" width="34" height="2.5" rx="1.25" fill="#E5E7EB" />
        <rect x="23" y="30" width="34" height="2.5" rx="1.25" fill="#E5E7EB" />
        <rect x="23" y="35" width="34" height="2.5" rx="1.25" fill="#E5E7EB" />
        <rect x="23" y="40" width="20" height="2.5" rx="1.25" fill="#E5E7EB" />
      </g>

      {/* Subtle vertical dividing line at 50% split */}
      <line x1="32" y1="0.5" x2="32" y2="45.5" stroke="#374151" strokeWidth="0.75" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? theme : "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900/90 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
          aria-label="Change color theme"
          title="Change theme"
        >
          {!mounted ? (
            <Moon className="h-4 w-4" />
          ) : currentTheme === "light" ? (
            <Sun className="h-4 w-4 text-amber-500" />
          ) : currentTheme === "dark" ? (
            <Moon className="h-4 w-4 text-blue-400" />
          ) : (
            <SystemThemeIcon className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 p-1.5 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-1"
      >
        {/* 1. Light Option */}
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={cn(
            "w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-colors text-left",
            currentTheme === "light"
              ? "bg-[#ebf3fe] dark:bg-blue-950/40"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-900/80"
          )}
        >
          {/* Radio circle */}
          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full flex-shrink-0 transition-colors",
              currentTheme === "light"
                ? "bg-[#1a73e8] border border-[#1a73e8]"
                : "border-2 border-neutral-400 dark:border-neutral-500 bg-transparent"
            )}
          >
            {currentTheme === "light" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
          </div>

          {/* Miniature illustration */}
          <LightPreview />

          {/* Label */}
          <span
            className={cn(
              "text-sm font-medium",
              currentTheme === "light"
                ? "text-[#1a73e8] dark:text-blue-400 font-semibold"
                : "text-neutral-800 dark:text-neutral-200"
            )}
          >
            Light
          </span>
        </button>

        {/* 2. Dark Option */}
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={cn(
            "w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-colors text-left",
            currentTheme === "dark"
              ? "bg-[#ebf3fe] dark:bg-blue-950/40"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-900/80"
          )}
        >
          {/* Radio circle */}
          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full flex-shrink-0 transition-colors",
              currentTheme === "dark"
                ? "bg-[#1a73e8] border border-[#1a73e8]"
                : "border-2 border-neutral-400 dark:border-neutral-500 bg-transparent"
            )}
          >
            {currentTheme === "dark" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
          </div>

          {/* Miniature illustration */}
          <DarkPreview />

          {/* Label */}
          <span
            className={cn(
              "text-sm font-medium",
              currentTheme === "dark"
                ? "text-[#1a73e8] dark:text-blue-400 font-semibold"
                : "text-neutral-800 dark:text-neutral-200"
            )}
          >
            Dark
          </span>
        </button>

        {/* 3. Match Browser Option */}
        <button
          type="button"
          onClick={() => setTheme("system")}
          className={cn(
            "w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-colors text-left",
            currentTheme === "system"
              ? "bg-[#ebf3fe] dark:bg-blue-950/40"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-900/80"
          )}
        >
          {/* Radio circle */}
          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full flex-shrink-0 transition-colors",
              currentTheme === "system"
                ? "bg-[#1a73e8] border border-[#1a73e8]"
                : "border-2 border-neutral-400 dark:border-neutral-500 bg-transparent"
            )}
          >
            {currentTheme === "system" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
          </div>

          {/* Miniature illustration */}
          <SystemPreview />

          {/* Label */}
          <span
            className={cn(
              "text-sm font-medium",
              currentTheme === "system"
                ? "text-[#1a73e8] dark:text-blue-400 font-semibold"
                : "text-neutral-800 dark:text-neutral-200"
            )}
          >
            Match browser
          </span>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
