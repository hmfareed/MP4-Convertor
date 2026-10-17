import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MP4 to MP3 Converter — Fast, Secure, and High Quality",
  description:
    "Easily convert your MP4 videos to high-quality MP3 audio files. Fast background processing, configurable bitrates, and privacy-first temporary storage.",
  keywords: ["mp4 to mp3", "audio converter", "video to audio", "mp3 extractor", "ffmpeg audio"],
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
