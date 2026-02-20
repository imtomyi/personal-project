"use client";

import type { WsWidgetId, WsWidgetConfig } from "@/lib/workspace-widgets";
import { WS_WIDGET_REGISTRY } from "@/lib/workspace-widgets";

type WsWidgetPickerProps = {
  widgets: WsWidgetConfig[];
  onToggle: (id: WsWidgetId) => void;
  onReset: () => void;
  onClose: () => void;
};

export default function WsWidgetPicker({ widgets, onToggle, onReset, onClose }: WsWidgetPickerProps) {
  const hiddenWidgets = widgets.filter((w) => !w.visible);

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-blue-800/50 dark:from-blue-900/20 dark:to-indigo-900/20">
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
            className="rounded-lg bg-blue-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-blue-600"
          >
            완료
          </button>
        </div>
      </div>

      {/* Visible */}
      <div className="mb-2">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          표시 중
        </p>
        <div className="flex flex-wrap gap-1.5">
          {widgets
            .filter((w) => w.visible)
            .sort((a, b) => a.order - b.order)
            .map((w) => {
              const meta = WS_WIDGET_REGISTRY.find((m) => m.id === w.id);
              if (!meta) return null;
              return (
                <button
                  key={w.id}
                  onClick={() => onToggle(w.id)}
                  className="group inline-flex items-center gap-1 rounded-full border border-blue-300 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-blue-600 dark:bg-gray-800 dark:text-blue-400 dark:hover:border-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
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

      {/* Hidden */}
      {hiddenWidgets.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            숨김
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hiddenWidgets.map((w) => {
              const meta = WS_WIDGET_REGISTRY.find((m) => m.id === w.id);
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
