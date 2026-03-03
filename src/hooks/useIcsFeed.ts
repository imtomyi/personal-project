"use client";

import { useState, useEffect, useCallback } from "react";

export type IcsEvent = {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string | null;
  location: string | null;
  description: string | null;
  allDay: boolean;
  rrule: string | null;
};

const STORAGE_KEY = "ics_feed_url";

/**
 * ICS 캘린더 피드를 구독하고 이벤트를 가져오는 훅.
 * 피드 URL은 localStorage에 저장.
 */
export function useIcsFeed() {
  const [events, setEvents] = useState<IcsEvent[]>([]);
  const [feedUrl, setFeedUrlState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // localStorage에서 피드 URL 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFeedUrlState(stored);
    } catch {
      // SSR/localStorage 접근 불가
    }
  }, []);

  // 피드 URL 변경 시 자동 fetch
  useEffect(() => {
    if (feedUrl) {
      fetchEvents(feedUrl);
    } else {
      setEvents([]);
    }
  }, [feedUrl]);

  // 이벤트 가져오기
  const fetchEvents = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/ics-proxy?url=${encodeURIComponent(url)}`);
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "피드 가져오기 실패");
        return;
      }
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "피드 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  // 피드 URL 저장
  const setFeedUrl = useCallback((url: string | null) => {
    try {
      if (url) {
        localStorage.setItem(STORAGE_KEY, url);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    setFeedUrlState(url);
    if (!url) setEvents([]);
  }, []);

  // 수동 새로고침
  const refresh = useCallback(async () => {
    if (feedUrl) await fetchEvents(feedUrl);
  }, [feedUrl, fetchEvents]);

  return { events, feedUrl, loading, error, setFeedUrl, refresh };
}
