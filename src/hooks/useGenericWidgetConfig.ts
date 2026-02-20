"use client";

import { useState, useCallback, useEffect } from "react";

/** 위젯 설정을 위한 제네릭 타입 */
type BaseWidgetConfig<TId extends string> = {
  id: TId;
  visible: boolean;
  order: number;
};

type BaseWidgetMeta<TId extends string> = {
  id: TId;
  label: string;
  emoji: string;
  description: string;
};

type WidgetConfigOptions<TId extends string> = {
  storageKey: string;
  registry: BaseWidgetMeta<TId>[];
};

function loadConfig<TId extends string>(
  storageKey: string,
  registry: BaseWidgetMeta<TId>[],
  defaultConfig: BaseWidgetConfig<TId>[]
): BaseWidgetConfig<TId>[] {
  if (typeof window === "undefined") return defaultConfig;
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return defaultConfig;
    const parsed = JSON.parse(stored) as BaseWidgetConfig<TId>[];
    const validIds = new Set(registry.map((m) => m.id));
    const filtered = parsed.filter((c) => validIds.has(c.id));
    const ids = new Set(filtered.map((c) => c.id));
    for (const meta of registry) {
      if (!ids.has(meta.id)) {
        filtered.push({ id: meta.id, visible: true, order: filtered.length });
      }
    }
    return filtered.sort((a, b) => a.order - b.order);
  } catch {
    return defaultConfig;
  }
}

function saveConfig<TId extends string>(storageKey: string, config: BaseWidgetConfig<TId>[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(config));
}

export function useGenericWidgetConfig<TId extends string>({
  storageKey,
  registry,
}: WidgetConfigOptions<TId>) {
  const defaultConfig: BaseWidgetConfig<TId>[] = registry.map((w, i) => ({
    id: w.id,
    visible: true,
    order: i,
  }));

  const [widgets, setWidgets] = useState<BaseWidgetConfig<TId>[]>(defaultConfig);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setWidgets(loadConfig(storageKey, registry, defaultConfig));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const visibleWidgets = widgets.filter((w) => w.visible);

  const toggleWidget = useCallback((id: TId) => {
    setWidgets((prev) => {
      const updated = prev.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w,
      );
      saveConfig(storageKey, updated);
      return updated;
    });
  }, [storageKey]);

  const reorderWidgets = useCallback((oldIndex: number, newIndex: number) => {
    setWidgets((prev) => {
      const visible = prev.filter((w) => w.visible);
      const hidden = prev.filter((w) => !w.visible);
      const reordered = [...visible];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      const updated = [
        ...reordered.map((w, i) => ({ ...w, order: i })),
        ...hidden.map((w, i) => ({ ...w, order: reordered.length + i })),
      ];
      saveConfig(storageKey, updated);
      return updated;
    });
  }, [storageKey]);

  const resetConfig = useCallback(() => {
    const fresh = registry.map((w, i) => ({
      id: w.id,
      visible: true as const,
      order: i,
    }));
    setWidgets(fresh);
    saveConfig(storageKey, fresh);
  }, [storageKey, registry]);

  return {
    widgets,
    visibleWidgets,
    isEditing,
    setIsEditing,
    toggleWidget,
    reorderWidgets,
    resetConfig,
  };
}
