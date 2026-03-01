"use client";

import { useState, useRef, useCallback } from "react";

type SwipeConfig = {
  threshold?: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

export function useSwipeGesture({
  threshold = 100,
  onSwipeLeft,
  onSwipeRight,
}: SwipeConfig) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchRef = useRef<{
    startX: number;
    startY: number;
    started: boolean;
  }>({
    startX: 0,
    startY: 0,
    started: false,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      started: false,
    };
    setSwipeX(0);
    setIsSwiping(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = touch.clientX - touchRef.current.startX;
    const dy = touch.clientY - touchRef.current.startY;

    // Only activate swipe if horizontal > 60px and vertical < 30px
    if (!touchRef.current.started) {
      if (Math.abs(dx) > 60 && Math.abs(dy) < 30) {
        touchRef.current.started = true;
        setIsSwiping(true);
      } else {
        return;
      }
    }

    if (touchRef.current.started) {
      setSwipeX(dx);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchRef.current.started) {
      setSwipeX(0);
      setIsSwiping(false);
      return;
    }

    setSwipeX((currentSwipeX) => {
      if (currentSwipeX < -threshold) {
        // Swiped left past threshold -> delete
        setTimeout(() => {
          onSwipeLeft();
          setSwipeX(0);
          setIsSwiping(false);
        }, 200);
        return -300;
      } else if (currentSwipeX > threshold) {
        // Swiped right past threshold -> toggle completion
        setTimeout(() => {
          onSwipeRight();
          setSwipeX(0);
          setIsSwiping(false);
        }, 200);
        return 300;
      } else {
        // Snap back
        setIsSwiping(false);
        return 0;
      }
    });

    touchRef.current.started = false;
  }, [threshold, onSwipeLeft, onSwipeRight]);

  return {
    swipeX,
    isSwiping,
    touchRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
