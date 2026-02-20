"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Todo } from "@/lib/types";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import { parseLocalDate } from "@/lib/date";

const REMINDER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEADLINE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useReminders(todos: Todo[]) {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  // Check initial permission state
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermissionGranted(Notification.permission === "granted");
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "granted") {
      setPermissionGranted(true);
      return;
    }

    if (Notification.permission !== "denied") {
      const result = await Notification.requestPermission();
      setPermissionGranted(result === "granted");
    }
  }, []);

  // Request permission on first mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Check for upcoming deadlines and send notifications
  const checkReminders = useCallback(() => {
    if (!permissionGranted) return;

    const now = new Date();
    const windowEnd = new Date(now.getTime() + DEADLINE_WINDOW_MS);

    const realTodos = todos.filter(
      (t) => t.description !== SECTION_HEADER_MARKER && !t.parent_id
    );

    for (const todo of realTodos) {
      // Skip completed or already notified
      if (todo.is_completed) continue;
      if (notifiedRef.current.has(todo.id)) continue;
      if (!todo.due_date) continue;

      const dueDate = parseLocalDate(todo.due_date);

      // Check if due within the next 24 hours (and not already past)
      if (dueDate >= now && dueDate <= windowEnd) {
        notifiedRef.current.add(todo.id);

        try {
          new Notification("\uD83D\uDCCB " + todo.title, {
            body: "\uB9C8\uAC10\uC774 \uC784\uBC15\uD588\uC2B5\uB2C8\uB2E4",
            icon: "/favicon.ico",
            tag: `reminder-${todo.id}`,
          });
        } catch {
          // Notification constructor can throw in some environments
        }
      }
    }
  }, [todos, permissionGranted]);

  // Run check on mount and every 5 minutes
  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, REMINDER_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkReminders]);

  return { requestPermission, permissionGranted };
}
