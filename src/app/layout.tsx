import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Audiq — Fast, Secure MP4 to MP3 Audio Converter",
  description:
    "Easily extract crystal-clear MP3 audio from MP4 videos with Audiq. Fast background processing, configurable bitrates, audio trimming, and privacy-first temporary storage.",
  keywords: ["audiq", "mp4 to mp3", "audio converter", "video to audio", "mp3 extractor", "audio trimming", "ffmpeg audio"],
  icons: {
    icon: "/audiq-icon.png",
    apple: "/audiq-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.className} min-h-screen flex flex-col bg-[#080c14] text-slate-100`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
