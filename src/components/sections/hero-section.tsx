import React from "react";

export function HeroSection() {
  return (
    <section className="text-center pt-8 pb-6 px-4 max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/80 text-neutral-700 dark:text-neutral-300 text-xs font-semibold mb-4 shadow-sm backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
        <span>Audiq High-Fidelity Converter</span>
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-4">
        MP4 to{" "}
        <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-600 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">
          MP3
        </span>{" "}
        Converter
      </h1>
      <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl mx-auto">
        Easily convert your MP4 videos to high-quality MP3 audio files.
        <br className="hidden sm:inline" /> Fast, secure, and simple.
      </p>
    </section>
  );
}
