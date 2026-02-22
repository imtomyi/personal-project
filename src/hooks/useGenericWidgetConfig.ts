"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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

/**
 * 위젯 설정을 Supabase에 저장하여 계정 연동.
 * localStorage → Supabase 자동 마이그레이션 포함.
 */
export function useGenericWidgetConfig<TId extends string>({
  storageKey,
  registry,
}: WidgetConfigOptions<TId>) {
  const { user } = useAuth();
  const supabase = createClient();
  const migrated = useRef(false);

  const defaultConfig: BaseWidgetConfig<TId>[] = registry.map((w, i) => ({
    id: w.id,
    visible: true,
    order: i,
  }));

  const [widgets, setWidgets] = useState<BaseWidgetConfig<TId>[]>(defaultConfig);
  const [isEditing, setIsEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  /** Supabase에서 위젯 설정 로드 + localStorage 마이그레이션 */
  useEffect(() => {
    if (!user) return;

    async function loadFromSupabase() {
      const { data: rows, error } = await supabase
        .from("widget_configs")
        .select("widget_id, visible, sort_order")
        .eq("user_id", user!.id)
        .eq("config_key", storageKey)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Widget config fetch error:", error);
        // Fallback: localStorage에서 로드
        loadFromLocalStorage();
        return;
      }

      if (rows && rows.length > 0) {
        // Supabase 데이터가 있음 → 사용
        const validIds = new Set(registry.map((m) => m.id));
        const configs: BaseWidgetConfig<TId>[] = rows
          .filter((r: { widget_id: string; visible: boolean; sort_order: number }) => validIds.has(r.widget_id as TId))
          .map((r: { widget_id: string; visible: boolean; sort_order: number }) => ({
            id: r.widget_id as TId,
            visible: r.visible,
            order: r.sort_order,
          }));

        // 새로 추가된 위젯이 있으면 추가
        const existingIds = new Set(configs.map((c) => c.id));
        for (const meta of registry) {
          if (!existingIds.has(meta.id)) {
            configs.push({ id: meta.id, visible: true, order: configs.length });
          }
        }

        setWidgets(configs.sort((a, b) => a.order - b.order));
        setLoaded(true);

        // localStorage 잔여 데이터 정리
        tryRemoveLocalStorage();
        return;
      }

      // Supabase에 데이터 없음 → localStorage에서 마이그레이션 시도
      if (!migrated.current) {
        migrated.current = true;
        const localConfig = loadFromLocalStorageRaw();
        if (localConfig) {
          // localStorage → Supabase 마이그레이션
          await saveToSupabase(localConfig);
          setWidgets(localConfig);
          setLoaded(true);
          tryRemoveLocalStorage();
          return;
        }
      }

      // 둘 다 없음 → 기본값으로 Supabase에 저장
      await saveToSupabase(defaultConfig);
      setWidgets(defaultConfig);
      setLoaded(true);
    }

    loadFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, storageKey]);

  /** localStorage에서 로드 (fallback / migration) */
  function loadFromLocalStorageRaw(): BaseWidgetConfig<TId>[] | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
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
      return null;
    }
  }

  function loadFromLocalStorage() {
    const config = loadFromLocalStorageRaw();
    setWidgets(config || defaultConfig);
    setLoaded(true);
  }

  function tryRemoveLocalStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  }

  /** Supabase에 위젯 설정 일괄 저장 (upsert) */
  async function saveToSupabase(configs: BaseWidgetConfig<TId>[]) {
    if (!user) return;
    const rows = configs.map((c) => ({
      user_id: user.id,
      config_key: storageKey,
      widget_id: c.id,
      visible: c.visible,
      sort_order: c.order,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("widget_configs")
      .upsert(rows, { onConflict: "user_id,config_key,widget_id" });

    if (error) {
      console.error("Widget config save error:", error);
    }
  }

  const visibleWidgets = widgets.filter((w) => w.visible);

  const toggleWidget = useCallback((id: TId) => {
    setWidgets((prev) => {
      const updated = prev.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w,
      );
      saveToSupabase(updated);
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, storageKey]);

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
      saveToSupabase(updated);
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, storageKey]);

  const resetConfig = useCallback(() => {
    const fresh = registry.map((w, i) => ({
      id: w.id,
      visible: true as const,
      order: i,
    }));
    setWidgets(fresh);
    saveToSupabase(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, storageKey, registry]);

  return {
    widgets,
    visibleWidgets,
    isEditing,
    setIsEditing,
    toggleWidget,
    reorderWidgets,
    resetConfig,
    loaded,
  };
}
