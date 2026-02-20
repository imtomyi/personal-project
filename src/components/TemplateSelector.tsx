"use client";

import { TEMPLATES, type TemplateId } from "@/lib/templates";

type TemplateSelectorProps = {
  selectedId: TemplateId | null;
  onSelect: (id: TemplateId | null) => void;
  mode: "create" | "apply";
};

export default function TemplateSelector({
  selectedId,
  onSelect,
  mode,
}: TemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {mode === "create" ? "Template" : "Choose a template to add"}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {mode === "create" && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`rounded-lg border p-3 text-left transition-all ${
              selectedId === null
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-900/20 dark:border-blue-500"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
            }`}
          >
            <div className="text-base">📋</div>
            <p className="mt-1 text-xs font-medium text-gray-900 dark:text-white">
              Empty
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-gray-500 dark:text-gray-400">
              빈 워크스페이스로 시작합니다
            </p>
          </button>
        )}
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={`rounded-lg border p-3 text-left transition-all ${
              selectedId === template.id
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-900/20 dark:border-blue-500"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
            }`}
          >
            <div className="text-base">{template.icon}</div>
            <p className="mt-1 text-xs font-medium text-gray-900 dark:text-white">
              {template.name}
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-gray-500 dark:text-gray-400">
              {template.description}
            </p>
            <div className="mt-2 space-y-0.5">
              {template.items
                .filter((item) => item.isHeader)
                .slice(0, 3)
                .map((item, i) => (
                  <p
                    key={i}
                    className="truncate text-[10px] text-gray-400 dark:text-gray-500"
                  >
                    · {item.title}
                  </p>
                ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
