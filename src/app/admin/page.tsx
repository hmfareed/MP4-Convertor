"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
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
  LogOut,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
  Activity,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/logo";
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

interface CurrentAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "users" | "settings">("overview");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);

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
      setCurrentAdmin(meData.user);

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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

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
        loadData();
      } else {
        alert("Failed to delete conversion.");
      }
    } catch {
      alert("Error deleting job.");
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

  // ACCESS DENIED VIEW
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d1424] p-8 text-center shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            This area requires administrator privileges. Please sign in with your administrator account to access the control panel.
          </p>
          <div className="flex flex-col gap-2.5 w-full">
            <Button asChild variant="gradient" size="sm" className="w-full">
              <Link href="/login?redirect=/admin">Sign In to Admin Account</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full text-slate-400">
              <Link href="/">Return to Homepage</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // NAVIGATION ITEMS DEFINITION WITH VIBRANT COLORS
  const navItems = [
    {
      id: "overview" as const,
      label: "Overview",
      icon: LayoutDashboard,
      iconColor: "text-purple-400",
      activeBg: "bg-purple-600/15 text-purple-200 border-purple-500/30",
      badge: null,
    },
    {
      id: "jobs" as const,
      label: "Jobs",
      icon: Layers,
      iconColor: "text-blue-400",
      activeBg: "bg-blue-600/15 text-blue-200 border-blue-500/30",
      badge: metrics?.totalJobs ?? null,
    },
    {
      id: "users" as const,
      label: "Users",
      icon: Users,
      iconColor: "text-emerald-400",
      activeBg: "bg-emerald-600/15 text-emerald-200 border-emerald-500/30",
      badge: metrics?.totalUsers ?? null,
    },
    {
      id: "settings" as const,
      label: "Settings",
      icon: Sliders,
      iconColor: "text-amber-400",
      activeBg: "bg-amber-600/15 text-amber-200 border-amber-500/30",
      badge: null,
    },
  ];

  const activeNav = navItems.find((n) => n.id === activeTab) || navItems[0];
  const ActiveIcon = activeNav.icon;

  const getSectionTitle = () => {
    switch (activeTab) {
      case "overview":
        return "Dashboard Overview";
      case "jobs":
        return "Conversion Jobs Management";
      case "users":
        return "User Accounts & Permissions";
      case "settings":
        return "System Configuration & Engine";
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col md:flex-row">
      {/* MOBILE HEADER BAR */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0a0f1e] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <Badge variant="gradient" className="text-[10px] uppercase font-bold py-0.5">
            Admin
          </Badge>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white"
          aria-label="Toggle Navigation"
        >
          {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* SLIM LEFT SIDEBAR (w-52 = 208px) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-52 bg-[#090e1c] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top: Logo & Branding */}
        <div>
          <div className="px-4 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white">Admin Console</span>
                <span className="text-[9px] text-purple-400 font-medium">Control Center</span>
              </div>
            </div>
            <div className="hidden md:block">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          </div>

          {/* Nav List with Colorful Section Icons */}
          <div className="px-2.5 py-4 space-y-1">
            <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Sections
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? `${item.activeBg} border font-semibold shadow-sm`
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 ${item.iconColor} flex-shrink-0`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full flex-shrink-0 ${
                        isActive
                          ? "bg-purple-500/30 text-purple-200"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Sidebar: Return to App & Compact Admin Profile Card */}
        <div className="p-3 border-t border-slate-800/80 space-y-2.5">
          <Link
            href="/"
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/40 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="truncate">Exit to App</span>
          </Link>

          {currentAdmin && (
            <div className="rounded-xl border border-slate-800/80 bg-[#0d1424] p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
                  {currentAdmin.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{currentAdmin.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE BACKDROP OVERLAY */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* MAIN RIGHT COLUMN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* DEDICATED ADMIN HEADER */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg bg-slate-850/80 border border-slate-800 ${activeNav.iconColor}`}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {getSectionTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Engine Healthy</span>
            </div>

            {/* Refresh Data Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="h-9 gap-1.5 text-xs text-slate-300 hover:text-white border-slate-700 bg-[#0d1424]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-purple-400" : ""}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </Button>
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Key Metric Cards with Distinctive Section Icons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Volume</span>
                    <Layers className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{metrics?.totalJobs ?? 0}</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Success Rate</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{metrics?.successRate ?? 100}%</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-blue-400 tracking-wider">Active Queue</span>
                    <Activity className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    {(metrics?.queueWaiting ?? 0) + (metrics?.queueActive ?? 0)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">Avg Latency</span>
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold text-amber-300">{metrics?.avgProcessingSec ?? 0}s</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider">Storage</span>
                    <HardDrive className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-purple-300">
                    {formatBytes(metrics?.totalStorageBytes ?? 0)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Users</span>
                    <Users className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{metrics?.totalUsers ?? 0}</p>
                </div>
              </div>

              {/* Infrastructure Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Server className="h-4 w-4 text-purple-400" />
                    <span>Job Status Breakdown</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Completed conversions</span>
                      <span className="font-semibold text-emerald-400">{metrics?.completedJobs ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Failed conversions</span>
                      <span className="font-semibold text-rose-400">{metrics?.failedJobs ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Cancelled conversions</span>
                      <span className="font-semibold text-slate-300">{metrics?.cancelledJobs ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400">Currently processing</span>
                      <span className="font-semibold text-blue-400">{metrics?.activeJobs ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-400" />
                    <span>BullMQ & Worker Engine</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Waiting in BullMQ queue</span>
                      <span className="font-semibold text-white">{metrics?.queueWaiting ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Active worker tasks</span>
                      <span className="font-semibold text-indigo-400">{metrics?.queueActive ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400">Watchdog scanner & retention</span>
                      <span className="font-semibold text-emerald-400">Active (Automatic cycles)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JOBS */}
          {activeTab === "jobs" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Conversion Queue & Job Records</h3>
              </div>

              {/* Search & Filter Bar */}
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
                  {["all", "completed", "processing", "queued", "failed", "cancelled", "expired"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setJobStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
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
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No conversion jobs found matching the current criteria.
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => (
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: USERS */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Registered Users & Account Controls</h3>
              </div>

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
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No user accounts found.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-2 mb-1">
                <Sliders className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Active System Configuration</h3>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-6 space-y-4 text-xs">
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
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
