import React from "react";
import { HeroSection } from "@/components/sections/hero-section";
import { ConverterPanel } from "@/components/converter/converter-panel";
import { ProcessSection } from "@/components/sections/process-section";
import { AboutSection } from "@/components/sections/about-section";
import { FeaturesSection } from "@/components/sections/features-section";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center w-full space-y-4 pb-16">
      {/* 1. Hero Title & Subtitle */}
      <HeroSection />

      {/* 2. Main Converter Card (Focal Point) */}
      <ConverterPanel />

      {/* 3. Three-Step Process & Security Highlights */}
      <ProcessSection />

      {/* 4. About Section */}
      <AboutSection />

      {/* 5. Features Grid */}
      <FeaturesSection />
    </div>
  );
}
