"use client";

import { useState } from "react";
import { type TemplateId } from "@/lib/templates";
import TemplateSelector from "./TemplateSelector";

type ApplyTemplateModalProps = {
  onApply: (templateId: TemplateId) => Promise<void>;
  onClose: () => void;
};

export default function ApplyTemplateModal({
  onApply,
  onClose,
}: ApplyTemplateModalProps) {
  const [selectedId, setSelectedId] = useState<TemplateId | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    if (!selectedId) return;
    setLoading(true);
    try {
      await onApply(selectedId);
      onClose();
    } catch (err) {
      console.error("Failed to apply template:", err);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add Template
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              선택한 템플릿이 기존 할 일 아래에 추가됩니다
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <TemplateSelector
          selectedId={selectedId}
          onSelect={setSelectedId}
          mode="apply"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedId || loading}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Applying..." : "Apply Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
