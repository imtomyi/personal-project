"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ScheduleBlock } from "@/lib/autoScheduler";
import { minutesToTime } from "@/lib/date";

type BlockActionPopoverProps = {
  block: ScheduleBlock;
  anchorRect: DOMRect;
  onPostpone: () => void;
  onRemove: () => void;
  onReschedule: (startMin: number, endMin: number) => void;
  onClose: () => void;
};

const TIME_SLOTS = [
  { label: "🌅 오전", desc: "9:00", startMin: 540 },
  { label: "☀️ 오후", desc: "14:00", startMin: 840 },
  { label: "🌙 저녁", desc: "19:30", startMin: 1170 },
] as const;

export default function BlockActionPopover({
  block,
  anchorRect,
  onPostpone,
  onRemove,
  onReschedule,
  onClose,
}: BlockActionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const duration = block.endMin - block.startMin;

  // 포지셔닝 계산
  useEffect(() => {
    const popW = 192; // w-48 = 12rem = 192px
    const popH = showTimeSlots ? 260 : 148;

    let left = anchorRect.right + 8;
    // 오른쪽 공간 부족 시 왼쪽에 표시
    if (left + popW > window.innerWidth - 16) {
      left = anchorRect.left - popW - 8;
    }
    if (left < 8) left = 8;

    let top = anchorRect.top;
    // 아래쪽 공간 부족 시 위로 올림
    if (top + popH > window.innerHeight - 16) {
      top = window.innerHeight - popH - 16;
    }
    if (top < 8) top = 8;

    setPos({ top, left });
  }, [anchorRect, showTimeSlots]);

  // 바깥 클릭 닫기
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  // ESC 키 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-50 w-48 overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-xl dark:border-white/[0.1] dark:bg-[#2c2c2e]"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* 블록 정보 헤더 */}
      <div className="border-b border-black/[0.06] px-3 py-2 dark:border-white/[0.06]">
        <p className="truncate text-[12px] font-semibold text-foreground dark:text-white">
          {block.title}
        </p>
        <p className="text-[10px] text-secondary">
          {minutesToTime(block.startMin)} - {minutesToTime(block.endMin)}
        </p>
      </div>

      {/* 액션 목록 */}
      <div className="py-1">
        <button
          onClick={() => { onPostpone(); }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/[0.06]"
        >
          <span className="w-4 text-center text-[13px]">⏭️</span>
          내일로 넘기기
        </button>

        <button
          onClick={() => { onRemove(); }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/15"
        >
          <span className="w-4 text-center text-[13px]">🗑️</span>
          시간표에서 제거
        </button>

        <div className="mx-2 my-0.5 border-t border-black/[0.06] dark:border-white/[0.06]" />

        <button
          onClick={() => setShowTimeSlots((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/[0.06]"
        >
          <span className="flex items-center gap-2">
            <span className="w-4 text-center text-[13px]">🕐</span>
            시간대 변경
          </span>
          <svg
            className={`h-3 w-3 text-secondary transition-transform ${showTimeSlots ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 시간대 슬롯 */}
        {showTimeSlots && (
          <div className="mx-2 mb-1 space-y-0.5 rounded-lg bg-black/[0.03] p-1 dark:bg-white/[0.04]">
            {TIME_SLOTS.map((slot) => {
              const newEndMin = slot.startMin + duration;
              const isCurrentSlot =
                block.startMin >= slot.startMin - 30 && block.startMin < slot.startMin + 30;
              return (
                <button
                  key={slot.startMin}
                  onClick={() => onReschedule(slot.startMin, newEndMin)}
                  disabled={isCurrentSlot}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] transition-colors ${
                    isCurrentSlot
                      ? "bg-[#007AFF]/10 font-medium text-[#007AFF]"
                      : "text-foreground hover:bg-black/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <span>{slot.label}</span>
                  <span className="text-[10px] text-secondary">
                    {minutesToTime(slot.startMin)} - {minutesToTime(newEndMin)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
