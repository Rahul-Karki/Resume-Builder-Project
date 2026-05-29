import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton-shimmer", className)}
      style={{ minHeight: "1em", ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3 rounded-md"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4",
        className
      )}
      aria-hidden="true"
    >
      <Skeleton className="h-4 w-3/4 rounded-md" />
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonResume() {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
      aria-hidden="true"
    >
      {/* Header block */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-5 w-1/2 rounded-md" />
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </div>
      </div>
      {/* Divider */}
      <div className="h-px bg-zinc-800" />
      {/* Content blocks */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-1/4 rounded-md" />
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonSidebar() {
  return (
    <div
      className="flex flex-col gap-2 p-4"
      aria-hidden="true"
    >
      {/* Logo */}
      <Skeleton className="h-8 w-24 rounded-md mb-6" />
      {/* Nav items */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="h-4 w-4 rounded-md" />
          <Skeleton className="h-4 flex-1 rounded-md" />
        </div>
      ))}
      {/* Spacer */}
      <div className="flex-1" />
      {/* Footer */}
      <Skeleton className="h-10 rounded-lg mt-auto" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
          >
            <Skeleton className="h-3 w-1/2 rounded-md" />
            <Skeleton className="h-8 w-1/3 rounded-md" />
            <Skeleton className="h-3 w-1/4 rounded-md" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
          >
            <Skeleton className="h-4 w-1/3 rounded-md" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <Skeleton className="h-4 w-1/4 rounded-md mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-zinc-800 last:border-0">
            <Skeleton className="h-4 w-8 rounded-md" />
            <Skeleton className="h-4 flex-1 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonAtsAnalysis() {
  return (
    <div className="flex flex-col gap-4 p-4" aria-hidden="true">
      {/* Score ring + stats */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <Skeleton className="h-6 w-12 rounded-md" />
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
      {/* Progress bar */}
      <Skeleton className="h-2 w-full rounded-full" />
      {/* Section scores */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-3 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonAiAssistant() {
  return (
    <div className="flex flex-col gap-3 p-4" aria-hidden="true">
      {/* Tone buttons */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-md" />
        ))}
      </div>
      {/* Suggestions */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
        >
          <Skeleton className="h-3 w-1/3 rounded-md" />
          <SkeletonText lines={2} />
          <div className="flex gap-2 mt-1">
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col" aria-hidden="true">
      {/* Header */}
      <div className="flex gap-4 border-b border-zinc-800 px-4 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 rounded-md" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-zinc-800 px-4 py-3"
        >
          {Array.from({ length: 4 }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-3 flex-1 rounded-md"
              style={{ width: j === 0 ? "60%" : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* Avatar + Name row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-3 w-56 rounded-md" />
        </div>
      </div>
      <SkeletonForm fields={5} />
    </div>
  );
}

export function SkeletonList({ items = 4 }: { items?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
        >
          <Skeleton className="h-4 w-4 rounded-md" />
          <div className="flex-1 flex flex-col gap-1">
            <Skeleton className="h-3 w-3/4 rounded-md" />
            <Skeleton className="h-2 w-1/2 rounded-md" />
          </div>
          <Skeleton className="h-4 w-4 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-4 w-32 rounded-md" />
      {/* Bar chart placeholder */}
      <div className="flex items-end gap-2 h-40">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonSettings() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="flex flex-col gap-4">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-px w-full bg-zinc-800" />
          <SkeletonForm fields={3} />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-zinc-950"
      aria-label="Loading page"
    >
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-4 w-60 rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonModal() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      aria-hidden="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-6 w-6 rounded-md" />
        </div>
        <SkeletonForm fields={4} />
        <div className="flex gap-3 mt-6">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTemplateGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden"
        >
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
