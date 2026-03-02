"use client";

import { useState } from "react";
import type { Todo } from "@/lib/types";
import type { ScheduleBlock } from "@/lib/autoScheduler";
import { minutesToTime } from "@/lib/date";

type PostponeItem = {
  block: ScheduleBlock;
  todo: Todo;
  workspaceName?: string;
};

type PostponeTodoModalProps = {
  items: PostponeItem[];
  onPostpone: (todoIds: string[]) => Promise<void>;
  onClose: () => void;
};

export default function PostponeTodoModal({
  items,
  onPostpone,
  onClose,
}: PostponeTodoModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.map((it) => it.todo.id)),
  );
  const [processing, setProcessing] = useState(false);

  const allSelected = selected.size === items.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((it) => it.todo.id)));
    }
  }

  function toggle(todoId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(todoId)) next.delete(todoId);
      else next.add(todoId);
      return next;
    });
  }

  async function handlePostpone() {
    if (selected.size === 0 || processing) return;
    setProcessing(true);
    try {
      await onPostpone(Array.from(selected));
      onClose();
    } catch {
      // ignore
    } finally {
      setProcessing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1c1c1e]">
          <div className="text-center">
            <div className="mb-3 text-4xl">✅</div>
            <h2 className="text-[16px] font-semibold text-foreground dark:text-white">
              넘길 할 일이 없습니다
            </h2>
            <p className="mt-1 text-[13px] text-secondary">
              모든 할 일이 완료되었거나, 시간표에 배치된 할 일이 없습니다
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-xl bg-[#007AFF] px-6 py-2.5 text-[13px] font-medium text-white hover:bg-[#0056b3]"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1c1c1e]">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-foreground dark:text-white">
            <span>⏭️</span>
            내일로 넘기기
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.1] dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-3 text-[12px] text-secondary">
          내일로 넘길 할 일을 선택하세요. 마감일이 내일로 변경됩니다.
        </p>

        {/* Select All */}
        <button
          onClick={toggleAll}
          className="mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-secondary hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
        >
          <span
            className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
              allSelected
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            {allSelected && "✓"}
          </span>
          전체 선택
        </button>

        {/* Item List */}
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {items.map(({ block, todo, workspaceName }) => (
            <button
              key={todo.id}
              onClick={() => toggle(todo.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                selected.has(todo.id)
                  ? "bg-orange-50 dark:bg-orange-900/15"
                  : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              }`}
            >
              {/* Checkbox */}
              <span
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] ${
                  selected.has(todo.id)
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {selected.has(todo.id) && "✓"}
              </span>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground dark:text-white">
                  {todo.title}
                </p>
                <p className="text-[10px] text-secondary">
                  {minutesToTime(block.startMin)} - {minutesToTime(block.endMin)}
                  {workspaceName && ` · ${workspaceName}`}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-black/[0.05] px-4 py-2.5 text-[13px] font-medium text-secondary hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
          >
            취소
          </button>
          <button
            onClick={handlePostpone}
            disabled={selected.size === 0 || processing}
            className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-40"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-1">
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                처리 중...
              </span>
            ) : (
              `⏭️ 넘기기 (${selected.size}개)`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
