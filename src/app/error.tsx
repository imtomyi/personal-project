"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="text-center">
        <div className="mb-4 text-5xl">⚠️</div>
        <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          문제가 발생했습니다
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          예기치 않은 오류가 발생했습니다. 다시 시도해 주세요.
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-[#5856D6] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4b49b8]"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
