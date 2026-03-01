"use client";

import { useEffect } from "react";

type KeyboardShortcutsProps = {
  onOpenCommandPalette: () => void;
};

export default function KeyboardShortcuts({ onOpenCommandPalette }: KeyboardShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Cmd+K / Ctrl+K: open command palette (works even inside inputs)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        onOpenCommandPalette();
        return;
      }

      // Skip other shortcuts when inside an input
      if (isInput) return;

      // Q: focus AddTodo input
      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        document.getElementById("add-todo-input")?.focus();
        return;
      }
    }

    // Use capture phase to intercept before browser defaults (e.g. address bar focus)
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onOpenCommandPalette]);

  return null;
}
