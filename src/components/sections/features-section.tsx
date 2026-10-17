import React from "react";
import {
  Zap,
  Sliders,
  Shield,
  Download,
  History,
  Smartphone,
} from "lucide-react";

interface FeatureItem {
  title: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
}

const features: FeatureItem[] = [
  {
    title: "Fast Conversion",
    description:
      "High-speed background queue processing powered by FFmpeg and BullMQ delivers reliable, swift audio extraction.",
    icon: Zap,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
    iconBorder: "border-amber-500/20",
  },
  {
    title: "Audio Quality Settings",
    description:
      "Granular bitrate control from 96 kbps up to 320 kbps. Tailor the balance between compact file sizes and high fidelity.",
    icon: Sliders,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
    iconBorder: "border-purple-500/20",
  },
  {
    title: "Private File Handling",
    description:
      "Media is stored in isolated temporary buffers and strictly auto-purged within 24 hours. No unauthorized tracking.",
    icon: Shield,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    iconBorder: "border-emerald-500/20",
  },
  {
    title: "Easy Downloads",
    description:
      "Direct browser audio preview and single-click authorized downloads with clean sanitized MP3 file headers.",
    icon: Download,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10",
    iconBorder: "border-sky-500/20",
  },
  {
    title: "Conversion History",
    description:
      "Convenient access to your recent conversions during your active session, with persistent history for registered users.",
    icon: History,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10",
    iconBorder: "border-rose-500/20",
  },
  {
    title: "Responsive Design",
    description:
      "Meticulously tuned for touch screens, mobile browsers, tablets, laptops, and ultra-wide desktop monitors.",
    icon: Smartphone,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/10",
    iconBorder: "border-indigo-500/20",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 px-4 max-w-5xl mx-auto scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
          Designed for Speed & Simplicity
        </h2>
        <p className="text-sm sm:text-base text-neutral-400">
          Everything you need to convert MP4 videos into high-quality MP3 tracks
          without unnecessary bloat, watermarks, or account walls.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="rounded-2xl border border-neutral-800/80 bg-[#0a0a0a] p-6 transition-all duration-200 hover:border-neutral-700 hover:bg-[#121212] flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.iconBg} ${feature.iconColor} border ${feature.iconBorder} transition-transform group-hover:scale-105`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
