"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import KeyboardShortcuts from "./KeyboardShortcuts";
import CommandPalette from "./CommandPalette";

export default function GlobalShortcuts() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toggleTheme } = useTheme();

  // Check if we're on a workspace detail page (which has its own shortcuts)
  const isWorkspaceDetail = /^\/workspace\/[^/]+$/.test(pathname ?? "");

  const handleCommandAction = useCallback(
    (action: string) => {
      switch (action) {
        case "add-todo":
          document.getElementById("add-todo-input")?.focus();
          break;
        case "view-list":
        case "view-calendar":
        case "view-matrix":
          // These only work on workspace detail — dispatch custom event
          window.dispatchEvent(new CustomEvent("command-action", { detail: action }));
          break;
        case "go-workspaces":
          router.push("/workspace");
          break;
        case "go-settings":
          router.push("/settings");
          break;
        case "go-khu":
          router.push("/khu");
          break;
        case "go-budget":
          router.push("/budget");
          break;
        case "toggle-theme":
          toggleTheme();
          break;
      }
    },
    [router, toggleTheme]
  );

  // Skip rendering if workspace detail page handles its own shortcuts
  if (isWorkspaceDetail) return null;

  return (
    <>
      <KeyboardShortcuts onOpenCommandPalette={() => setShowCommandPalette((prev) => !prev)} />
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onAction={handleCommandAction}
      />
    </>
  );
}
