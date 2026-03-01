"use client";

import { useState } from "react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useToast } from "@/context/ToastContext";

export default function NotificationSection() {
  const {
    isSupported,
    isSubscribed,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
    preferences,
    updatePreferences,
  } = usePushSubscription();
  const { showToast } = useToast();
  const [toggling, setToggling] = useState(false);

  const handleTogglePush = async () => {
    setToggling(true);
    if (isSubscribed) {
      const ok = await unsubscribe();
      showToast(ok ? "알림이 해제되었습니다." : "알림 해제에 실패했습니다.", ok ? "success" : "error");
    } else {
      const ok = await subscribe();
      showToast(
        ok ? "알림이 활성화되었습니다!" : "알림 권한이 거부되었거나 지원하지 않는 환경입니다.",
        ok ? "success" : "error"
      );
    }
    setToggling(false);
  };

  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  return (
    <section className="mb-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        알림
      </h2>

      {/* Push toggle */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">푸시 알림</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {!isSupported
              ? "이 브라우저는 푸시 알림을 지원하지 않습니다."
              : "할 일 마감, 습관, 데일리 플랜 알림을 받습니다."}
          </p>
        </div>
        <button
          onClick={handleTogglePush}
          disabled={!isSupported || pushLoading || toggling}
          className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-40 ${
            isSubscribed ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              isSubscribed ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {isSubscribed && preferences && (
        <div className="space-y-4 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
          {/* Quiet hours */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">방해금지 시간</p>
            <div className="flex items-center gap-2">
              <select
                value={preferences.quiet_start}
                onChange={(e) => updatePreferences({ quiet_start: parseInt(e.target.value) })}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-500">~</span>
              <select
                value={preferences.quiet_end}
                onChange={(e) => updatePreferences({ quiet_end: parseInt(e.target.value) })}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Max per day */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">하루 최대 알림 수</p>
            <div className="flex gap-2">
              {[3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => updatePreferences({ max_per_day: n })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    preferences.max_per_day === n
                      ? "bg-blue-500 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                  }`}
                >
                  {n}개
                </button>
              ))}
            </div>
          </div>

          {/* Category toggles */}
          <div>
            <p className="mb-3 text-xs font-medium text-gray-600 dark:text-gray-400">알림 유형</p>
            <div className="space-y-2.5">
              {([
                { key: "due_reminder" as const, label: "마감 알림", desc: "할 일 마감 30분 전 알림" },
                { key: "overdue_reminder" as const, label: "밀린 할 일", desc: "마감 지난 할 일 알림" },
                { key: "habit_reminder" as const, label: "습관 알림", desc: "오늘 체크 안 한 습관 알림" },
                { key: "daily_plan_reminder" as const, label: "데일리 플랜", desc: "오늘 예정된 할 일 알림" },
              ]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{desc}</p>
                  </div>
                  <button
                    onClick={() => updatePreferences({ [key]: !preferences[key] })}
                    className={`relative h-6 w-10 rounded-full transition-colors ${
                      preferences[key] ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        preferences[key] ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
