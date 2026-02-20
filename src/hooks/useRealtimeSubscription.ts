"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";

type SubscriptionConfig = {
  /** 고유 채널 이름 */
  channelName: string;
  /** 구독할 테이블 */
  table: string;
  /** 필터 (e.g. "workspace_id=eq.abc123") */
  filter?: string;
  /** 초기 로드 및 변경 시 호출 */
  onChanged: () => void;
  /** true이면 구독 스킵 */
  skip?: boolean;
};

/**
 * Supabase Realtime 구독 패턴을 추출한 제네릭 훅.
 * 마운트 시 onChanged()를 호출하고, 테이블 변경 시마다 재호출한다.
 */
export function useRealtimeSubscription({
  channelName,
  table,
  filter,
  onChanged,
  skip = false,
}: SubscriptionConfig) {
  const supabase = createClient();
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    if (skip) return;

    onChangedRef.current();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      event: "*",
      schema: "public",
      table,
    };
    if (filter) config.filter = filter;

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", config, () => {
        onChangedRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, table, filter, skip, supabase]);
}
