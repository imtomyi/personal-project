"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Workspace } from "@/lib/types";
import { getWorkspaceColorByKey } from "@/hooks/useAllWorkspaceTodos";
import CreateWorkspace from "./CreateWorkspace";

type NextTodoInfo = { title: string; dueLabel: string; isOverdue: boolean };

type WorkspaceListProps = {
  layout?: "grid" | "sidebar";
  /** 워크스페이스별 진행률 맵 (workspace_id → { total, completed }) */
  wsProgress?: Map<string, { total: number; completed: number }>;
  /** 색상 매칭을 위한 워크스페이스 목록 (정렬 순서 일치 필요) */
  workspaceColors?: Workspace[];
  /** 워크스페이스별 다음 마감 할일 */
  wsNextTodo?: Map<string, NextTodoInfo>;
};

export default function WorkspaceList({ layout = "grid", wsProgress, workspaceColors, wsNextTodo }: WorkspaceListProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false });
    setWorkspaces(data ?? []);
    setLoading(false);
  }, [user, supabase]);

  const handleWorkspaceCreated = useCallback((newWorkspace: Workspace) => {
    setWorkspaces((prev) => [newWorkspace, ...prev]);
  }, []);

  const handleDelete = useCallback(async (wsId: string) => {
    setDeleting(true);
    const { error } = await supabase.from("workspaces").delete().eq("id", wsId);
    if (!error) {
      setWorkspaces((prev) => prev.filter((w) => w.id !== wsId));
    }
    setConfirmDeleteId(null);
    setDeleting(false);
  }, [supabase]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (layout === "sidebar") {
    return (
      <div className="space-y-2">
        {workspaces.map((ws) => {
          const progress = wsProgress?.get(ws.id);
          const pct = progress && progress.total > 0
            ? Math.round((progress.completed / progress.total) * 100)
            : null;
          const color = getWorkspaceColorByKey(ws.color);
          const nextTodo = wsNextTodo?.get(ws.id);

          const isConfirming = confirmDeleteId === ws.id;

          return (
            <div key={ws.id} className="relative">
              {/* 삭제 확인 오버레이 */}
              {isConfirming && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white/95 backdrop-blur-sm dark:border-red-800 dark:bg-gray-800/95">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">삭제할까요?</span>
                  <button
                    onClick={() => handleDelete(ws.id)}
                    disabled={deleting}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    {deleting ? "삭제 중..." : "삭제"}
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    취소
                  </button>
                </div>
              )}
              <Link
                href={`/workspace/${ws.id}`}
                className="card-surface group flex items-center gap-3 !rounded-2xl px-4 py-3.5 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.06)] active:scale-[0.98]"
              >
                {/* Icon circle — 워크스페이스 컬러 적용 */}
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold ${color.bg} ${color.text}`}>
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14px] font-medium text-foreground dark:text-white">
                    {ws.name}
                  </h3>
                  {/* 진행률 표시 */}
                  {progress && progress.total > 0 ? (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct === 100
                              ? "bg-emerald-500"
                              : `${color.dot}`
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-medium ${
                        pct === 100
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}>
                        {progress.completed}/{progress.total}
                      </span>
                    </div>
                  ) : ws.description ? (
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {ws.description}
                    </p>
                  ) : null}
                  {/* 다음 마감 할일 미리보기 */}
                  {nextTodo && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[10px]">
                      <span className={nextTodo.isOverdue ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}>
                        {nextTodo.dueLabel}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">{nextTodo.title}</span>
                    </p>
                  )}
                </div>
                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmDeleteId(ws.id);
                  }}
                  className="flex-shrink-0 rounded-md p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  title="워크스페이스 삭제"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </Link>
            </div>
          );
        })}

        <CreateWorkspace onCreated={handleWorkspaceCreated} usedColors={workspaces.map((w) => w.color)} />

        {workspaces.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
            첫 워크스페이스를 만들어보세요
          </p>
        )}
      </div>
    );
  }

  // Default grid layout
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((ws) => {
          const isConfirming = confirmDeleteId === ws.id;
          return (
            <div key={ws.id} className="relative">
              {isConfirming && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white/95 backdrop-blur-sm dark:border-red-800 dark:bg-gray-800/95">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">삭제할까요?</span>
                  <button
                    onClick={() => handleDelete(ws.id)}
                    disabled={deleting}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    {deleting ? "삭제 중..." : "삭제"}
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    취소
                  </button>
                </div>
              )}
              <Link
                href={`/workspace/${ws.id}`}
                className="group block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {ws.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmDeleteId(ws.id);
                    }}
                    className="rounded-md p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="워크스페이스 삭제"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                {ws.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {ws.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  {new Date(ws.created_at).toLocaleDateString("ko-KR")}
                </p>
              </Link>
            </div>
          );
        })}

        <CreateWorkspace onCreated={handleWorkspaceCreated} usedColors={workspaces.map((w) => w.color)} />
      </div>

      {workspaces.length === 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          첫 워크스페이스를 만들어보세요
        </p>
      )}
    </div>
  );
}
