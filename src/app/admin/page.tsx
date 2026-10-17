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
  ChevronRight,
  UserCheck,
  UserPlus,
  FileAudio,
  TrendingUp,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/logo";
import { formatBytes, formatDuration, formatTimeAgo } from "@/lib/utils";
import { JobStatus } from "@/types/conversion";

interface MetricsData {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  activeJobs: number;
  recentJobs24h?: number;
  totalUsers: number;
  activeUsers?: number;
  newUsersToday?: number;
  queueWaiting: number;
  queueActive: number;
  avgProcessingSec: number;
  totalStorageBytes: number;
  successRate: number;
  usersPerDay?: Array<{
    date: string;
    label: string;
    count: number;
  }>;
  recentJobs?: Array<{
    id: string;
    originalFilename: string;
    status: JobStatus;
    bitrateKbps: number;
    durationSec?: number;
    createdAt: string;
  }>;
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
  const [userGraphDays, setUserGraphDays] = useState<7 | 14>(14);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; label: string; count: number } | null>(null);

  const loadData = async (filterOverride?: string, searchOverride?: string) => {
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
      const statusParam = filterOverride !== undefined ? filterOverride : jobStatusFilter;
      const searchParam = searchOverride !== undefined ? searchOverride : jobSearch;
      const jobsRes = await fetch(`/api/admin/jobs?search=${encodeURIComponent(searchParam)}&status=${statusParam}`);
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

  const navigateToJobsWithFilter = (status: string) => {
    setJobSearch("");
    setActiveTab("jobs");
    if (jobStatusFilter === status) {
      loadData(status, "");
    } else {
      setJobStatusFilter(status);
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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-8 text-center shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
            This area requires administrator privileges. Please sign in with your administrator account to access the control panel.
          </p>
          <div className="flex flex-col gap-2.5 w-full">
            <Button asChild variant="gradient" size="sm" className="w-full">
              <Link href="/login?redirect=/admin">Sign In to Admin Account</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full text-neutral-400 border-neutral-800 hover:bg-neutral-900">
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
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col md:flex-row selection:bg-purple-600/30">
      {/* MOBILE HEADER BAR */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-black border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <Badge variant="gradient" className="text-[10px] uppercase font-bold py-0.5">
            Admin
          </Badge>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white"
          aria-label="Toggle Navigation"
        >
          {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* SLIM LEFT SIDEBAR (w-52 = 208px) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-52 bg-black border-r border-neutral-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top: Logo & Branding */}
        <div>
          <div className="px-4 py-4 border-b border-neutral-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 border border-purple-500/30 rounded-md">
                Admin
              </span>
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
            <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
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
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent"
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
                          : "bg-neutral-900 text-neutral-400 border border-neutral-800"
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
        <div className="p-3 border-t border-neutral-800/80 space-y-2.5">
          <Link
            href="/"
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="truncate">Exit to App</span>
          </Link>

          {currentAdmin && (
            <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
                  {currentAdmin.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{currentAdmin.name}</p>
                  <p className="text-[10px] text-neutral-400 truncate">{currentAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
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
          className="md:hidden fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
        />
      )}

      {/* MAIN RIGHT COLUMN */}
      <div className="flex-1 flex flex-col min-w-0 bg-black">
        {/* DEDICATED ADMIN HEADER */}
        <header className="sticky top-0 z-20 h-16 border-b border-neutral-800/80 bg-black/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 ${activeNav.iconColor}`}>
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
              onClick={() => loadData()}
              disabled={isLoading}
              className="h-9 gap-1.5 text-xs text-neutral-300 hover:text-white border-neutral-800 bg-[#0a0a0a] hover:bg-neutral-900"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-purple-400" : ""}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </Button>
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (() => {
            const dailyUsers = metrics?.usersPerDay?.slice(-userGraphDays) || [];
            const maxUsersInWindow = Math.max(1, ...dailyUsers.map((d) => d.count));
            const totalNewInWindow = dailyUsers.reduce((sum, d) => sum + d.count, 0);
            const peakDay = dailyUsers.reduce(
              (peak, d) => (d.count > (peak?.count || 0) ? d : peak),
              dailyUsers[0] || null
            );

            return (
              <div className="space-y-6">
                {/* 1. KEY KPI CARDS GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
                  {/* Total Volume */}
                  <button
                    type="button"
                    onClick={() => navigateToJobsWithFilter("all")}
                    className="rounded-xl border border-neutral-800/90 bg-[#0a0a0a] p-3.5 space-y-1 text-left hover:border-purple-500/50 hover:bg-[#121212] transition-all cursor-pointer group"
                    title="View all jobs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-neutral-400 group-hover:text-purple-300 tracking-wider transition-colors">
                        Total Volume
                      </span>
                      <Layers className="h-3.5 w-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-bold text-white">{metrics?.totalJobs ?? 0}</p>
                      <ChevronRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>

                  {/* Recent Jobs (24h) */}
                  <button
                    type="button"
                    onClick={() => navigateToJobsWithFilter("all")}
                    className="rounded-xl border border-neutral-800/90 bg-[#0a0a0a] p-3.5 space-y-1 text-left hover:border-blue-500/50 hover:bg-[#121212] transition-all cursor-pointer group"
                    title="View recent jobs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-blue-400 group-hover:text-blue-300 tracking-wider transition-colors">
                        Recent Jobs
                      </span>
                      <FileAudio className="h-3.5 w-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-2xl font-bold text-blue-400">{metrics?.recentJobs24h ?? 0}</p>
                        <span className="text-[10px] text-neutral-500">Last 24 hours</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>

                  {/* Current Users */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("users")}
                    className="rounded-xl border border-neutral-800/90 bg-[#0a0a0a] p-3.5 space-y-1 text-left hover:border-emerald-500/50 hover:bg-[#121212] transition-all cursor-pointer group"
                    title="Manage users"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-emerald-400 group-hover:text-emerald-300 tracking-wider transition-colors">
                        Current Users
                      </span>
                      <UserCheck className="h-3.5 w-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-2xl font-bold text-white">
                          {metrics?.activeUsers ?? metrics?.totalUsers ?? 0}
                        </p>
                        <span className="text-[10px] text-emerald-400/80">
                          +{metrics?.newUsersToday ?? 0} today
                        </span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>

                  {/* Active Queue */}
                  <button
                    type="button"
                    onClick={() => navigateToJobsWithFilter("queued")}
                    className="rounded-xl border border-neutral-800/90 bg-[#0a0a0a] p-3.5 space-y-1 text-left hover:border-blue-500/50 hover:bg-[#121212] transition-all cursor-pointer group"
                    title="View queued & active jobs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-blue-400 group-hover:text-blue-300 tracking-wider transition-colors">
                        Active Queue
                      </span>
                      <Activity className="h-3.5 w-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-2xl font-bold text-blue-400">
                          {(metrics?.queueWaiting ?? 0) + (metrics?.queueActive ?? 0)}
                        </p>
                        <span className="text-[10px] text-neutral-500">BullMQ pipeline</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>

                  {/* Success Rate */}
                  <div className="rounded-xl border border-neutral-800/90 bg-[#0a0a0a] p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Success Rate</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">{metrics?.successRate ?? 100}%</p>
                    <span className="text-[10px] text-neutral-500">Completed jobs</span>
                  </div>

                  {/* Avg Latency */}
                  <div className="rounded-xl border border-neutral-800/90 bg-[#0a0a0a] p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">Avg Latency</span>
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <p className="text-2xl font-bold text-amber-300">{metrics?.avgProcessingSec ?? 0}s</p>
                    <span className="text-[10px] text-neutral-500">Encoding speed</span>
                  </div>

                  {/* Storage */}
                  <div className="rounded-xl border border-neutral-800/90 bg-[#0a0a0a] p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider">Storage</span>
                      <HardDrive className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-purple-300 truncate">
                      {formatBytes(metrics?.totalStorageBytes ?? 0)}
                    </p>
                    <span className="text-[10px] text-neutral-500">Total disk volume</span>
                  </div>
                </div>

                {/* 2. ANALYTICS ROW: USERS PER DAY GRAPH & RECENT JOBS FEED */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* USERS PER DAY GRAPH */}
                  <div className="lg:col-span-7 rounded-xl border border-neutral-800/90 bg-[#0a0a0a] p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <UserPlus className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">Users Registered Per Day</h3>
                          <p className="text-[11px] text-neutral-400">
                            Account registration velocity • {totalNewInWindow} total in window
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-black/60 border border-neutral-800 rounded-lg p-0.5 text-xs self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setUserGraphDays(7)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                            userGraphDays === 7 ? "bg-emerald-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          7 Days
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserGraphDays(14)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                            userGraphDays === 14 ? "bg-emerald-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          14 Days
                        </button>
                      </div>
                    </div>

                    {/* Graph Canvas / Columns */}
                    <div className="relative pt-2 pb-1">
                      {/* Hover Status Bar */}
                      <div className="h-6 flex items-center justify-between text-xs px-1 mb-1">
                        {hoveredDay ? (
                          <div className="flex items-center gap-2 text-emerald-300 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{hoveredDay.label}:</span>
                            <span className="font-bold text-white font-mono">
                              {hoveredDay.count} new {hoveredDay.count === 1 ? "user" : "users"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-[11px]">
                            Hover over any bar to view registration details
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-500 font-mono">
                          Peak: {maxUsersInWindow} / day
                        </span>
                      </div>

                      {/* Chart Container */}
                      <div className="h-40 flex items-end gap-1.5 sm:gap-2.5 px-3 pt-6 pb-2 border border-neutral-800/80 bg-black/50 rounded-lg relative overflow-hidden">
                        {/* Subtle Background Guide Lines */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between px-3 py-3 opacity-25">
                          <div className="border-b border-neutral-700/60 w-full" />
                          <div className="border-b border-neutral-700/60 w-full" />
                          <div className="border-b border-neutral-700/60 w-full" />
                        </div>

                        {dailyUsers.map((item, idx) => {
                          const isHovered = hoveredDay?.date === item.date;
                          const isToday = idx === dailyUsers.length - 1;
                          const heightPct = item.count === 0 ? 6 : Math.max(14, Math.round((item.count / maxUsersInWindow) * 100));

                          return (
                            <div
                              key={item.date}
                              onMouseEnter={() => setHoveredDay(item)}
                              onMouseLeave={() => setHoveredDay(null)}
                              className="flex-1 h-full flex flex-col items-center justify-end relative group cursor-pointer"
                            >
                              {/* Hover / Active Number Indicator */}
                              {item.count > 0 && (
                                <span
                                  className={`text-[10px] font-mono mb-1 transition-opacity ${
                                    isHovered || isToday
                                      ? "opacity-100 text-emerald-300 font-bold"
                                      : "opacity-0 group-hover:opacity-100 text-neutral-400"
                                  }`}
                                >
                                  {item.count}
                                </span>
                              )}

                              {/* Bar Graphic */}
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full max-w-[28px] rounded-t-md transition-all duration-200 ${
                                  item.count > 0
                                    ? isHovered
                                      ? "bg-gradient-to-t from-emerald-600 to-teal-300 shadow-md shadow-emerald-500/30 brightness-110"
                                      : isToday
                                      ? "bg-gradient-to-t from-emerald-600/80 to-emerald-400 ring-1 ring-emerald-400/40"
                                      : "bg-gradient-to-t from-emerald-700/60 to-emerald-500/80 group-hover:from-emerald-600 group-hover:to-teal-300"
                                    : "bg-neutral-800/40 group-hover:bg-neutral-800/80"
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Date Labels Axis */}
                      <div className="flex items-center gap-1.5 sm:gap-2.5 px-3 pt-2 text-[10px] text-neutral-500 font-mono">
                        {dailyUsers.map((item, idx) => {
                          const showLabel = userGraphDays === 7 ? true : idx % 2 === 0 || idx === dailyUsers.length - 1;
                          return (
                            <div key={item.date} className="flex-1 text-center truncate">
                              {showLabel ? item.label : ""}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Summary Metric Counters */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-800/60 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">In Window</span>
                        <p className="text-sm font-bold text-white font-mono">{totalNewInWindow} users</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Daily Avg</span>
                        <p className="text-sm font-bold text-emerald-400 font-mono">
                          {(totalNewInWindow / userGraphDays).toFixed(1)} / day
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Peak Day</span>
                        <p className="text-sm font-bold text-teal-300 font-mono truncate">
                          {peakDay && peakDay.count > 0 ? `${peakDay.label} (${peakDay.count})` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RECENT JOBS LIVE FEED */}
                  <div className="lg:col-span-5 rounded-xl border border-neutral-800/90 bg-[#0a0a0a] p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800/60">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            <FileAudio className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white">Recent Conversions</h3>
                            <p className="text-[11px] text-neutral-400">Latest jobs processed</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateToJobsWithFilter("all")}
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <span>View All ({metrics?.totalJobs ?? 0})</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Job Items */}
                      <div className="space-y-1 pt-2">
                        {!metrics?.recentJobs || metrics.recentJobs.length === 0 ? (
                          <div className="py-8 text-center text-xs text-neutral-500">
                            No conversion jobs recorded yet.
                          </div>
                        ) : (
                          metrics.recentJobs.map((job) => (
                            <button
                              key={job.id}
                              type="button"
                              onClick={() => {
                                setJobSearch(job.originalFilename);
                                setActiveTab("jobs");
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-neutral-900 transition-colors group cursor-pointer text-left"
                              title={`Inspect job ${job.id}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <FileAudio className="h-3.5 w-3.5 text-neutral-500 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-white truncate max-w-[170px] sm:max-w-xs">
                                    {job.originalFilename}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
                                    <span>{job.bitrateKbps}k</span>
                                    {job.durationSec ? <span>• {formatDuration(job.durationSec)}</span> : null}
                                    <span>• {formatTimeAgo(job.createdAt)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
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
                                  className="text-[9px] px-1.5 py-0 capitalize font-mono"
                                >
                                  {job.status}
                                </Badge>
                                <ChevronRight className="h-3 w-3 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Queue status: {metrics?.activeJobs ?? 0} active</span>
                      <button
                        type="button"
                        onClick={() => navigateToJobsWithFilter("completed")}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer"
                      >
                        {metrics?.completedJobs ?? 0} completed &rarr;
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. INFRASTRUCTURE BREAKDOWN CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-neutral-800/90 bg-[#0a0a0a] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Server className="h-4 w-4 text-purple-400" />
                      <span>Job Status Breakdown</span>
                    </h3>
                    <span className="text-[10px] text-neutral-500">Click to filter</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => navigateToJobsWithFilter("completed")}
                      className="w-full flex justify-between items-center py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-neutral-900 border-b border-neutral-800/70 text-left transition-all group cursor-pointer"
                      title="View completed conversions"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                        <span className="text-neutral-300 group-hover:text-white transition-colors">Completed conversions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-emerald-400">{metrics?.completedJobs ?? 0}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateToJobsWithFilter("failed")}
                      className="w-full flex justify-between items-center py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-neutral-900 border-b border-neutral-800/70 text-left transition-all group cursor-pointer"
                      title="View failed conversions"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-400 ring-2 ring-rose-400/20" />
                        <span className="text-neutral-300 group-hover:text-white transition-colors">Failed conversions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-rose-400">{metrics?.failedJobs ?? 0}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateToJobsWithFilter("cancelled")}
                      className="w-full flex justify-between items-center py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-neutral-900 border-b border-neutral-800/70 text-left transition-all group cursor-pointer"
                      title="View cancelled conversions"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-neutral-400 ring-2 ring-neutral-400/20" />
                        <span className="text-neutral-300 group-hover:text-white transition-colors">Cancelled conversions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-300">{metrics?.cancelledJobs ?? 0}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateToJobsWithFilter("processing")}
                      className="w-full flex justify-between items-center py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-neutral-900 text-left transition-all group cursor-pointer"
                      title="View currently processing jobs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-400 ring-2 ring-blue-400/20 animate-pulse" />
                        <span className="text-neutral-300 group-hover:text-white transition-colors">Currently processing</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-blue-400">{metrics?.activeJobs ?? 0}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-800/90 bg-[#0a0a0a] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-400" />
                      <span>BullMQ & Worker Engine</span>
                    </h3>
                    <span className="text-[10px] text-neutral-500">Queue engine</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => navigateToJobsWithFilter("queued")}
                      className="w-full flex justify-between items-center py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-neutral-900 border-b border-neutral-800/70 text-left transition-all group cursor-pointer"
                      title="View jobs waiting in queue"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-400/20" />
                        <span className="text-neutral-300 group-hover:text-white transition-colors">Waiting in BullMQ queue</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{metrics?.queueWaiting ?? 0}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateToJobsWithFilter("processing")}
                      className="w-full flex justify-between items-center py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-neutral-900 border-b border-neutral-800/70 text-left transition-all group cursor-pointer"
                      title="View active worker tasks"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-400 ring-2 ring-indigo-400/20 animate-pulse" />
                        <span className="text-neutral-300 group-hover:text-white transition-colors">Active worker tasks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-indigo-400">{metrics?.queueActive ?? 0}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>

                    <div className="flex justify-between items-center py-2 px-2.5 -mx-2.5 text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                        <span>Watchdog scanner & retention</span>
                      </div>
                      <span className="font-semibold text-emerald-400">Active (Auto cycles)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

          {/* TAB 2: JOBS */}
          {activeTab === "jobs" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Conversion Queue & Job Records</h3>
                  {jobStatusFilter !== "all" && (
                    <Badge variant="info" className="text-[10px] capitalize px-2 py-0.5 ml-1">
                      {jobStatusFilter} ({jobs.length})
                    </Badge>
                  )}
                </div>
                {jobStatusFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setJobStatusFilter("all")}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium self-start sm:self-auto cursor-pointer"
                  >
                    Clear status filter (show all)
                  </button>
                )}
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                  <input
                    type="text"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadData()}
                    placeholder="Search by filename or ID..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-800 bg-[#0a0a0a] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                          : "bg-[#0a0a0a] border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jobs Table */}
              <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-black text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
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
                  <tbody className="divide-y divide-neutral-800/70">
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-500">
                          No conversion jobs found matching the current criteria.
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-neutral-900/40">
                          <td className="p-3">
                            <div className="font-medium text-white truncate max-w-xs">{job.originalFilename}</div>
                            <span className="font-mono text-[10px] text-neutral-500">{job.id.slice(0, 10)}...</span>
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
                                  className="p-1 text-neutral-400 hover:text-purple-400"
                                  title="Retry conversion"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {(job.status === "queued" || job.status === "processing") && (
                                <button
                                  onClick={() => handleJobCancel(job.id)}
                                  className="p-1 text-neutral-400 hover:text-amber-400"
                                  title="Cancel job"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleJobDelete(job.id)}
                                className="p-1 text-neutral-400 hover:text-rose-400"
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

              <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-black text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Joined</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/70">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-neutral-500">
                          No user accounts found.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u._id} className="hover:bg-neutral-900/40">
                          <td className="p-3 font-semibold text-white">{u.name}</td>
                          <td className="p-3 text-neutral-400">{u.email}</td>
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
                          <td className="p-3 text-neutral-500">
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

              <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-6 space-y-4 text-xs">
                <div className="space-y-3 divide-y divide-neutral-800">
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400">Maximum Upload Size</span>
                    <span className="font-mono text-white">500 MB (524,288,000 bytes)</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400">Media Duration Limit</span>
                    <span className="font-mono text-white">3,600 seconds (1 hour)</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400">Worker Concurrency</span>
                    <span className="font-mono text-white">2 concurrent jobs per worker</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400">Conversion Timeout</span>
                    <span className="font-mono text-white">900 seconds (15 minutes)</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400">Guest Retention Policy</span>
                    <span className="font-mono text-white">24 hours</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400">Registered User Retention Policy</span>
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
