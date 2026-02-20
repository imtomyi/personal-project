"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WsWidgetId } from "@/lib/workspace-widgets";
import { WS_WIDGET_REGISTRY } from "@/lib/workspace-widgets";

type SortableWsWidgetProps = {
  id: WsWidgetId;
  isEditing: boolean;
  onRemove: (id: WsWidgetId) => void;
  children: React.ReactNode;
};

export default function SortableWsWidget({ id, isEditing, onRemove, children }: SortableWsWidgetProps) {
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

  const meta = WS_WIDGET_REGISTRY.find((w) => w.id === id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "z-50 opacity-70" : ""}`}
    >
      {isEditing && (
        <div className="absolute -inset-1 z-10 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/30 dark:border-blue-500 dark:bg-blue-900/10">
          <div className="absolute -top-3 left-3 flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="flex cursor-grab items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm active:cursor-grabbing"
              title="드래그하여 순서 변경"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
              {meta?.emoji} {meta?.label}
            </button>
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
