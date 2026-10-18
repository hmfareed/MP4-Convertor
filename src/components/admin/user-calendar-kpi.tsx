"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  ChevronRight as ArrowRightIcon,
  Check,
  Loader2,
} from "lucide-react";

interface UserCalendarKPIProps {
  totalActiveUsers: number;
  newUsersToday: number;
  usersPerDay?: Array<{ date: string; label: string; count: number }>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onNavigateToUsers: () => void;
}

export function UserCalendarKPI({
  totalActiveUsers,
  newUsersToday,
  usersPerDay = [],
  selectedDate,
  onSelectDate,
  onNavigateToUsers,
}: UserCalendarKPIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Calendar month navigation state
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getUTCFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getUTCMonth()); // 0-indexed

  // Monthly stats cache (date -> count)
  const [monthCounts, setMonthCounts] = useState<Record<string, number>>({});
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  // Selected date stats
  const [dateStats, setDateStats] = useState<{
    count: number;
    totalToDate?: number;
  } | null>(null);
  const [isLoadingDate, setIsLoadingDate] = useState(false);

  // Pre-seed month counts from usersPerDay if available
  useEffect(() => {
    if (usersPerDay && usersPerDay.length > 0) {
      setMonthCounts((prev) => {
        const next = { ...prev };
        usersPerDay.forEach((item) => {
          if (item.date) next[item.date] = item.count;
        });
        return next;
      });
    }
  }, [usersPerDay]);

  // Fetch monthly stats when browsing different months in calendar
  useEffect(() => {
    if (!isOpen) return;

    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    let isCancelled = false;

    const fetchMonthStats = async () => {
      setIsLoadingMonth(true);
      try {
        const res = await fetch(`/api/admin/users/stats?month=${monthKey}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.monthStats?.dailyCounts) {
            setMonthCounts((prev) => ({
              ...prev,
              ...data.monthStats.dailyCounts,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load month user stats:", err);
      } finally {
        if (!isCancelled) setIsLoadingMonth(false);
      }
    };

    fetchMonthStats();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, currentYear, currentMonth]);

  // Fetch detailed stats for selected date
  useEffect(() => {
    if (!selectedDate) {
      setDateStats(null);
      return;
    }

    // Check if we already have it in local memory from usersPerDay
    const existing = usersPerDay.find((d) => d.date === selectedDate);
    if (existing !== undefined) {
      setDateStats({ count: existing.count });
    }

    let isCancelled = false;
    const fetchDateDetails = async () => {
      setIsLoadingDate(true);
      try {
        const res = await fetch(`/api/admin/users/stats?date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.dateStats) {
            setDateStats({
              count: data.dateStats.count,
              totalToDate: data.dateStats.totalToDate,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch date stats:", err);
      } finally {
        if (!isCancelled) setIsLoadingDate(false);
      }
    };

    fetchDateDetails();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, usersPerDay]);

  // Close popover on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Month navigation helpers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isLatest =
      currentYear > now.getUTCFullYear() ||
      (currentYear === now.getUTCFullYear() && currentMonth >= now.getUTCMonth());
    if (isLatest) return;

    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const isCurrentMonthOrFuture =
    currentYear > now.getUTCFullYear() ||
    (currentYear === now.getUTCFullYear() && currentMonth >= now.getUTCMonth());

  // Generate calendar days
  const firstDayOfWeek = new Date(Date.UTC(currentYear, currentMonth, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
  const monthName = new Date(Date.UTC(currentYear, currentMonth, 1)).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate()
  ).padStart(2, "0")}`;

  const handleSelectDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
    onSelectDate(dateStr);
    setIsOpen(false);
  };

  const handleResetToToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectDate(todayStr);
    setIsOpen(false);
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectDate(null);
    setIsOpen(false);
  };

  // Format selected date for display
  const formattedSelectedDate = selectedDate
    ? new Date(selectedDate + "T00:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <div className="relative" ref={popoverRef}>
      {/* KPI CARD */}
      <div
        className={`rounded-xl border transition-all text-left p-3.5 space-y-1.5 ${
          selectedDate
            ? "border-emerald-500/70 bg-emerald-950/20 shadow-lg shadow-emerald-950/20"
            : "border-neutral-800/90 bg-black hover:border-emerald-500/50 hover:bg-neutral-950/40"
        }`}
      >
        {/* Top Header: Label + Calendar Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-[10px] uppercase font-semibold tracking-wider truncate ${
                selectedDate ? "text-emerald-300" : "text-emerald-400"
              }`}
            >
              {selectedDate ? `Users: ${formattedSelectedDate}` : "Current Users"}
            </span>
            {selectedDate && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Toggle Calendar Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              title={isOpen ? "Close calendar" : "Select date from calendar"}
              className={`p-1 rounded-lg transition-all cursor-pointer ${
                selectedDate
                  ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/50 shadow-sm shadow-emerald-500/20"
                  : isOpen
                  ? "bg-neutral-800 text-white border border-neutral-700"
                  : "bg-black/60 border border-neutral-800 text-neutral-300 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-neutral-900"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5 text-emerald-400" />
            </button>

            {/* Clear Filter (if selected) */}
            {selectedDate && (
              <button
                type="button"
                onClick={handleClearSelection}
                title="Reset to total active users"
                className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Main Metric Value */}
        <div
          onClick={onNavigateToUsers}
          className="cursor-pointer group flex items-baseline justify-between"
          title="View users table"
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-white tracking-tight">
                {selectedDate
                  ? isLoadingDate && dateStats === null
                    ? "..."
                    : dateStats?.count ?? 0
                  : totalActiveUsers}
              </p>
              {isLoadingDate && (
                <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              )}
            </div>

            <div className="text-[10px] leading-tight">
              {selectedDate ? (
                <div className="flex items-center gap-1 text-emerald-400/90 font-medium">
                  <span>Registered on {formattedSelectedDate}</span>
                  {dateStats?.totalToDate !== undefined && (
                    <span className="text-neutral-500 text-[9px]">
                      ({dateStats.totalToDate} cumulative)
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-emerald-400/80 font-medium">
                  +{newUsersToday} today
                </span>
              )}
            </div>
          </div>

          <ArrowRightIcon className="h-3.5 w-3.5 text-neutral-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </div>
      </div>

      {/* AMOLED CALENDAR POPOVER */}
      {isOpen && (
        <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-neutral-800 bg-black shadow-2xl shadow-black/95 p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Calendar Header with Month Navigation */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                {monthName} {currentYear}
              </span>
              {isLoadingMonth && (
                <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              )}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isCurrentMonthOrFuture}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                isCurrentMonthOrFuture
                  ? "text-neutral-700 cursor-not-allowed"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
              <span
                key={dayName}
                className="text-[10px] font-semibold text-neutral-500 uppercase py-0.5"
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank offset placeholders */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-8 w-full" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
                2,
                "0"
              )}-${String(day).padStart(2, "0")}`;

              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              // Check if future date
              const dayDate = new Date(Date.UTC(currentYear, currentMonth, day));
              const isFuture = dayDate > now;

              // Users count for this day
              const count = monthCounts[dateStr] || 0;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isFuture}
                  onClick={() => handleSelectDay(day)}
                  className={`relative h-8 w-full rounded-lg text-xs font-medium flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-600 text-white font-bold ring-2 ring-emerald-400 shadow-md shadow-emerald-500/30"
                      : isToday
                      ? "border border-emerald-500/50 text-emerald-300 hover:bg-neutral-900"
                      : isFuture
                      ? "text-neutral-600 opacity-30 cursor-not-allowed hover:bg-transparent"
                      : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
                  }`}
                  title={`${dateStr}: ${count} registered users`}
                >
                  <span className="leading-none">{day}</span>

                  {/* Emerald registration dot indicator */}
                  {!isFuture && count > 0 && (
                    <span
                      className={`h-1 w-1 rounded-full mt-0.5 ${
                        isSelected ? "bg-white" : "bg-emerald-400"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Shortcuts & Selection Status */}
          <div className="pt-2 border-t border-neutral-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetToToday}
                  className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
                    const yStr = `${yesterday.getUTCFullYear()}-${String(
                      yesterday.getUTCMonth() + 1
                    ).padStart(2, "0")}-${String(yesterday.getUTCDate()).padStart(2, "0")}`;
                    onSelectDate(yStr);
                    setIsOpen(false);
                  }}
                  className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
                >
                  Yesterday
                </button>
              </div>

              {selectedDate ? (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-neutral-400 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              ) : (
                <span className="text-[10px] text-neutral-500">Pick any date</span>
              )}
            </div>

            {/* Selected Date Summary Banner */}
            {selectedDate && (
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-semibold">{formattedSelectedDate}:</span>
                  <span className="font-bold text-white font-mono">
                    {dateStats?.count ?? 0}{" "}
                    {(dateStats?.count ?? 0) === 1 ? "user" : "users"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] uppercase font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
