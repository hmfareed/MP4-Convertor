import React from "react";

export function HeroSection() {
  return (
    <section className="text-center pt-8 pb-6 px-4 max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold mb-4 shadow-sm shadow-purple-900/20">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
        <span>Audiq High-Fidelity Converter</span>
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
        MP4 to{" "}
        <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
          MP3
        </span>{" "}
        Converter
      </h1>
      <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-xl mx-auto">
        Easily convert your MP4 videos to high-quality MP3 audio files.
        <br className="hidden sm:inline" /> Fast, secure, and simple.
      </p>
    </section>
  );
}
