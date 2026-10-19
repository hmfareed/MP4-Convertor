import Link from "next/link";
import { FileQuestion, ArrowLeft, Home, History } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
        {/* Glow & Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-2xl" />
          <div className="relative h-20 w-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xl">
            <FileQuestion className="h-10 w-10" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            404
          </h1>
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
            Page or Resource Not Found
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
            The link you followed may be broken, expired according to our privacy retention policy, or the page has moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-md hover:shadow-blue-500/25 active:scale-95"
          >
            <Home className="h-4 w-4" />
            <span>Go to Converter</span>
          </Link>

          <Link
            href="/conversions"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium text-sm transition-all active:scale-95 border border-neutral-300 dark:border-neutral-700"
          >
            <History className="h-4 w-4" />
            <span>My Conversions</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
