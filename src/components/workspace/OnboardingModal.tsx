"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "khudo_onboarding_seen";

const steps = [
  {
    emoji: "👋",
    title: "KHUDO에 오신 것을 환영합니다!",
    desc: "실시간 협업 생산성 앱 KHUDO를 소개해 드릴게요. 할 일, 시간표, 루틴, 가계부를 한 곳에서 관리할 수 있습니다.",
  },
  {
    emoji: "✅",
    title: "워크스페이스 & 할 일",
    desc: "워크스페이스를 만들고 팀원을 초대하세요. 할 일을 추가하면 실시간으로 동기화되어 함께 관리할 수 있습니다.",
  },
  {
    emoji: "📅",
    title: "스마트 시간표",
    desc: "수업과 일정을 등록하면 오늘의 시간표가 자동으로 구성됩니다. 할 일도 빈 시간에 자동 배치됩니다.",
  },
  {
    emoji: "🎯",
    title: "루틴 & 가계부",
    desc: "매일의 루틴을 설정하고 달성률을 추적하세요. 가계부로 수입/지출을 카테고리별로 관리할 수 있습니다.",
  },
];

export default function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setOpen(true);
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  if (!open) return null;

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-gray-200/60 bg-white p-7 shadow-2xl dark:border-white/[0.08] dark:bg-gray-800">
        {/* Content */}
        <div className="text-center">
          <div className="mb-4 text-5xl">{current.emoji}</div>
          <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {current.desc}
          </p>
        </div>

        {/* Dot indicators */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-5 bg-[#5856D6]"
                  : "w-1.5 bg-gray-200 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={close}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            건너뛰기
          </button>
          {isLast ? (
            <button
              onClick={close}
              className="rounded-lg bg-[#5856D6] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4b49b8]"
            >
              시작하기
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-[#5856D6] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4b49b8]"
            >
              다음
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
