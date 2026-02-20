"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WidgetId } from "@/lib/types";
import { WIDGET_REGISTRY } from "@/hooks/useWidgetConfig";

type SortableWidgetProps = {
  id: WidgetId;
  isEditing: boolean;
  onRemove: (id: WidgetId) => void;
  children: React.ReactNode;
};

export default function SortableWidget({ id, isEditing, onRemove, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const meta = WIDGET_REGISTRY.find((w) => w.id === id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "z-50 opacity-70" : ""}`}
    >
      {/* 편집 모드 오버레이 */}
      {isEditing && (
        <div className="absolute -inset-1 z-10 rounded-xl border-2 border-dashed border-[#9B1B30]/40 bg-[#9B1B30]/[0.03] dark:border-[#9B1B30]/50 dark:bg-[#9B1B30]/[0.06]">
          <div className="absolute -top-3 left-3 flex items-center gap-2">
            {/* 드래그 핸들 */}
            <button
              {...attributes}
              {...listeners}
              className="flex cursor-grab items-center gap-1 rounded-full bg-[#9B1B30] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm active:cursor-grabbing"
              title="드래그하여 순서 변경"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
              {meta?.emoji} {meta?.label}
            </button>
            {/* 제거 버튼 */}
            <button
              onClick={() => onRemove(id)}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
              title="위젯 숨기기"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
