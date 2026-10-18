"use client";

import React from "react";

export function AdminOverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard metrics">
      {/* 1. KEY KPI CARDS GRID SKELETON (7 cards matching dashboard grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {[
          { labelW: "w-20", subW: "w-14" }, // Total Volume
          { labelW: "w-20", subW: "w-16" }, // Recent Jobs
          { labelW: "w-24", subW: "w-14" }, // Current Users
          { labelW: "w-20", subW: "w-20" }, // Active Queue
          { labelW: "w-20", subW: "w-16" }, // Success Rate
          { labelW: "w-20", subW: "w-20" }, // Avg Latency
          { labelW: "w-16", subW: "w-24" }, // Storage
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-neutral-800/90 bg-black p-3.5 space-y-2 flex flex-col justify-between h-[100px]"
          >
            {/* Top row: label + icon */}
            <div className="flex items-center justify-between">
              <div className={`h-2.5 ${item.labelW} bg-neutral-800/90 rounded`} />
              <div className="h-3.5 w-3.5 bg-neutral-800/80 rounded-full flex-shrink-0" />
            </div>

            {/* Metric number */}
            <div className="space-y-1">
              <div className="h-7 w-16 bg-neutral-800/90 rounded-md" />
              <div className={`h-2 ${item.subW} bg-neutral-900 rounded`} />
            </div>
          </div>
        ))}
      </div>

      {/* 2. MAIN USER REGISTRATION CHART & RECENT CONVERSIONS SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User Velocity Chart Skeleton (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-neutral-800/90 bg-black p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800/60">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-neutral-800/90 rounded-xl flex-shrink-0" />
              <div className="space-y-1.5">
                <div className="h-4 w-44 bg-neutral-800/90 rounded" />
                <div className="h-2.5 w-56 bg-neutral-900 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-28 bg-neutral-900 rounded-lg" />
              <div className="h-7 w-20 bg-neutral-900 rounded-lg" />
            </div>
          </div>

          {/* Chart Canvas Placeholder */}
          <div className="h-48 w-full rounded-xl bg-neutral-950/80 border border-neutral-900/80 p-4 flex flex-col justify-between">
            <div className="w-full flex justify-between">
              <div className="h-2 w-32 bg-neutral-900 rounded" />
              <div className="h-2 w-16 bg-neutral-900 rounded" />
            </div>

            {/* Simulated undulating wave bars */}
            <div className="h-28 w-full flex items-end gap-2 px-1 pt-4">
              {[25, 40, 20, 60, 45, 75, 50, 68, 85, 55, 70, 92, 65, 80].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-neutral-900 to-neutral-800/60 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            <div className="w-full flex justify-between pt-2 border-t border-neutral-900/80">
              <div className="h-2 w-10 bg-neutral-900 rounded" />
              <div className="h-2 w-10 bg-neutral-900 rounded" />
              <div className="h-2 w-10 bg-neutral-900 rounded" />
              <div className="h-2 w-10 bg-neutral-900 rounded" />
            </div>
          </div>
        </div>

        {/* Recent Conversions Skeleton (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-neutral-800/90 bg-black p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/60">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 bg-neutral-800/90 rounded-lg flex-shrink-0" />
                <div className="h-4 w-36 bg-neutral-800/90 rounded" />
              </div>
              <div className="h-3 w-16 bg-neutral-900 rounded" />
            </div>

            {/* List items placeholder */}
            <div className="divide-y divide-neutral-900 mt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 bg-neutral-900 rounded-lg flex-shrink-0" />
                    <div className="space-y-1">
                      <div className="h-3 w-32 bg-neutral-800/80 rounded" />
                      <div className="h-2 w-20 bg-neutral-900 rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-16 bg-neutral-900 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-900 flex justify-between items-center">
            <div className="h-2.5 w-24 bg-neutral-900 rounded" />
            <div className="h-2.5 w-16 bg-neutral-900 rounded" />
          </div>
        </div>
      </div>

      {/* 3. INFRASTRUCTURE & SETTINGS SKELETON CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-800/90 bg-black p-5 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
              <div className="h-4 w-36 bg-neutral-800/90 rounded" />
              <div className="h-4 w-4 bg-neutral-800/80 rounded-full" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-3 w-full bg-neutral-900 rounded" />
              <div className="h-3 w-4/5 bg-neutral-900 rounded" />
              <div className="h-3 w-3/5 bg-neutral-900 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table rows skeleton for Jobs and Users tables */
export function AdminTableSkeleton({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <tbody className="divide-y divide-neutral-800/60 font-mono animate-pulse">
      {[...Array(rows)].map((_, rIdx) => (
        <tr key={rIdx} className="h-12">
          {[...Array(columns)].map((_, cIdx) => (
            <td key={cIdx} className="p-3">
              <div
                className="h-3 bg-neutral-900 rounded"
                style={{ width: `${40 + ((rIdx * 17 + cIdx * 29) % 45)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
