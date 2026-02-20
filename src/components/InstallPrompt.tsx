"use client";

import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Don't show if already installed as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if already dismissed
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);

    if (iOS) {
      // Show iOS install guide after 3 seconds
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Desktop: listen for beforeinstallprompt
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem("pwa-install-dismissed", "1");
  }

  async function handleInstall() {
    if (deferredPrompt && "prompt" in deferredPrompt) {
      (deferredPrompt as { prompt: () => void }).prompt();
    }
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] safe-bottom">
      <div className="mx-auto max-w-lg px-4 pb-4">
        <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white/95 shadow-lg backdrop-blur-xl dark:border-white/[0.1] dark:bg-[#1c1c1e]/95">
          <div className="flex items-start gap-3 p-4">
            {/* App icon */}
            <img
              src="/icon-192.png"
              alt="Collab Todo"
              className="h-12 w-12 flex-shrink-0 rounded-xl"
            />

            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold text-foreground dark:text-white">
                앱으로 설치하기
              </h3>

              {isIOS ? (
                <p className="mt-0.5 text-[13px] leading-relaxed text-secondary">
                  <span className="inline-flex items-center gap-1">
                    하단의
                    <svg className="inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3v11.25" />
                    </svg>
                    공유 버튼을 탭한 후
                  </span>
                  <br />
                  <strong>&quot;홈 화면에 추가&quot;</strong>를 선택하세요
                </p>
              ) : (
                <p className="mt-0.5 text-[13px] text-secondary">
                  홈 화면에 앱을 설치하면 더 빠르게 접근할 수 있습니다
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={dismiss}
              className="flex-shrink-0 rounded-full p-1 text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.1]"
              aria-label="닫기"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Install button for non-iOS */}
          {!isIOS && deferredPrompt && (
            <div className="border-t border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
              <button
                onClick={handleInstall}
                className="w-full rounded-xl bg-[#5856D6] py-2.5 text-[14px] font-semibold text-white hover:bg-[#4a48c4] active:scale-[0.98]"
              >
                설치하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
