"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type CommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
};

type CommandItem = {
  label: string;
  action: string;
  icon: React.ReactNode;
};

const COMMANDS: CommandItem[] = [
  {
    label: "할 일 추가",
    action: "add-todo",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    label: "목록 보기",
    action: "view-list",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    label: "캘린더 보기",
    action: "view-calendar",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "워크스페이스 목록",
    action: "go-workspaces",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    label: "설정",
    action: "go-settings",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "경희대",
    action: "go-khu",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
  {
    label: "가계부",
    action: "go-budget",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "다크 모드 전환",
    action: "toggle-theme",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
];

export default function CommandPalette({ isOpen, onClose, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      // Auto-focus the input after a short delay (for the modal to render)
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-command-item]");
    const selectedItem = items[selectedIndex] as HTMLElement | undefined;
    selectedItem?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (action: string) => {
      onAction(action);
      onClose();
    },
    [onAction, onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K while open → close
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex].action);
        }
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose, handleSelect]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <svg
            className="h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="명령어 검색..."
            className="w-full bg-transparent text-[15px] text-gray-900 placeholder-gray-400 outline-none dark:text-white dark:placeholder-gray-500"
          />
          <kbd className="hidden flex-shrink-0 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-400 sm:inline-block dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-gray-400 dark:text-gray-500">
              결과가 없습니다
            </div>
          ) : (
            filtered.map((cmd, index) => (
              <button
                key={cmd.action}
                data-command-item
                onClick={() => handleSelect(cmd.action)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === selectedIndex
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                }`}
              >
                <span
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                    index === selectedIndex
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {cmd.icon}
                </span>
                <span className="text-[14px] font-medium">{cmd.label}</span>
                {index === selectedIndex && (
                  <kbd className="ml-auto flex-shrink-0 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500">
                    Enter
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-gray-200 px-4 py-2 dark:border-gray-700">
          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-px text-[10px] dark:border-gray-600 dark:bg-gray-700">↑↓</kbd>
            탐색
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-px text-[10px] dark:border-gray-600 dark:bg-gray-700">Enter</kbd>
            선택
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-px text-[10px] dark:border-gray-600 dark:bg-gray-700">Esc</kbd>
            닫기
          </span>
        </div>
      </div>
    </div>
  );
}
