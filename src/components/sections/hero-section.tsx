import React from "react";

export function HeroSection() {
  return (
    <section className="text-center pt-8 pb-6 px-4 max-w-3xl mx-auto">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-4">
        MP4 to{" "}
        <span className="bg-gradient-to-r from-blue-500 via-blue-500 to-blue-600 dark:from-blue-400 dark:via-blue-400 dark:to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
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
