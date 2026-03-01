"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { parseLocalDate, toDateStr, formatDuration, formatDurationShort } from "@/lib/date";
import { DURATION_PRESETS } from "@/lib/constants";

type DurationPickerProps = {
  /** Duration in hours */
  value: number;
  dueDate?: string | null;
  onChange: (hours: number) => void;
  compact?: boolean;
};

// Snap points for the slider (in hours)
const SNAP_POINTS = [1, 2, 3, 4, 6, 8, 12, 24, 48, 72, 120, 168, 336, 720];
// labels:          1h 2h 3h 4h 6h 8h 12h 1d  2d  3d   5d   1w   2w   1mo


function getEndDateStr(dueDate: string, hours: number): string {
  const start = parseLocalDate(dueDate);
  const end = new Date(start);
  const daysToAdd = Math.max(0, Math.ceil(hours / 24) - 1);
  end.setDate(end.getDate() + daysToAdd);
  return toDateStr(end);
}

/** Convert hours to a 0-1 slider position (logarithmic scale) */
function hoursToPosition(hours: number): number {
  const minLog = Math.log(1);
  const maxLog = Math.log(720);
  const clamped = Math.max(1, Math.min(720, hours));
  return (Math.log(clamped) - minLog) / (maxLog - minLog);
}

/** Convert 0-1 slider position to hours, snapped to nearest snap point */
function positionToHours(pos: number): number {
  const minLog = Math.log(1);
  const maxLog = Math.log(720);
  const logVal = minLog + pos * (maxLog - minLog);
  const rawHours = Math.exp(logVal);

  // Find closest snap point
  let closest = SNAP_POINTS[0];
  let minDist = Infinity;
  for (const snap of SNAP_POINTS) {
    const dist = Math.abs(Math.log(rawHours) - Math.log(snap));
    if (dist < minDist) {
      minDist = dist;
      closest = snap;
    }
  }
  return closest;
}


export default function DurationPicker({ value, dueDate, onChange, compact }: DurationPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Calculate popover position (absolute — scrolls with page)
  const updatePopoverPos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverWidth = 288;
    const popoverHeight = 280;
    let left = rect.left + window.scrollX;
    if (rect.left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16 + window.scrollX;
    }
    if (left < 16) left = 16;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < popoverHeight + 8
      ? rect.top + window.scrollY - popoverHeight - 4
      : rect.bottom + window.scrollY + 4;
    setPopoverPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePopoverPos();
    // resize만 추적, scroll은 추적하지 않아 페이지와 함께 자연스럽게 스크롤됨
    window.addEventListener("resize", updatePopoverPos);
    return () => {
      window.removeEventListener("resize", updatePopoverPos);
    };
  }, [open, updatePopoverPos]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Keyboard arrow support when dropdown is open
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      const currentIndex = SNAP_POINTS.indexOf(localValue);
      let newIndex = currentIndex;

      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        newIndex = Math.min(currentIndex + 1, SNAP_POINTS.length - 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
      } else {
        return;
      }

      if (newIndex !== currentIndex) {
        const newValue = SNAP_POINTS[newIndex];
        setLocalValue(newValue);
        onChange(newValue);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, localValue, onChange]);

  const updateFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const hours = positionToHours(pos);
    setLocalValue(hours);
    return hours;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    updateFromPosition(e.clientX);
  }, [updateFromPosition]);

  useEffect(() => {
    if (!dragging) return;

    function handleMouseMove(e: MouseEvent) {
      updateFromPosition(e.clientX);
    }
    function handleMouseUp(e: MouseEvent) {
      setDragging(false);
      const hours = updateFromPosition(e.clientX);
      if (hours !== undefined) onChange(hours);
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, updateFromPosition, onChange]);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setDragging(true);
    updateFromPosition(e.touches[0].clientX);
  }, [updateFromPosition]);

  useEffect(() => {
    if (!dragging) return;

    function handleTouchMove(e: TouchEvent) {
      updateFromPosition(e.touches[0].clientX);
    }
    function handleTouchEnd(e: TouchEvent) {
      setDragging(false);
      const touch = e.changedTouches[0];
      const hours = updateFromPosition(touch.clientX);
      if (hours !== undefined) onChange(hours);
    }
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [dragging, updateFromPosition, onChange]);

  const position = hoursToPosition(localValue);
  const endDate = dueDate ? getEndDateStr(dueDate, localValue) : null;

  // Tick marks for the slider
  const ticks = [
    { hours: 1, label: "1h" },
    { hours: 4, label: "4h" },
    { hours: 12, label: "12h" },
    { hours: 24, label: "1일" },
    { hours: 72, label: "3일" },
    { hours: 168, label: "1주" },
    { hours: 720, label: "1달" },
  ];

  // Quick preset buttons
  const presets = DURATION_PRESETS.map(p => ({ hours: p.value, label: p.label }));

  const popoverContent = open ? createPortal(
    <div
      ref={popoverRef}
      className="absolute z-[9999] w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-600 dark:bg-gray-800"
      style={{ top: popoverPos.top, left: popoverPos.left }}
      onClick={(e) => e.stopPropagation()}
    >
          {/* Current value display */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              기간 설정
            </span>
            <span className="rounded-lg bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
              {formatDuration(localValue)}
            </span>
          </div>

          {/* Slider track */}
          <div className="mb-1 px-1">
            <div
              ref={trackRef}
              className="relative h-8 cursor-pointer select-none"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Background track */}
              <div className="absolute left-0 right-0 top-3 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />

              {/* Filled track */}
              <div
                className="absolute left-0 top-3 h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                style={{ width: `${position * 100}%`, transition: dragging ? "none" : undefined }}
              />

              {/* Tick marks */}
              {ticks.map((tick) => {
                const tickPos = hoursToPosition(tick.hours);
                return (
                  <div
                    key={tick.hours}
                    className="absolute top-2.5"
                    style={{ left: `${tickPos * 100}%`, transform: "translateX(-50%)" }}
                  >
                    <div className={`h-3 w-0.5 rounded-full ${
                      tick.hours <= localValue
                        ? "bg-blue-400 dark:bg-blue-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`} />
                  </div>
                );
              })}

              {/* Thumb */}
              <div
                className={`absolute top-1 h-6 w-6 rounded-full border-2 border-blue-500 bg-white shadow-md dark:bg-gray-700 ${
                  dragging ? "scale-110 shadow-lg" : "hover:scale-105"
                }`}
                style={{
                  left: `${position * 100}%`,
                  transform: "translateX(-50%)",
                  transition: dragging ? "none" : "left 0.15s ease, transform 0.1s ease",
                }}
              >
                {/* Grip lines */}
                <div className="flex h-full items-center justify-center gap-px">
                  <div className="h-2.5 w-px rounded-full bg-blue-400" />
                  <div className="h-2.5 w-px rounded-full bg-blue-400" />
                  <div className="h-2.5 w-px rounded-full bg-blue-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Tick labels */}
          <div className="relative mb-3 h-4 px-1">
            {ticks.map((tick) => {
              const tickPos = hoursToPosition(tick.hours);
              return (
                <span
                  key={tick.hours}
                  className="absolute text-[9px] text-gray-400 dark:text-gray-500"
                  style={{ left: `${tickPos * 100}%`, transform: "translateX(-50%)" }}
                >
                  {tick.label}
                </span>
              );
            })}
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.hours}
                onClick={() => { setLocalValue(preset.hours); onChange(preset.hours); }}
                className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                  value === preset.hours
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date range preview */}
          {dueDate && endDate && (
            <div className="mt-3 rounded-lg bg-gray-50 px-2.5 py-1.5 dark:bg-gray-700/50">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {dueDate.replace(/-/g, ".")} → {endDate.replace(/-/g, ".")}
                {localValue < 24 && (
                  <span className="ml-1 text-blue-500">({formatDuration(localValue)})</span>
                )}
              </p>
            </div>
          )}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`inline-flex items-center gap-1 rounded-lg font-medium transition-all ${
          compact
            ? "px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
            : "px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
        }`}
      >
        <svg className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {formatDuration(value)}
      </button>
      {popoverContent}
    </div>
  );
}
