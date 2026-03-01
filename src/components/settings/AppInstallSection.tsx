"use client";

import { useState, useEffect } from "react";

export default function AppInstallSection() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  function handleInstall() {
    if (deferredPrompt && "prompt" in deferredPrompt) {
      (deferredPrompt as { prompt: () => void }).prompt();
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        앱 설치
      </h2>

      {isStandalone ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-900/20">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">앱으로 실행 중</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">홈 화면에서 설치된 앱으로 사용 중입니다.</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <img
              src="/icon-192.png"
              alt="KHUDO"
              width={48}
              height={48}
              className="flex-shrink-0 rounded-xl shadow-md"
              style={{ width: 48, height: 48 }}
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">KHUDO</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                홈 화면에 앱을 설치하면 네이티브 앱처럼 사용할 수 있습니다.
              </p>
            </div>
          </div>

          {isIOS ? (
            <div className="rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
              <p className="text-[13px] font-medium text-blue-700 dark:text-blue-300">iPhone 설치 방법</p>
              <ol className="mt-2 space-y-2 text-xs text-blue-600/80 dark:text-blue-400/80">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-600 dark:text-blue-400">1</span>
                  <span>
                    Safari 하단의{" "}
                    <svg className="inline h-4 w-4 align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3v11.25" />
                    </svg>
                    {" "}공유 버튼을 탭하세요
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-600 dark:text-blue-400">2</span>
                  <span>스크롤해서 <strong>&quot;홈 화면에 추가&quot;</strong>를 선택하세요</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-600 dark:text-blue-400">3</span>
                  <span>오른쪽 상단의 <strong>&quot;추가&quot;</strong>를 탭하면 완료!</span>
                </li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <button
              onClick={handleInstall}
              className="w-full rounded-xl bg-[#5856D6] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4a48c4] active:scale-[0.98]"
            >
              앱 설치하기
            </button>
          ) : (
            <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Chrome, Safari 등 지원 브라우저에서 앱을 설치할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
