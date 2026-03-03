"use client";

import { useState } from "react";
import type { CanvasCourse, CanvasAssignment } from "@/hooks/useCanvas";

type KhuCanvasSyncProps = {
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  courses: CanvasCourse[];
  assignments: CanvasAssignment[];
  onConnect: (token: string) => Promise<void>;
  onDisconnect: () => void;
  onFetchAllAssignments: () => Promise<void>;
  onImportToPlanner?: () => Promise<void>;
  // ICS 피드
  icsFeedUrl?: string | null;
  onIcsFeedUrlChange?: (url: string | null) => void;
  icsFeedLoading?: boolean;
  icsFeedEventCount?: number;
};

export default function KhuCanvasSync({
  isConnected,
  loading,
  error,
  courses,
  assignments,
  onConnect,
  onDisconnect,
  onFetchAllAssignments,
  onImportToPlanner,
  icsFeedUrl,
  onIcsFeedUrlChange,
  icsFeedLoading,
  icsFeedEventCount,
}: KhuCanvasSyncProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [importing, setImporting] = useState(false);
  const [icsDraft, setIcsDraft] = useState(icsFeedUrl || "");
  const [showIcsInput, setShowIcsInput] = useState(false);

  async function handleConnect() {
    if (!tokenInput.trim()) return;
    try {
      await onConnect(tokenInput.trim());
      setTokenInput("");
      setShowSetup(false);
    } catch {
      // 에러는 상위에서 처리
    }
  }

  // 마감 임박 과제 (7일 이내)
  const now = new Date();
  const upcomingAssignments = assignments
    .filter((a) => {
      if (!a.due_at) return false;
      const due = new Date(a.due_at);
      const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 7;
    })
    .slice(0, 5);

  const overdueAssignments = assignments.filter((a) => {
    if (!a.due_at) return false;
    return new Date(a.due_at) < now && !a.has_submitted_submissions;
  });

  if (!isConnected) {
    return (
      <div className="card-surface p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            🎓 LearningX 연동
          </h3>
        </div>

        {!showSetup ? (
          <div className="mt-3 text-center">
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Canvas API 토큰으로 수업과 과제를 자동으로 가져오세요
            </p>
            <button
              onClick={() => setShowSetup(true)}
              className="rounded-full bg-[#9B1B30] px-4 py-2 text-sm font-medium text-white hover:bg-[#7a1526]"
            >
              연동하기
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="rounded-lg bg-[#9B1B30]/[0.06] p-2.5 dark:bg-[#9B1B30]/[0.12]">
              <p className="text-[11px] text-[#9B1B30] dark:text-[#e8a0ad]">
                <strong>토큰 발급 방법:</strong>
                <br />1. <a href="https://khcanvas.khu.ac.kr" target="_blank" rel="noopener noreferrer" className="underline">khcanvas.khu.ac.kr</a> 접속
                <br />2. 설정 (Settings) → 새 액세스 토큰 생성
                <br />3. 생성된 토큰을 아래에 붙여넣기
              </p>
            </div>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Canvas API 토큰 입력"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#9B1B30] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConnect();
              }}
            />
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleConnect}
                disabled={loading || !tokenInput.trim()}
                className="flex-1 rounded-full bg-[#9B1B30] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#7a1526] disabled:opacity-50"
              >
                {loading ? "연결 중..." : "연결"}
              </button>
              <button
                onClick={() => setShowSetup(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 연결된 상태
  return (
    <div className="card-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          🎓 LearningX
        </h3>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            연결됨
          </span>
          <button
            onClick={onFetchAllAssignments}
            disabled={loading}
            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="새로고침"
          >
            <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onDisconnect}
            className="text-[10px] text-red-400 hover:text-red-500"
          >
            연결 해제
          </button>
        </div>
      </div>

      {/* 수업 목록 */}
      <div className="mb-3">
        <p className="mb-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
          수강 중인 과목 ({courses.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {courses.slice(0, 8).map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-[#9B1B30]/[0.08] px-2 py-0.5 text-[10px] font-medium text-[#9B1B30] dark:bg-[#9B1B30]/20 dark:text-[#e8a0ad]"
              title={c.name}
            >
              {c.course_code || c.name.slice(0, 15)}
            </span>
          ))}
          {courses.length > 8 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700">
              +{courses.length - 8}
            </span>
          )}
        </div>
      </div>

      {/* 학기 플래너로 가져오기 버튼 */}
      {onImportToPlanner && courses.length > 0 && (
        <div className="mb-3">
          <button
            onClick={async () => {
              setImporting(true);
              try { await onImportToPlanner(); } finally { setImporting(false); }
            }}
            disabled={importing || loading}
            className="w-full rounded-full bg-[#9B1B30] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#7a1526] disabled:opacity-50"
          >
            {importing ? "가져오는 중..." : "📥 학기 플래너로 과목·과제 가져오기"}
          </button>
        </div>
      )}

      {/* 지난 과제 경고 */}
      {overdueAssignments.length > 0 && (
        <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/20">
          <p className="text-xs font-medium text-red-600 dark:text-red-400">
            ⚠️ 미제출 과제 {overdueAssignments.length}개
          </p>
        </div>
      )}

      {/* 다가오는 과제 */}
      {upcomingAssignments.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            이번 주 마감
          </p>
          <div className="space-y-1">
            {upcomingAssignments.map((a) => {
              const due = a.due_at ? new Date(a.due_at) : null;
              const courseName = courses.find((c) => c.id === a.course_id)?.course_code || "";
              const daysLeft = due
                ? Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                    daysLeft && daysLeft <= 1
                      ? "bg-red-50/60 hover:bg-red-50 dark:bg-red-900/10 dark:hover:bg-red-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <span
                    className={`min-w-[32px] rounded px-1 py-0.5 text-center text-[10px] font-bold ${
                      daysLeft && daysLeft <= 1
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : daysLeft && daysLeft <= 3
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}
                  >
                    D-{daysLeft}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-gray-700 dark:text-gray-300">
                      {a.name}
                    </p>
                    <p className="text-[10px] text-gray-400">{courseName}</p>
                  </div>
                  {due && (
                    <span className="text-[10px] text-gray-400">
                      {due.getMonth() + 1}/{due.getDate()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {assignments.length === 0 && !loading && (
        <button
          onClick={onFetchAllAssignments}
          className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-[#9B1B30] hover:text-[#9B1B30] dark:border-gray-600 dark:hover:border-[#9B1B30]"
        >
          과제 목록 불러오기
        </button>
      )}

      {/* ICS 캘린더 피드 구독 */}
      {onIcsFeedUrlChange && (
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-semibold text-gray-900 dark:text-white">
              📡 캘린더 피드
            </h4>
            <div className="flex items-center gap-2">
              {icsFeedUrl && (
                <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  구독 중 · {icsFeedEventCount ?? 0}개
                </span>
              )}
              <button
                onClick={() => {
                  setShowIcsInput(!showIcsInput);
                  setIcsDraft(icsFeedUrl || "");
                }}
                className="text-[10px] text-[#9B1B30] hover:text-[#9B1B30]/80 dark:text-[#e8a0ad]"
              >
                {showIcsInput ? "닫기" : icsFeedUrl ? "변경" : "추가"}
              </button>
            </div>
          </div>

          {!showIcsInput && icsFeedUrl && (
            <p className="mt-1 truncate text-[10px] text-gray-400 dark:text-gray-500">
              {icsFeedUrl}
            </p>
          )}

          {showIcsInput && (
            <div className="mt-2">
              <div className="flex gap-1.5">
                <input
                  type="url"
                  placeholder="ICS 피드 URL (예: https://.../*.ics)"
                  value={icsDraft}
                  onChange={(e) => setIcsDraft(e.target.value)}
                  className="flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-gray-400 focus:border-[#9B1B30] focus:outline-none focus:ring-1 focus:ring-[#9B1B30] dark:border-gray-700 dark:bg-white/[0.06] dark:text-white"
                />
                <button
                  onClick={() => {
                    const trimmed = icsDraft.trim();
                    onIcsFeedUrlChange(trimmed || null);
                    if (!trimmed) setIcsDraft("");
                    setShowIcsInput(false);
                  }}
                  disabled={icsFeedLoading}
                  className="whitespace-nowrap rounded-md bg-[#9B1B30] px-2.5 py-1.5 text-[10px] font-medium text-white transition-colors hover:bg-[#9B1B30]/90 disabled:opacity-50"
                >
                  {icsFeedLoading ? "..." : icsDraft.trim() ? "저장" : "해제"}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
                LearningX → 캘린더 → 캘린더 피드 에서 URL을 복사하세요.
                시간이 지정된 이벤트만 시간표에 표시됩니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
