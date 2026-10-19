"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors to client console or monitoring service (e.g. Sentry/Datadog)
    console.error("[Audiq Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
        {/* Glow & Alert Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 bg-red-500/20 dark:bg-red-500/10 rounded-full blur-2xl" />
          <div className="relative h-20 w-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-500 shadow-xl">
            <AlertTriangle className="h-10 w-10" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
            An unexpected error occurred while loading this page. Your files and account data remain completely safe.
          </p>
          {error?.digest && (
            <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-600">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-md hover:shadow-blue-500/25 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium text-sm transition-all active:scale-95 border border-neutral-300 dark:border-neutral-700"
          >
            <Home className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
