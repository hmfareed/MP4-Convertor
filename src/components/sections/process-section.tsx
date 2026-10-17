import React from "react";
import { Zap, Settings, Music, ShieldCheck } from "lucide-react";

interface StepItem {
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const steps: StepItem[] = [
  {
    number: "1",
    title: "1. Upload",
    description: "Select your MP4 file from your device or drag & drop it.",
    icon: Zap,
    colorClass: "text-purple-400",
    bgClass: "bg-purple-950/30",
    borderClass: "border-purple-500/30",
  },
  {
    number: "2",
    title: "2. Convert",
    description: "We'll process your file and extract the audio with high fidelity.",
    icon: Settings,
    colorClass: "text-blue-400",
    bgClass: "bg-blue-950/30",
    borderClass: "border-blue-500/30",
  },
  {
    number: "3",
    title: "3. Download",
    description: "Get your MP3 file instantly and enjoy your crystal-clear audio!",
    icon: Music,
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-950/30",
    borderClass: "border-emerald-500/30",
  },
  {
    number: "4",
    title: "100% Secure",
    description: "Private file handling. Temporary storage with automatic 24h deletion.",
    icon: ShieldCheck,
    colorClass: "text-pink-400",
    bgClass: "bg-pink-950/30",
    borderClass: "border-pink-500/30",
  },
];

export function ProcessSection() {
  return (
    <section className="py-12 px-4 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="flex flex-col items-center text-center p-4 rounded-xl transition-all"
            >
              {/* Circular Icon */}
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full border ${step.bgClass} ${step.borderClass} ${step.colorClass} mb-4 shadow-lg`}
              >
                <Icon className="h-6 w-6" />
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-white mb-2">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-[220px]">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
