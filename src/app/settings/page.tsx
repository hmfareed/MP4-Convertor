"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  LogOut,
  Trash2,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Sliders,
  Lock,
  Music,
  Download,
  AlertCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BITRATE_OPTIONS, FORMAT_OPTIONS } from "@/lib/constants";
import { AudioBitrate, OutputFormat } from "@/types/conversion";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  defaultBitrate: number;
  defaultFormat: OutputFormat;
  autoDownload: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Conversion Preferences state
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>("mp3");
  const [selectedBitrate, setSelectedBitrate] = useState<number>(192);
  const [autoDownload, setAutoDownload] = useState<boolean>(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login?redirect=/settings");
        } else {
          setUser(data.user);
          setSelectedFormat(data.user.defaultFormat || "mp3");
          setSelectedBitrate(data.user.defaultBitrate || 192);
          setAutoDownload(!!data.user.autoDownload);
        }
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    setPrefsSuccess(null);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultFormat: selectedFormat,
          defaultBitrate: selectedBitrate,
          autoDownload,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to update preferences.");
      }

      setPrefsSuccess("Preferences saved successfully!");
      setTimeout(() => setPrefsSuccess(null), 3000);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update password.");
      }

      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(null), 3500);
    } catch (err: unknown) {
      setPasswordError((err as Error).message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-3xl space-y-6">
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-neutral-400 hover:text-white">
          <Link href="/conversions">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Conversions</span>
          </Link>
        </Button>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Account & Conversion Settings
        </h1>
        <p className="text-sm text-neutral-400">
          Manage your default conversion formats, download preferences, and account security.
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl border border-neutral-800 bg-[#0d1424] p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-md">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{user.name}</h3>
            <p className="text-xs text-neutral-400">{user.email}</p>
          </div>
        </div>

        <span className="text-xs font-mono uppercase bg-neutral-900 border border-neutral-800 text-neutral-400 px-2.5 py-1 rounded-full">
          {user.role}
        </span>
      </div>

      {/* 1. Default Conversion Preferences */}
      <form onSubmit={handleSavePreferences} className="rounded-2xl border border-neutral-800 bg-[#0d1322]/80 p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Default Conversion Preferences</h3>
          </div>

          {prefsSuccess && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{prefsSuccess}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Default Format */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Default Output Format</label>
            <Select value={selectedFormat} onValueChange={(val) => setSelectedFormat(val as OutputFormat)}>
              <SelectTrigger className="h-10 bg-neutral-900 border-neutral-800 text-white">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent side="bottom" className="bg-neutral-900 border-neutral-800">
                {FORMAT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label} ({f.badge})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Bitrate */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Default Audio Bitrate</label>
            <Select value={selectedBitrate.toString()} onValueChange={(val) => setSelectedBitrate(parseInt(val, 10))}>
              <SelectTrigger className="h-10 bg-neutral-900 border-neutral-800 text-white">
                <SelectValue placeholder="Select bitrate" />
              </SelectTrigger>
              <SelectContent side="bottom" className="bg-neutral-900 border-neutral-800">
                {BITRATE_OPTIONS.map((b) => (
                  <SelectItem key={b.value} value={b.value.toString()}>
                    {b.label} — {b.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Auto Download Toggle */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3.5 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-white">Automatic Browser Download</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Instantly trigger file download in your browser when single conversions finish.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAutoDownload(!autoDownload)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autoDownload ? "bg-blue-600 shadow-sm shadow-blue-600/50" : "bg-neutral-800"
            }`}
            role="switch"
            aria-checked={autoDownload}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autoDownload ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="sm"
          disabled={isSavingPrefs}
          className="gap-2 h-9 text-xs bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white"
        >
          {isSavingPrefs ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span>Save Preferences</span>
        </Button>
      </form>

      {/* 2. Security & Password Update */}
      <form onSubmit={handleChangePassword} className="rounded-2xl border border-neutral-800 bg-[#0d1322]/80 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Security & Password</h3>
          </div>
        </div>

        {passwordError && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <div className="space-y-3 max-w-md">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-300">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-neutral-800 bg-neutral-900 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-300">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-neutral-800 bg-neutral-900 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-300">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-neutral-800 bg-neutral-900 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={isChangingPassword || !currentPassword || !newPassword}
            className="gap-2 h-9 text-xs border-neutral-700 text-neutral-200 hover:text-white"
          >
            {isChangingPassword ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            <span>Update Password</span>
          </Button>
        </div>
      </form>

      {/* Retention Policy */}
      <div className="rounded-xl border border-neutral-800 bg-[#0d1424] p-5 space-y-2 text-xs">
        <h4 className="font-semibold text-white text-sm">File Retention Policy</h4>
        <p className="text-neutral-400 leading-relaxed">
          As a registered user, your converted audio files remain accessible for download in your dashboard for{" "}
          <span className="text-purple-300 font-semibold">7 days</span> (168 hours), after which they are permanently deleted in accordance with our storage privacy policy.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleLogout}
          className="w-full sm:w-auto gap-2 text-neutral-300 hover:text-white border-neutral-800"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="default"
          onClick={() => alert("To delete your account and associated media, please contact privacy support.")}
          className="w-full sm:w-auto text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 text-xs gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete Account</span>
        </Button>
      </div>
    </div>
  );
}
