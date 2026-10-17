"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Activity,
  Layers,
  Users,
  Sliders,
  Search,
  RotateCcw,
  XCircle,
  Trash2,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDuration } from "@/lib/utils";
import { JobStatus } from "@/types/conversion";

interface MetricsData {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  activeJobs: number;
  totalUsers: number;
  queueWaiting: number;
  queueActive: number;
  avgProcessingSec: number;
  totalStorageBytes: number;
  successRate: number;
}

interface AdminJob {
  id: string;
  ownerType: string;
  originalFilename: string;
  outputFilename?: string;
  sizeBytes: number;
  outputSizeBytes?: number;
  durationSec?: number;
  bitrateKbps: number;
  status: JobStatus;
  attempt: number;
  progress: number;
  errorCode?: string;
  errorMessage?: string;
  processingMs?: number;
  createdAt: string;
  finishedAt?: string;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended" | "deleted";
  createdAt: string;
  lastLoginAt?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "users" | "settings">("overview");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Verify admin role
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        setIsAuthorized(false);
        return;
      }
      const meData = await meRes.json();
      if (!meData.user || meData.user.role !== "admin") {
        setIsAuthorized(false);
        return;
      }
      setIsAuthorized(true);

      // 2. Fetch metrics
      const metricsRes = await fetch("/api/admin/metrics");
      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        setMetrics(mData.metrics);
      }

      // 3. Fetch jobs
      const jobsRes = await fetch(`/api/admin/jobs?search=${encodeURIComponent(jobSearch)}&status=${jobStatusFilter}`);
      if (jobsRes.ok) {
        const jData = await jobsRes.json();
        setJobs(jData.jobs || []);
      }

      // 4. Fetch users
      const usersRes = await fetch("/api/admin/users");
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }
    } catch {
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobStatusFilter]);

  const handleJobRetry = async (jobId: string) => {
    try {
      const res = await fetch(`/api/conversions/${jobId}/retry`, { method: "POST" });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Retry failed.");
      }
    } catch {
      alert("Failed to retry conversion.");
    }
  };

  const handleJobCancel = async (jobId: string) => {
    try {
      const res = await fetch(`/api/conversions/${jobId}/cancel`, { method: "POST" });
      if (res.ok) loadData();
    } catch {
      alert("Failed to cancel job.");
    }
  };

  const handleJobDelete = async (jobId: string) => {
    try {
      const res = await fetch(`/api/conversions/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch {
      alert("Failed to delete job.");
    }
  };

  const handleUserToggleStatus = async (user: AdminUser) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, status: newStatus }),
      });
      if (res.ok) loadData();
    } catch {
      alert("Failed to update user status.");
    }
  };

  const handleUserToggleRole = async (user: AdminUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, role: newRole }),
      });
      if (res.ok) loadData();
    } catch {
      alert("Failed to update user role.");
    }
  };

  if (isAuthorized === false) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center max-w-md">
        <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-xs text-slate-400 mb-6">
          This area requires administrator privileges. Please sign in with your administrator account below.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mb-6">
          <Button asChild variant="gradient" size="sm" className="w-full sm:w-auto">
            <Link href="/login?redirect=/admin">Sign In to Admin Account</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Administration Dashboard</h1>
            <Badge variant="gradient">Admin Mode</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            System health, background BullMQ queues, global jobs, and user management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs text-slate-400 hover:text-white">
            <Link href="/conversions">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all ${
            activeTab === "overview"
              ? "border-purple-500 text-white font-semibold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Activity className="h-4 w-4 text-purple-400" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all ${
            activeTab === "jobs"
              ? "border-purple-500 text-white font-semibold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="h-4 w-4 text-blue-400" />
          <span>Job Management ({metrics?.totalJobs ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all ${
            activeTab === "users"
              ? "border-purple-500 text-white font-semibold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4 text-emerald-400" />
          <span>Users ({metrics?.totalUsers ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all ${
            activeTab === "settings"
              ? "border-purple-500 text-white font-semibold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Sliders className="h-4 w-4 text-amber-400" />
          <span>System Settings</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Jobs</span>
              <p className="text-2xl font-bold text-white">{metrics?.totalJobs ?? 0}</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Success Rate</span>
              <p className="text-2xl font-bold text-emerald-400">{metrics?.successRate ?? 100}%</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-blue-400 tracking-wider">Queue Active</span>
              <p className="text-2xl font-bold text-blue-400">
                {(metrics?.queueWaiting ?? 0) + (metrics?.queueActive ?? 0)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">Avg Latency</span>
              <p className="text-2xl font-bold text-amber-300">{metrics?.avgProcessingSec ?? 0}s</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider">Total Storage</span>
              <p className="text-2xl font-bold text-purple-300">
                {formatBytes(metrics?.totalStorageBytes ?? 0)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider">Users</span>
              <p className="text-2xl font-bold text-white">{metrics?.totalUsers ?? 0}</p>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Server className="h-4 w-4 text-purple-400" />
                <span>Job Status Breakdown</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Completed conversions</span>
                  <span className="font-semibold text-emerald-400">{metrics?.completedJobs ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Failed conversions</span>
                  <span className="font-semibold text-rose-400">{metrics?.failedJobs ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Cancelled conversions</span>
                  <span className="font-semibold text-slate-300">{metrics?.cancelledJobs ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">In-flight active jobs</span>
                  <span className="font-semibold text-blue-400">{metrics?.activeJobs ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                <span>BullMQ Queue Status</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Waiting in queue</span>
                  <span className="font-semibold text-white">{metrics?.queueWaiting ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Currently processing by worker</span>
                  <span className="font-semibold text-indigo-400">{metrics?.queueActive ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Watchdog scanner</span>
                  <span className="font-semibold text-emerald-400">Active (60s cycle)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JOBS */}
      {activeTab === "jobs" && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadData()}
                placeholder="Search by filename or ID..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-800 bg-[#0d1424] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto text-xs w-full sm:w-auto">
              {["all", "completed", "processing", "queued", "failed", "cancelled"].map((st) => (
                <button
                  key={st}
                  onClick={() => setJobStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium ${
                    jobStatusFilter === st
                      ? "bg-purple-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Jobs Table */}
          <div className="rounded-xl border border-slate-800 bg-[#0d1322] overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b101c] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">File / Job ID</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3">Bitrate</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Attempts</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/30">
                    <td className="p-3">
                      <div className="font-medium text-white truncate max-w-xs">{job.originalFilename}</div>
                      <span className="font-mono text-[10px] text-slate-500">{job.id.slice(0, 10)}...</span>
                    </td>
                    <td className="p-3 capitalize">{job.ownerType}</td>
                    <td className="p-3 font-mono">{job.bitrateKbps}k</td>
                    <td className="p-3">{job.durationSec ? formatDuration(job.durationSec) : "—"}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          job.status === "completed"
                            ? "success"
                            : job.status === "failed"
                            ? "destructive"
                            : job.status === "processing"
                            ? "info"
                            : "outline"
                        }
                        className="text-[10px] px-2 py-0"
                      >
                        {job.status}
                      </Badge>
                      {job.errorCode && (
                        <span className="block text-[10px] text-rose-400 font-mono mt-0.5">
                          {job.errorCode}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono">{job.attempt}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(job.status === "failed" || job.status === "cancelled") && (
                          <button
                            onClick={() => handleJobRetry(job.id)}
                            className="p-1 text-slate-400 hover:text-purple-400"
                            title="Retry conversion"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {(job.status === "queued" || job.status === "processing") && (
                          <button
                            onClick={() => handleJobCancel(job.id)}
                            className="p-1 text-slate-400 hover:text-amber-400"
                            title="Cancel job"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleJobDelete(job.id)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                          title="Delete job"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USERS */}
      {activeTab === "users" && (
        <div className="rounded-xl border border-slate-800 bg-[#0d1322] overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0b101c] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-white">{u.name}</td>
                  <td className="p-3 text-slate-400">{u.email}</td>
                  <td className="p-3">
                    <Badge variant={u.role === "admin" ? "gradient" : "outline"} className="text-[10px]">
                      {u.role}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={u.status === "active" ? "success" : "destructive"} className="text-[10px]">
                      {u.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleUserToggleRole(u)}
                      className="text-[11px] text-purple-400 hover:underline"
                    >
                      {u.role === "admin" ? "Demote" : "Make Admin"}
                    </button>
                    <button
                      onClick={() => handleUserToggleStatus(u)}
                      className={`text-[11px] hover:underline ${
                        u.status === "active" ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {u.status === "active" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: SYSTEM SETTINGS */}
      {activeTab === "settings" && (
        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-6 space-y-4 max-w-2xl text-xs">
          <h3 className="text-sm font-semibold text-white">Active System Configuration</h3>
          <div className="space-y-3 divide-y divide-slate-800">
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Maximum Upload Size</span>
              <span className="font-mono text-white">500 MB (524,288,000 bytes)</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Media Duration Limit</span>
              <span className="font-mono text-white">3,600 seconds (1 hour)</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Worker Concurrency</span>
              <span className="font-mono text-white">2 concurrent jobs per worker</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Conversion Timeout</span>
              <span className="font-mono text-white">900 seconds (15 minutes)</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Guest Retention Policy</span>
              <span className="font-mono text-white">24 hours</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Registered User Retention Policy</span>
              <span className="font-mono text-white">168 hours (7 days)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
