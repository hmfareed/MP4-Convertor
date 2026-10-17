"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Loader2,
} from "lucide-react";

interface AdminCalendarPopoverProps {
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  usersPerDay?: Array<{ date: string; label: string; count: number }>;
  buttonLabel?: string;
  align?: "left" | "right";
  size?: "sm" | "md";
}

export function AdminCalendarPopover({
  selectedDate,
  onSelectDate,
  usersPerDay = [],
  buttonLabel = "Select Date",
  align = "right",
  size = "sm",
}: AdminCalendarPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getUTCFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getUTCMonth()); // 0-indexed

  // Monthly stats cache (date -> count)
  const [monthCounts, setMonthCounts] = useState<Record<string, number>>({});
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  // Selected date stats
  const [dateCount, setDateCount] = useState<number | null>(null);
  const [isLoadingDate, setIsLoadingDate] = useState(false);

  // Pre-seed from usersPerDay
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

  // Fetch monthly stats when browsing
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

  // Fetch date stats when selected
  useEffect(() => {
    if (!selectedDate) {
      setDateCount(null);
      return;
    }

    const localFound = usersPerDay.find((d) => d.date === selectedDate);
    if (localFound !== undefined) {
      setDateCount(localFound.count);
    }

    let isCancelled = false;
    const fetchDate = async () => {
      setIsLoadingDate(true);
      try {
        const res = await fetch(`/api/admin/users/stats?date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.dateStats) {
            setDateCount(data.dateStats.count);
          }
        }
      } catch (err) {
        console.error("Failed to fetch date stats:", err);
      } finally {
        if (!isCancelled) setIsLoadingDate(false);
      }
    };

    fetchDate();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, usersPerDay]);

  // Click outside and Escape key handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Navigation handlers
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

  const formattedSelected = selectedDate
    ? new Date(selectedDate + "T00:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
          size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
        } ${
          selectedDate
            ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/10"
            : isOpen
            ? "bg-neutral-800 text-white border-neutral-700"
            : "bg-black/60 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 hover:bg-neutral-900"
        }`}
        title="Open calendar to view user registrations for a specific date"
      >
        <CalendarIcon className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
        <span className="truncate">{selectedDate ? formattedSelected : buttonLabel}</span>
        {selectedDate && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSelectDate(null);
            }}
            className="hover:text-rose-400 text-neutral-400 p-0.5 ml-0.5 rounded transition-colors"
            title="Clear date filter"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {/* AMOLED CALENDAR POPOVER */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-neutral-800 bg-[#0a0a0a] shadow-2xl shadow-black/95 p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
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

              const dayDate = new Date(Date.UTC(currentYear, currentMonth, day));
              const isFuture = dayDate > now;

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
                  onClick={() => {
                    onSelectDate(todayStr);
                    setIsOpen(false);
                  }}
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
                  onClick={() => {
                    onSelectDate(null);
                    setIsOpen(false);
                  }}
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
                  <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold">{formattedSelected}:</span>
                  <span className="font-bold text-white font-mono">
                    {isLoadingDate && dateCount === null ? "..." : dateCount ?? 0}{" "}
                    {(dateCount ?? 0) === 1 ? "user" : "users"}
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
