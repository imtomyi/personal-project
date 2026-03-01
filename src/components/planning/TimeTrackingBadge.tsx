"use client";

import type { TimeEntry } from "@/lib/types";

type TimeTrackingBadgeProps = {
  todoId: string;
  activeEntry: TimeEntry | undefined;
  totalSeconds: number;
  elapsedSeconds: number;
  formatTime: (seconds: number) => string;
  onStart: (todoId: string) => Promise<void>;
  onStop: (entryId: string) => Promise<void>;
};

export default function TimeTrackingBadge({
  todoId,
  activeEntry,
  totalSeconds,
  elapsedSeconds,
  formatTime,
  onStart,
  onStop,
}: TimeTrackingBadgeProps) {
  const isRunning = !!activeEntry;
  const displayTime = isRunning
    ? formatTime(totalSeconds + elapsedSeconds)
    : totalSeconds > 0
    ? formatTime(totalSeconds)
    : null;

  return (
    <div className="flex items-center gap-1">
      {displayTime && (
        <span
          className={`text-[10px] font-medium tabular-nums ${
            isRunning ? "text-red-500" : "text-secondary"
          }`}
        >
          {displayTime}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isRunning && activeEntry) {
            onStop(activeEntry.id);
          } else {
            onStart(todoId);
          }
        }}
        className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors ${
          isRunning
            ? "bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
            : "text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08]"
        }`}
        title={isRunning ? "타이머 정지" : "타이머 시작"}
      >
        {isRunning ? (
          // Stop icon (square)
          <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        ) : (
          // Play icon (triangle)
          <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      {isRunning && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
      )}
    </div>
  );
}
