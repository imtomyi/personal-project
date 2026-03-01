"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { todayKST } from "@/lib/date";
import { WEEKDAY_LABELS } from "@/lib/constants";

type DatePickerProps = {
  value: string;            // "YYYY-MM-DD" or ""
  onChange: (date: string) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Icon-only trigger for inline use (e.g. todo items) */
  inline?: boolean;
  onClear?: () => void;
  /** Custom trigger content — replaces default inline trigger button content */
  renderTrigger?: (props: { open: boolean }) => React.ReactNode;
};

const WEEKDAYS = WEEKDAY_LABELS;

function formatDateKR(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = WEEKDAYS[d.getDay()];

  const today = todayKST();
  if (dateStr === today) return `오늘 · ${month}월 ${day}일 (${dow})`;

  const tmr = new Date(today + "T00:00:00");
  tmr.setDate(tmr.getDate() + 1);
  if (dateStr === tmr.toISOString().slice(0, 10))
    return `내일 · ${month}월 ${day}일 (${dow})`;

  return `${month}월 ${day}일 (${dow})`;
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function DatePicker({ value, onChange, disabled, compact, inline, onClear, renderTrigger }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const effectiveValue = value || todayKST();
  const selected = new Date(effectiveValue + "T00:00:00");
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const todayStr = todayKST();
  const todayDate = new Date(todayStr + "T00:00:00");

  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        (!portalRef.current || !portalRef.current.contains(target))
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!value) return;
    const d = new Date(value + "T00:00:00");
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function goToday() {
    onChange(todayStr);
    setOpen(false);
  }

  function selectDate(day: number) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1,
  );

  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false });
  }

  const selectedStr = effectiveValue;

  // Calculate portal popup position for inline mode
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [portalPos, setPortalPos] = useState<{ top: number; left: number } | null>(null);

  const updatePortalPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupW = 260; // w-64 = 16rem = 256px + padding
    let left = rect.right - popupW;
    if (left < 8) left = 8;
    if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < 320 ? rect.top + window.scrollY - 320 : rect.bottom + window.scrollY + 4;
    setPortalPos({ top, left });
  }, []);

  useEffect(() => {
    if (open && inline) {
      updatePortalPos();
      window.addEventListener("scroll", updatePortalPos, true);
      window.addEventListener("resize", updatePortalPos);
      return () => {
        window.removeEventListener("scroll", updatePortalPos, true);
        window.removeEventListener("resize", updatePortalPos);
      };
    }
  }, [open, inline, updatePortalPos]);

  // Inline mode: small icon button with optional date chip
  if (inline) {
    return (
      <div ref={ref} className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => { e.stopPropagation(); !disabled && setOpen(!open); }}
          disabled={disabled}
          className={renderTrigger ? "appearance-none" : `flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition-colors ${
            value
              ? "text-blue-500 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              : "text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-700"
          }`}
          title="날짜 선택"
        >
          {renderTrigger ? renderTrigger({ open }) : (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {value && <span>{formatDateShort(value)}</span>}
            </>
          )}
        </button>

        {open && portalPos && createPortal(
          <div
            ref={portalRef}
            className="fixed z-[9999] w-64 rounded-xl border border-gray-200 bg-white p-2.5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
            style={{ top: portalPos.top, left: portalPos.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {renderCalendar()}
            {/* Footer */}
            <div className="mt-1.5 flex items-center justify-between border-t border-gray-100 pt-1.5 dark:border-gray-700">
              <button
                type="button"
                onClick={goToday}
                className="rounded-md px-2 py-0.5 text-[11px] font-medium text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                오늘
              </button>
              {value && onClear && (
                <button
                  type="button"
                  onClick={() => { onClear(); setOpen(false); }}
                  className="rounded-md px-2 py-0.5 text-[11px] text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  삭제
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  function renderCalendar() {
    return (
      <>
        {/* Header */}
        <div className="mb-1.5 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            {viewYear}년 {viewMonth + 1}월
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="mb-0.5 grid grid-cols-7 text-center">
          {WEEKDAYS.map((wd, i) => (
            <span
              key={wd}
              className={`py-0.5 text-[10px] font-semibold ${
                i === 0
                  ? "text-red-400 dark:text-red-500"
                  : i === 6
                    ? "text-blue-400 dark:text-blue-500"
                    : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {wd}
            </span>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, idx) => {
            if (!cell.current) {
              return (
                <span
                  key={`empty-${idx}`}
                  className="flex h-7 w-full items-center justify-center text-[11px] text-gray-300 dark:text-gray-600"
                >
                  {cell.day}
                </span>
              );
            }

            const m = String(viewMonth + 1).padStart(2, "0");
            const d = String(cell.day).padStart(2, "0");
            const dateStr = `${viewYear}-${m}-${d}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedStr;
            const dayOfWeek = new Date(dateStr + "T00:00:00").getDay();

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => selectDate(cell.day)}
                className={`flex h-7 w-full items-center justify-center rounded-lg text-[11px] font-medium transition-all
                  ${isSelected
                    ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30"
                    : isToday
                      ? "bg-blue-50 font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      : dayOfWeek === 0
                        ? "text-red-400 hover:bg-gray-100 dark:text-red-500 dark:hover:bg-gray-700"
                        : dayOfWeek === 6
                          ? "text-blue-400 hover:bg-gray-100 dark:text-blue-500 dark:hover:bg-gray-700"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <div ref={ref} className="relative">
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={compact
          ? "flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1 text-xs transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
          : "flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-700/60 dark:active:bg-gray-600"
        }
      >
        <svg
          className={compact ? "h-3 w-3 text-gray-400 dark:text-gray-500" : "h-4 w-4 text-gray-400 dark:text-gray-500"}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className={compact ? "text-xs text-gray-700 dark:text-gray-300" : "text-sm text-gray-700 dark:text-gray-300"}>
          {formatDateKR(effectiveValue)}
        </span>
        {!compact && (
          <svg
            className={`h-3 w-3 text-gray-300 transition-transform dark:text-gray-600 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* 드롭다운 캘린더 */}
      {open && (
        <div className={`absolute top-full z-50 mt-1.5 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-800 ${compact ? "right-0" : "left-0"}`}>
          {/* 헤더: 월 네비게이션 */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {viewYear}년 {viewMonth + 1}월
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {WEEKDAYS.map((wd, i) => (
              <span
                key={wd}
                className={`py-1 text-[11px] font-semibold ${
                  i === 0
                    ? "text-red-400 dark:text-red-500"
                    : i === 6
                      ? "text-blue-400 dark:text-blue-500"
                      : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {wd}
              </span>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, idx) => {
              if (!cell.current) {
                return (
                  <span
                    key={`empty-${idx}`}
                    className="flex h-8 w-full items-center justify-center text-xs text-gray-300 dark:text-gray-600"
                  >
                    {cell.day}
                  </span>
                );
              }

              const m = String(viewMonth + 1).padStart(2, "0");
              const d = String(cell.day).padStart(2, "0");
              const dateStr = `${viewYear}-${m}-${d}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedStr;
              const dayOfWeek = new Date(dateStr + "T00:00:00").getDay();

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => selectDate(cell.day)}
                  className={`flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition-all
                    ${isSelected
                      ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30"
                      : isToday
                        ? "bg-blue-50 font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : dayOfWeek === 0
                          ? "text-red-400 hover:bg-gray-100 dark:text-red-500 dark:hover:bg-gray-700"
                          : dayOfWeek === 6
                            ? "text-blue-400 hover:bg-gray-100 dark:text-blue-500 dark:hover:bg-gray-700"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* 하단: 오늘 바로가기 */}
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-700">
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg px-3 py-1 text-xs font-medium text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              오늘
            </button>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {todayDate.getMonth() + 1}월 {todayDate.getDate()}일
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
