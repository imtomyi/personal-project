"use client";

import type { WidgetId, WidgetConfig } from "@/lib/types";
import { WIDGET_REGISTRY } from "@/hooks/useWidgetConfig";

type WidgetPickerProps = {
  widgets: WidgetConfig[];
  onToggle: (id: WidgetId) => void;
  onReset: () => void;
  onClose: () => void;
};

export default function WidgetPicker({ widgets, onToggle, onReset, onClose }: WidgetPickerProps) {
  const hiddenWidgets = widgets.filter((w) => !w.visible);

  return (
    <div className="rounded-[20px] border border-[#9B1B30]/15 bg-gradient-to-r from-[#9B1B30]/[0.04] to-[#d4465e]/[0.04] p-4 dark:border-[#9B1B30]/20 dark:from-[#9B1B30]/[0.08] dark:to-[#d4465e]/[0.08]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            위젯 편집
          </h3>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            드래그로 순서 변경 · 클릭으로 추가/제거
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="rounded-lg px-2 py-1 text-[11px] text-gray-500 hover:bg-white hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            초기화
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-[#9B1B30] px-3 py-1 text-[11px] font-medium text-white hover:bg-[#7a1526]"
          >
            완료
          </button>
        </div>
      </div>

      {/* 현재 표시 중인 위젯 */}
      <div className="mb-2">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          표시 중
        </p>
        <div className="flex flex-wrap gap-1.5">
          {widgets
            .filter((w) => w.visible)
            .sort((a, b) => a.order - b.order)
            .map((w) => {
              const meta = WIDGET_REGISTRY.find((m) => m.id === w.id);
              if (!meta) return null;
              return (
                <button
                  key={w.id}
                  onClick={() => onToggle(w.id)}
                  className="group inline-flex items-center gap-1 rounded-full border border-[#9B1B30]/30 bg-white px-2.5 py-1 text-[11px] font-medium text-[#9B1B30] transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-[#9B1B30]/40 dark:bg-gray-800 dark:text-[#e8a0ad] dark:hover:border-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  title={`${meta.label} 숨기기`}
                >
                  {meta.emoji} {meta.label}
                  <svg className="h-3 w-3 text-gray-400 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              );
            })}
        </div>
      </div>

      {/* 숨겨진 위젯 */}
      {hiddenWidgets.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            숨김
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hiddenWidgets.map((w) => {
              const meta = WIDGET_REGISTRY.find((m) => m.id === w.id);
              if (!meta) return null;
              return (
                <button
                  key={w.id}
                  onClick={() => onToggle(w.id)}
                  className="group inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 bg-white/50 px-2.5 py-1 text-[11px] font-medium text-gray-400 transition-all hover:border-green-400 hover:bg-green-50 hover:text-green-600 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-500 dark:hover:border-green-500 dark:hover:bg-green-900/20 dark:hover:text-green-400"
                  title={`${meta.label} 추가`}
                >
                  {meta.emoji} {meta.label}
                  <svg className="h-3 w-3 text-gray-300 group-hover:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
