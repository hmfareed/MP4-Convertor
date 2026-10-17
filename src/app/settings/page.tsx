"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, Trash2, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; defaultBitrate: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login?redirect=/settings");
        } else {
          setUser(data.user);
        }
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-3xl">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-slate-400 hover:text-white">
          <Link href="/conversions">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Conversions</span>
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/80 p-8 shadow-xl space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Account Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your account preferences and data retention settings.
          </p>
        </div>

        {/* Profile Card */}
        <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{user.name}</h3>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Retention Policy */}
        <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5 space-y-2 text-xs">
          <h4 className="font-semibold text-white text-sm">File Retention Period</h4>
          <p className="text-slate-400">
            As a registered user, your converted MP3 files remain accessible for download in your dashboard for <span className="text-purple-300 font-semibold">7 days</span> (168 hours), after which they are permanently deleted in accordance with our storage policy.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={handleLogout}
            className="w-full sm:w-auto gap-2 text-slate-300 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={() => alert("To delete your account, please contact privacy support.")}
            className="w-full sm:w-auto text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 text-xs gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Account</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
