"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type TimePickerProps = {
  /** "HH:MM" format or "" */
  value: string;
  onChange: (time: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  /** Compact inline mode — small badge-like trigger */
  compact?: boolean;
  /** Custom trigger content */
  renderTrigger?: (props: { open: boolean; value: string }) => React.ReactNode;
  placeholder?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function formatHour(h: number): string {
  if (h === 0) return "오전 12";
  if (h < 12) return `오전 ${h}`;
  if (h === 12) return "오후 12";
  return `오후 ${h - 12}`;
}

function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${hour12}:${String(m).padStart(2, "0")}`;
}

function formatTimeShort(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")}${period}`;
}

export default function TimePicker({
  value,
  onChange,
  onClear,
  disabled,
  compact,
  renderTrigger,
  placeholder = "시간 선택",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [portalPos, setPortalPos] = useState<{ top: number; left: number } | null>(null);

  const parsedHour = value ? parseInt(value.split(":")[0], 10) : -1;
  const parsedMin = value ? parseInt(value.split(":")[1], 10) : -1;

  const [selectedHour, setSelectedHour] = useState(parsedHour >= 0 ? parsedHour : 9);
  const [selectedMin, setSelectedMin] = useState(parsedMin >= 0 ? parsedMin : 0);

  // Sync when value prop changes externally
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":").map(Number);
      setSelectedHour(h);
      setSelectedMin(m);
    }
  }, [value]);

  // Scroll to selected hour/minute when popup opens
  const hourListRef = useRef<HTMLDivElement>(null);
  const minListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Scroll hour list
    setTimeout(() => {
      if (hourListRef.current) {
        const sel = hourListRef.current.querySelector("[data-selected='true']");
        if (sel) sel.scrollIntoView({ block: "center", behavior: "instant" });
      }
      if (minListRef.current) {
        const sel = minListRef.current.querySelector("[data-selected='true']");
        if (sel) sel.scrollIntoView({ block: "center", behavior: "instant" });
      }
    }, 0);
  }, [open]);

  // Position popup
  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupW = 240;
    const popupH = 280;
    let left = rect.left;
    if (left + popupW > window.innerWidth - 12) left = window.innerWidth - popupW - 12;
    if (left < 12) left = 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < popupH + 8
      ? rect.top - popupH - 4
      : rect.bottom + 4;
    setPortalPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, { capture: true });
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        portalRef.current && !portalRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleSelect(h: number, m: number) {
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    setSelectedHour(h);
    setSelectedMin(m);
    onChange(timeStr);
    setOpen(false);
  }

  function handleHourClick(h: number) {
    setSelectedHour(h);
    // If minutes were already selected, apply immediately
    const m = selectedMin >= 0 ? selectedMin : 0;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    onChange(timeStr);
  }

  function handleMinClick(m: number) {
    setSelectedMin(m);
    const h = selectedHour >= 0 ? selectedHour : 9;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    onChange(timeStr);
    setOpen(false);
  }

  const displayText = value ? formatTime(value) : placeholder;
  const shortText = value ? formatTimeShort(value) : "";

  const popup = open && portalPos ? createPortal(
    <div
      ref={portalRef}
      className="fixed z-[9999] w-60 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
      style={{ top: portalPos.top, left: portalPos.left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-700">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          시간 선택
        </span>
        <span className="rounded-lg bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
          {value ? formatTime(value) : "--:--"}
        </span>
      </div>

      {/* Hour & Minute columns */}
      <div className="flex" style={{ height: 200 }}>
        {/* Hour column */}
        <div
          ref={hourListRef}
          className="flex-1 overflow-y-auto border-r border-gray-100 dark:border-gray-700"
          style={{ scrollbarWidth: "thin" }}
        >
          {HOURS.map((h) => {
            const isSelected = h === selectedHour;
            return (
              <button
                key={h}
                type="button"
                data-selected={isSelected}
                onClick={() => handleHourClick(h)}
                className={`flex w-full items-center px-3 py-1.5 text-left text-[12px] transition-colors ${
                  isSelected
                    ? "bg-blue-50 font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                }`}
              >
                <span className="w-10 text-right tabular-nums">
                  {String(h).padStart(2, "0")}
                </span>
                <span className="ml-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                  {formatHour(h)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Minute column */}
        <div
          ref={minListRef}
          className="w-20 overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          {MINUTES.map((m) => {
            const isSelected = m === selectedMin;
            return (
              <button
                key={m}
                type="button"
                data-selected={isSelected}
                onClick={() => handleMinClick(m)}
                className={`flex w-full items-center justify-center px-2 py-1.5 text-[12px] transition-colors ${
                  isSelected
                    ? "bg-blue-50 font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                }`}
              >
                <span className="tabular-nums">{String(m).padStart(2, "0")}분</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5 dark:border-gray-700">
        {/* Quick presets */}
        <div className="flex gap-1">
          {[
            { label: "오전 9시", h: 9, m: 0 },
            { label: "오후 2시", h: 14, m: 0 },
            { label: "오후 6시", h: 18, m: 0 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleSelect(preset.h, preset.m)}
              className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
        {value && onClear && (
          <button
            type="button"
            onClick={() => { onClear(); setOpen(false); }}
            className="rounded-md px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            삭제
          </button>
        )}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); !disabled && setOpen(!open); }}
        disabled={disabled}
        className={renderTrigger ? "appearance-none" : compact
          ? `inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-medium transition-all ${
              value
                ? "bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/30"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600"
            }`
          : `inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 text-[12px] transition-colors hover:border-blue-400 dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white dark:hover:border-blue-500`
        }
        title="시간 선택"
      >
        {renderTrigger ? renderTrigger({ open, value }) : (
          <>
            <svg className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {compact
              ? (value ? shortText : "시간")
              : (value ? displayText : placeholder)
            }
          </>
        )}
      </button>
      {popup}
    </div>
  );
}
