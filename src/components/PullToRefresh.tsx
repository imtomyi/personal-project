"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";

type PullToRefreshProps = {
  children: ReactNode;
  /** px 단위 — 이 이상 당기면 새로고침 트리거 */
  threshold?: number;
  /** 최대 당기기 거리 (px) */
  maxPull?: number;
};

/**
 * 모바일 Pull-to-Refresh 래퍼.
 * 페이지 최상단에서 아래로 드래그하면 새로고침합니다.
 */
export default function PullToRefresh({
  children,
  threshold = 80,
  maxPull = 130,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const startY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const canPull = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing) return;
      if (!canPull()) return;
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    },
    [isRefreshing, canPull],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff <= 0) {
        // 위로 스크롤 → 무시
        setPullDistance(0);
        setIsVisible(false);
        return;
      }

      if (!canPull()) {
        isPulling.current = false;
        setPullDistance(0);
        setIsVisible(false);
        return;
      }

      // 저항감: 실제 이동 거리보다 느리게 표시
      const dampedDiff = Math.min(diff * 0.45, maxPull);
      setPullDistance(dampedDiff);
      setIsVisible(true);

      // 기본 스크롤 방지 (당기는 중)
      if (dampedDiff > 5) {
        e.preventDefault();
      }
    },
    [isRefreshing, canPull, maxPull],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      // 새로고침 트리거
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6);

      // 약간의 딜레이 후 실제 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } else {
      // 복귀 애니메이션
      setPullDistance(0);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [pullDistance, threshold, isRefreshing]);

  useEffect(() => {
    const opts: AddEventListenerOptions = { passive: false };
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, opts);
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const isTriggered = pullDistance >= threshold;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-[200] flex items-start justify-center overflow-hidden"
        style={{
          height: isVisible ? `${pullDistance}px` : 0,
          transition: isPulling.current ? "none" : "height 0.3s cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        <div
          className="mt-2 flex flex-col items-center"
          style={{
            opacity: Math.min(progress * 1.5, 1),
            transform: `translateY(${Math.max(pullDistance - 40, 0)}px)`,
            transition: isPulling.current ? "none" : "all 0.3s cubic-bezier(0.2, 0, 0, 1)",
          }}
        >
          {/* Spinner / Arrow */}
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg ${
              isRefreshing
                ? "bg-[#5856D6] text-white"
                : isTriggered
                  ? "bg-[#5856D6] text-white"
                  : "bg-white text-[#5856D6] dark:bg-[#2c2c2e] dark:text-[#a5a4f3]"
            }`}
            style={{
              transition: isPulling.current ? "none" : "all 0.2s ease",
            }}
          >
            {isRefreshing ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="50 50"
                  strokeDashoffset="0"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: `rotate(${isTriggered ? 180 : progress * 180}deg)`,
                  transition: isPulling.current ? "none" : "transform 0.2s ease",
                }}
              >
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            )}
          </div>

          {/* Label */}
          <span
            className={`mt-1.5 text-[11px] font-medium ${
              isRefreshing || isTriggered
                ? "text-[#5856D6] dark:text-[#a5a4f3]"
                : "text-secondary"
            }`}
            style={{
              opacity: progress > 0.3 ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          >
            {isRefreshing ? "새로고침 중..." : isTriggered ? "놓으면 새로고침" : "당겨서 새로고침"}
          </span>
        </div>
      </div>

      {/* Content offset when pulling */}
      <div
        style={{
          transform: `translateY(${pullDistance > 0 ? pullDistance * 0.3 : 0}px)`,
          transition: isPulling.current ? "none" : "transform 0.3s cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
