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

          {/* Chart Canvas Placeholder - SVG Line Graph Skeleton */}
          <div className="relative pt-1 space-y-2">
            {/* Status bar placeholder */}
            <div className="min-h-7 flex items-center justify-between text-xs px-1">
              <div />
              <div className="h-2.5 w-16 bg-neutral-900 rounded font-mono" />
            </div>

            {/* SVG Line Graph Container */}
            <div className="border border-neutral-800/80 bg-black/60 rounded-xl p-3 relative overflow-hidden">
              <svg
                viewBox="0 0 500 150"
                className="w-full h-44 overflow-visible"
              >
                <defs>
                  <linearGradient id="skeletonUserAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="60%" stopColor="#10b981" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="skeletonUserLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Guides */}
                <line x1="24" y1="22" x2="476" y2="22" stroke="#262626" strokeDasharray="4 4" strokeWidth="1" />
                <line x1="24" y1="76" x2="476" y2="76" stroke="#262626" strokeDasharray="4 4" strokeWidth="1" />
                <line x1="24" y1="130" x2="476" y2="130" stroke="#262626" strokeWidth="1" />

                {/* Smooth Area Wave Fill */}
                <path
                  d="M 24 110 C 58 110, 75 80, 108 80 C 142 80, 159 100, 193 90 C 227 80, 244 55, 278 50 C 312 45, 329 85, 363 75 C 397 65, 414 38, 448 38 C 462 38, 470 55, 476 60 L 476 130 L 24 130 Z"
                  fill="url(#skeletonUserAreaGrad)"
                />

                {/* Smooth Glowing Line Curve */}
                <path
                  d="M 24 110 C 58 110, 75 80, 108 80 C 142 80, 159 100, 193 90 C 227 80, 244 55, 278 50 C 312 45, 329 85, 363 75 C 397 65, 414 38, 448 38 C 462 38, 470 55, 476 60"
                  fill="none"
                  stroke="url(#skeletonUserLineGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Line Points along the curve */}
                {[
                  { cx: 24, cy: 110 },
                  { cx: 58, cy: 96 },
                  { cx: 93, cy: 82 },
                  { cx: 127, cy: 85 },
                  { cx: 162, cy: 95 },
                  { cx: 196, cy: 88 },
                  { cx: 231, cy: 68 },
                  { cx: 265, cy: 52 },
                  { cx: 300, cy: 50 },
                  { cx: 334, cy: 78 },
                  { cx: 369, cy: 72 },
                  { cx: 403, cy: 54 },
                  { cx: 438, cy: 38 },
                  { cx: 476, cy: 60 },
                ].map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.cx}
                    cy={pt.cy}
                    r="3"
                    className="fill-neutral-900 stroke-neutral-700/80"
                    strokeWidth="1.5"
                  />
                ))}
              </svg>

              {/* X-Axis Date Labels Skeleton */}
              <div className="flex justify-between items-center text-[10px] pt-2 px-2 border-t border-neutral-900">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-2 w-9 bg-neutral-900 rounded" />
                ))}
              </div>
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
