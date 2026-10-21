"use client";

import React from "react";

export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="h-4 w-20 rounded-full bg-slate-200" />
            <div className="h-4 w-12 rounded-full bg-slate-100" />
          </div>
          <div className="mt-4 h-6 w-3/4 rounded-xl bg-slate-200" />
          <div className="mt-2.5 space-y-2">
            <div className="h-3.5 w-full rounded-lg bg-slate-100" />
            <div className="h-3.5 w-5/6 rounded-lg bg-slate-100" />
          </div>
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="h-8 w-24 rounded-xl bg-slate-200" />
            <div className="h-6 w-16 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3 animate-pulse"
        >
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-slate-200" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-1/3 rounded-lg bg-slate-200" />
            <div className="h-3 w-2/3 rounded-lg bg-slate-100" />
          </div>
          <div className="h-4 w-12 rounded-full bg-slate-100 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 animate-pulse"
        >
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="mt-3 h-8 w-16 rounded-xl bg-slate-300" />
          <div className="mt-2 h-2.5 w-32 rounded-lg bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export function AiResponseSkeleton() {
  return (
    <div className="space-y-3 p-4 rounded-2xl border border-blue-100 bg-blue-50/30 animate-pulse">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping" />
        <div className="h-3.5 w-36 rounded-full bg-blue-200" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 w-full rounded-md bg-slate-200" />
        <div className="h-3 w-11/12 rounded-md bg-slate-200" />
        <div className="h-3 w-4/5 rounded-md bg-slate-200" />
      </div>
      <div className="pt-2 flex gap-2">
        <div className="h-6 w-20 rounded-lg bg-blue-100" />
        <div className="h-6 w-24 rounded-lg bg-blue-100" />
      </div>
    </div>
  );
}
