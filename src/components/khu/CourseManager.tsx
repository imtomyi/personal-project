"use client";

import { useState } from "react";
import type { Course, Workspace } from "@/lib/types";

const COURSE_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

type CourseManagerProps = {
  courses: Course[];
  selectedCourseId: string | null;
  onSelectCourse: (courseId: string | null) => void;
  onAddCourse: (name: string, professor?: string, color?: string, semester?: string) => Promise<void>;
  onDeleteCourse: (id: string) => Promise<void>;
  workspaces?: Workspace[];
  onLinkWorkspace?: (courseId: string, workspaceId: string | null) => Promise<void>;
};

export default function CourseManager({
  courses,
  selectedCourseId,
  onSelectCourse,
  onAddCourse,
  onDeleteCourse,
  workspaces,
  onLinkWorkspace,
}: CourseManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProfessor, setNewProfessor] = useState("");
  const [newColor, setNewColor] = useState(COURSE_COLORS[0]);
  const [newSemester, setNewSemester] = useState("");
  const [linkingCourseId, setLinkingCourseId] = useState<string | null>(null);

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      await onAddCourse(newName.trim(), newProfessor.trim() || undefined, newColor, newSemester.trim() || undefined);
      setNewName("");
      setNewProfessor("");
      setNewColor(COURSE_COLORS[0]);
      setNewSemester("");
      setIsAdding(false);
    } catch {
      // 에러는 상위에서 처리
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          📚 내 과목
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="과목 추가"
        >
          {isAdding ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
      </div>

      {/* 과목 추가 폼 */}
      {isAdding && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="과목명 (예: 자료구조)"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setIsAdding(false);
            }}
          />
          <input
            type="text"
            value={newProfessor}
            onChange={(e) => setNewProfessor(e.target.value)}
            placeholder="교수님 (선택)"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <input
            type="text"
            value={newSemester}
            onChange={(e) => setNewSemester(e.target.value)}
            placeholder="학기 (예: 2025-1)"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          {/* 색상 선택 */}
          <div className="flex flex-wrap gap-1.5">
            {COURSE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className={`h-5 w-5 rounded-full transition-transform ${
                  newColor === color ? "scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-800" : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="w-full rounded-full bg-[#9B1B30] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#7a1526] disabled:opacity-50"
          >
            추가
          </button>
        </div>
      )}

      {/* 전체 보기 */}
      <button
        onClick={() => onSelectCourse(null)}
        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
          selectedCourseId === null
            ? "bg-[#9B1B30]/[0.06] font-medium text-[#9B1B30] dark:bg-[#9B1B30]/[0.12] dark:text-[#e8a0ad]"
            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        }`}
      >
        전체 과목
      </button>

      {/* 과목 리스트 */}
      {courses.map((course) => (
        <div
          key={course.id}
          className={`group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors cursor-pointer ${
            selectedCourseId === course.id
              ? "bg-[#9B1B30]/[0.06] dark:bg-[#9B1B30]/[0.12]"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          onClick={() => onSelectCourse(course.id)}
        >
          <div
            className="h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: course.color }}
          />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm ${
              selectedCourseId === course.id
                ? "font-medium text-[#9B1B30] dark:text-[#e8a0ad]"
                : "text-gray-700 dark:text-gray-300"
            }`}>
              {course.name}
            </p>
            <div className="flex items-center gap-1">
              {course.professor && (
                <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                  {course.professor}
                </p>
              )}
              {course.workspace_id && workspaces && (
                <span className="rounded bg-[#9B1B30]/[0.08] px-1 py-0.5 text-[9px] font-medium text-[#9B1B30] dark:bg-[#9B1B30]/20 dark:text-[#e8a0ad]">
                  {workspaces.find((w) => w.id === course.workspace_id)?.name?.slice(0, 6) ?? "WS"}
                </span>
              )}
            </div>
          </div>
          {/* 워크스페이스 연결 버튼 */}
          {onLinkWorkspace && workspaces && workspaces.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLinkingCourseId(linkingCourseId === course.id ? null : course.id);
                }}
                className={`rounded p-0.5 transition-opacity ${
                  course.workspace_id
                    ? "text-blue-500 opacity-100 dark:text-blue-400"
                    : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400"
                }`}
                title="워크스페이스 연결"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
              {linkingCourseId === course.id && (
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLinkWorkspace(course.id, null);
                      setLinkingCourseId(null);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                      !course.workspace_id
                        ? "bg-gray-50 font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                        : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    연결 없음
                  </button>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onLinkWorkspace(course.id, ws.id);
                        setLinkingCourseId(null);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                        course.workspace_id === ws.id
                          ? "bg-blue-50 font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                          : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      {ws.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCourse(course.id);
            }}
            className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:text-red-400"
            title="삭제"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      {courses.length === 0 && !isAdding && (
        <p className="py-2 text-center text-xs text-gray-400 dark:text-gray-500">
          과목을 추가해주세요
        </p>
      )}
    </div>
  );
}
