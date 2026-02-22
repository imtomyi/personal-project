"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type TimerMode = "work" | "short_break" | "long_break";

const MODE_DURATIONS: Record<TimerMode, number> = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

const MODE_LABELS: Record<TimerMode, string> = {
  work: "집중",
  short_break: "휴식",
  long_break: "긴 휴식",
};

const MODE_COLORS: Record<TimerMode, string> = {
  work: "#FF6347",
  short_break: "#34C759",
  long_break: "#007AFF",
};

type Props = {
  todoTitle?: string;
  todos?: Array<{ id: string; title: string }>;
  onWorkSessionComplete?: (todoId: string, durationSec: number) => void;
};

export default function PomodoroTimer({ todoTitle, todos, onWorkSessionComplete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<TimerMode>("work");
  const [secondsLeft, setSecondsLeft] = useState(MODE_DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [linkedTodoId, setLinkedTodoId] = useState<string | null>(null);
  const [showTodoSelect, setShowTodoSelect] = useState(false);
  const [todoSearch, setTodoSearch] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalSeconds = MODE_DURATIONS[mode];
  const progress = 1 - secondsLeft / totalSeconds;

  // 현재 연결된 할일 이름
  const linkedTodoTitle = linkedTodoId
    ? todos?.find((t) => t.id === linkedTodoId)?.title
    : todoTitle;

  // 필터된 할일 목록
  const filteredTodos = todos?.filter((t) =>
    todoSearch ? t.title.toLowerCase().includes(todoSearch.toLowerCase()) : true,
  );

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const sendNotification = useCallback((title: string, body: string) => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // Transition to next mode when timer reaches 0
  const handleTimerComplete = useCallback(() => {
    if (mode === "work") {
      const nextSession = sessionCount + 1;
      setSessionCount(nextSession);

      // 시간기록 자동 저장
      if (linkedTodoId && onWorkSessionComplete) {
        onWorkSessionComplete(linkedTodoId, MODE_DURATIONS.work);
      }

      if (nextSession % 4 === 0) {
        setMode("long_break");
        setSecondsLeft(MODE_DURATIONS.long_break);
        sendNotification("긴 휴식 시간!", "15분간 쉬어가세요.");
      } else {
        setMode("short_break");
        setSecondsLeft(MODE_DURATIONS.short_break);
        sendNotification("휴식 시간!", "5분간 쉬어가세요.");
      }
    } else {
      setMode("work");
      setSecondsLeft(MODE_DURATIONS.work);
      sendNotification("집중 시간!", "다시 집중하세요.");
    }
    // Auto-continue
    setRunning(true);
  }, [mode, sessionCount, sendNotification, linkedTodoId, onWorkSessionComplete]);

  // Timer tick
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Watch for secondsLeft reaching 0
  useEffect(() => {
    if (secondsLeft === 0 && running) {
      setRunning(false);
      handleTimerComplete();
    }
  }, [secondsLeft, running, handleTimerComplete]);

  const handleStartPause = () => {
    if (!running) {
      requestNotificationPermission();
    }
    setRunning((v) => !v);
  };

  const handleReset = () => {
    setRunning(false);
    setSecondsLeft(MODE_DURATIONS[mode]);
  };

  // Close on click outside
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setExpanded(false);
        setShowTodoSelect(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  // SVG circle calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const currentColor = MODE_COLORS[mode];

  // 누적 기록 시간
  const recordedMinutes = sessionCount * 25;

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50">
      {/* Expanded card */}
      {expanded && (
        <div className="mb-3 w-72 overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:bg-[#1c1c1e] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Mode indicator */}
          <div
            className="px-4 py-2 text-center text-[12px] font-semibold text-white"
            style={{ backgroundColor: currentColor }}
          >
            {MODE_LABELS[mode]}
            {linkedTodoTitle && (
              <span className="ml-1 font-normal opacity-80">
                — {linkedTodoTitle}
              </span>
            )}
          </div>

          {/* Todo selector */}
          {todos && todos.length > 0 && (
            <div className="border-b border-black/[0.06] px-3 py-2 dark:border-white/[0.08]">
              {showTodoSelect ? (
                <div>
                  <input
                    type="text"
                    value={todoSearch}
                    onChange={(e) => setTodoSearch(e.target.value)}
                    placeholder="할일 검색..."
                    className="mb-1.5 w-full rounded-lg border border-black/[0.08] bg-[#f5f5f7] px-2.5 py-1.5 text-[12px] outline-none focus:border-[#007AFF] dark:border-white/[0.1] dark:bg-[#2c2c2e] dark:text-white"
                    autoFocus
                  />
                  <div className="max-h-32 overflow-y-auto">
                    <button
                      onClick={() => {
                        setLinkedTodoId(null);
                        setShowTodoSelect(false);
                        setTodoSearch("");
                      }}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                        !linkedTodoId
                          ? "bg-[#007AFF]/10 font-medium text-[#007AFF]"
                          : "text-secondary hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      연결 안 함
                    </button>
                    {filteredTodos?.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setLinkedTodoId(t.id);
                          setShowTodoSelect(false);
                          setTodoSearch("");
                        }}
                        className={`w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                          linkedTodoId === t.id
                            ? "bg-[#007AFF]/10 font-medium text-[#007AFF]"
                            : "text-foreground hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/[0.06]"
                        }`}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowTodoSelect(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-secondary transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                >
                  <span className="text-[13px]">🔗</span>
                  <span className="min-w-0 flex-1 truncate text-left">
                    {linkedTodoTitle || "할일에 연결하면 시간이 자동 기록됩니다"}
                  </span>
                  <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Timer circle */}
          <div className="flex flex-col items-center px-4 pb-4 pt-5">
            <div className="relative mb-4">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
                {/* Background circle */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-black/[0.06] dark:text-white/[0.1]"
                />
                {/* Progress circle */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke={currentColor}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[22px] font-bold tabular-nums text-foreground dark:text-white">
                {formatTime(secondsLeft)}
              </span>
            </div>

            {/* Session counter + recorded time */}
            <div className="mb-3 flex items-center gap-3 text-[12px] text-secondary">
              <span>{sessionCount % 4}/{4} 세션</span>
              {linkedTodoId && recordedMinutes > 0 && (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  ⏱ {recordedMinutes}분 기록됨
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartPause}
                className="rounded-full px-5 py-2 text-[13px] font-medium text-white"
                style={{ backgroundColor: currentColor }}
              >
                {running ? "일시정지" : secondsLeft === totalSeconds ? "시작" : "계속"}
              </button>
              <button
                onClick={handleReset}
                className="rounded-full bg-black/[0.05] px-4 py-2 text-[13px] font-medium text-secondary hover:bg-black/[0.08] hover:text-foreground dark:bg-white/[0.08] dark:hover:bg-white/[0.12] dark:hover:text-white"
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button (collapsed) */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex h-12 items-center gap-2 rounded-full bg-white px-4 shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-transform hover:scale-105 dark:bg-[#2c2c2e] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
        title="포모도로 타이머"
      >
        <span className="text-lg">🍅</span>
        <span className="text-[13px] font-medium tabular-nums text-foreground dark:text-white">
          {formatTime(secondsLeft)}
        </span>
        {running && (
          <span
            className="h-2 w-2 animate-pulse rounded-full"
            style={{ backgroundColor: currentColor }}
          />
        )}
      </button>
    </div>
  );
}
