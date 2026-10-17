import React from "react";
import Link from "next/link";
import { ArrowUpRight, Zap, Sliders, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AboutSection() {
  return (
    <section id="about" className="py-16 px-4 max-w-5xl mx-auto scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
          About Audiq
        </h2>
        <p className="text-sm sm:text-base text-slate-400">
          Audiq is a dedicated, high-performance platform engineered for extracting crystal-clear,
          high-fidelity MP3 audio from your MP4 videos with zero unnecessary overhead.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Subsection 1 */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/60 p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Simple Conversion</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Drag and drop your MP4 file or pick it from your device. Our automated pipeline extracts the soundtrack directly, ensuring lossless audio demuxing and crisp MP3 output.
          </p>
        </div>

        {/* Subsection 2 */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/60 p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sliders className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Quality Options</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Select from 5 standard MP3 bitrates (96, 128, 192, 256, or 320 kbps). Choose between space-saving lightweight audio or studio-grade 320 kbps fidelity.
          </p>
        </div>

        {/* Subsection 3 */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/60 p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Privacy-Conscious</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            We never share or analyze your files. Uploaded media is held securely in temporary storage and automatically purged after 24 hours per our strict retention policy.
          </p>
        </div>
      </div>

      {/* Start Converting Call to Action */}
      <div className="text-center">
        <Button asChild variant="gradient" size="lg" className="rounded-xl font-semibold gap-2">
          <Link href="/#converter">
            <span>Start Converting</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
