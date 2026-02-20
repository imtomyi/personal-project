"use client";

import type { WsWidgetId } from "@/lib/workspace-widgets";
import { WS_WIDGET_REGISTRY, WS_WIDGET_STORAGE_KEY } from "@/lib/workspace-widgets";
import { useGenericWidgetConfig } from "./useGenericWidgetConfig";

export function useWsWidgetConfig() {
  return useGenericWidgetConfig<WsWidgetId>({
    storageKey: WS_WIDGET_STORAGE_KEY,
    registry: WS_WIDGET_REGISTRY,
  });
}
