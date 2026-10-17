import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Clock, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
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
            Privacy & Retention Policy
          </h1>
          <p className="text-sm text-slate-400">
            Last updated: October 2026 • Effective immediately
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4 text-center space-y-2">
            <Clock className="h-6 w-6 text-purple-400 mx-auto" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              24-Hour Retention
            </h4>
            <p className="text-xs text-slate-400">
              Uploaded files and generated MP3s are kept for a maximum of 24 hours.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4 text-center space-y-2">
            <Trash2 className="h-6 w-6 text-rose-400 mx-auto" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Automatic Purge
            </h4>
            <p className="text-xs text-slate-400">
              Automated cleanup workers delete expired temporary files from disk.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4 text-center space-y-2">
            <Lock className="h-6 w-6 text-blue-400 mx-auto" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              No Data Mining
            </h4>
            <p className="text-xs text-slate-400">
              We never analyze, sell, train AI models on, or distribute your media.
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">1. File Storage & Processing</h2>
            <p>
              When you upload an MP4 video, the file is saved to an isolated temporary storage directory exclusively to perform audio extraction. We utilize local FFmpeg instances configured with secure sandboxing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">2. Temporary Retention Policy</h2>
            <p>
              Files are not stored permanently. Both the uploaded source video and the generated MP3 file are automatically scheduled for permanent deletion 24 hours after conversion completion. You may also delete your conversion immediately using the delete action in My Conversions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">3. Information Collected</h2>
            <p>
              For guest conversions, no personal identity information is required or logged. Standard diagnostic logs (job IDs, duration, file size, error codes) may be collected for system health and troubleshooting purposes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">4. User Rights</h2>
            <p>
              You have the right to request deletion of your session conversion data at any time. If you have questions regarding this policy, please reach out via our official support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
