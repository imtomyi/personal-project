"use client";

import { useActivityTracker } from "@/hooks/useActivityTracker";

export default function ActivityTracker() {
  useActivityTracker();
  return null;
}
