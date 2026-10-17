import React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-slate-400 hover:text-white">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Converter</span>
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/80 p-8 sm:p-10 shadow-xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-400">
            Last updated: October 2026 • Effective immediately
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">1. Service Description</h2>
            <p>
              MP4 to MP3 provides an online automated utility allowing users to upload MP4 video files and extract audio tracks into MP3 format. The service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">2. Acceptable Use Policy</h2>
            <p>
              You agree not to upload any material that infringes intellectual property rights, contains malicious software, violates privacy rights, or breaches applicable law. You represent and warrant that you own or have obtained all necessary licenses and rights for the media you submit.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">3. Upload Limits & Fair Use</h2>
            <p>
              Individual uploads are subject to a configurable maximum size limit (currently up to 500 MB per file). Automated rate-limiting applies to ensure fair resource allocation across all users.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">4. Availability & Disclaimers</h2>
            <p>
              We reserve the right to modify, suspend, or discontinue the service with or without notice. In no event shall MP4 to MP3 be liable for any direct, indirect, incidental, or consequential damages resulting from the use of the conversion service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
