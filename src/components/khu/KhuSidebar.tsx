"use client";

import { useState } from "react";
import type { Course, Assignment, AssignmentType, Workspace, CourseSchedule } from "@/lib/types";
import CourseManager from "./CourseManager";
import CourseScheduleEditor from "./CourseScheduleEditor";
import AddAssignment from "./AddAssignment";
import KhuAssignmentItem from "./KhuAssignmentItem";

type KhuSidebarProps = {
  courses: Course[];
  assignments: Assignment[];
  upcomingAssignments: Assignment[];
  overdueAssignments: Assignment[];
  todayAssignments: Assignment[];
  onAddCourse: (name: string, professor?: string, color?: string, semester?: string) => Promise<void>;
  onDeleteCourse: (id: string) => Promise<void>;
  onAddAssignment: (
    courseId: string,
    title: string,
    options?: { description?: string; type?: AssignmentType; due_date?: string }
  ) => Promise<void>;
  onUpdateAssignment: (
    id: string,
    updates: Partial<Pick<Assignment, "title" | "description" | "type" | "due_date" | "is_completed">>
  ) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  workspaces?: Workspace[];
  onLinkWorkspace?: (courseId: string, workspaceId: string | null) => Promise<void>;
  // 수업 시간표
  courseSchedules?: CourseSchedule[];
  courseSchedulesLoading?: boolean;
  onAddSchedule?: (schedule: Omit<CourseSchedule, "id" | "user_id" | "created_at">) => Promise<void>;
  onDeleteSchedule?: (id: string) => Promise<void>;
  onDeleteSchedulesByCourse?: (courseName: string) => Promise<void>;
};

type FilterType = "all" | "upcoming" | "overdue" | "today";

export default function KhuSidebar({
  courses,
  assignments,
  upcomingAssignments,
  overdueAssignments,
  todayAssignments,
  onAddCourse,
  onDeleteCourse,
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  workspaces,
  onLinkWorkspace,
  courseSchedules,
  courseSchedulesLoading,
  onAddSchedule,
  onDeleteSchedule,
  onDeleteSchedulesByCourse,
}: KhuSidebarProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  // 필터링된 과제 목록
  function getFilteredAssignments(): Assignment[] {
    let filtered: Assignment[];

    switch (filter) {
      case "upcoming":
        filtered = upcomingAssignments;
        break;
      case "overdue":
        filtered = overdueAssignments;
        break;
      case "today":
        filtered = todayAssignments;
        break;
      default:
        filtered = assignments;
    }

    if (selectedCourseId) {
      filtered = filtered.filter((a) => a.course_id === selectedCourseId);
    }

    return filtered;
  }

  const filteredAssignments = getFilteredAssignments();
  const completedCount = assignments.filter((a) => a.is_completed).length;
  const totalCount = assignments.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          📋 과제 관리
        </h2>
        {totalCount > 0 && (
          <div className="mt-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{completedCount}/{totalCount} 완료</span>
              <span>{Math.round((completedCount / totalCount) * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#9B1B30] to-[#d4465e] transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 과목 관리 */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <CourseManager
          courses={courses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={setSelectedCourseId}
          onAddCourse={onAddCourse}
          onDeleteCourse={onDeleteCourse}
          workspaces={workspaces}
          onLinkWorkspace={onLinkWorkspace}
        />
      </div>

      {/* 수업 시간표 관리 */}
      {onAddSchedule && onDeleteSchedule && onDeleteSchedulesByCourse && (
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <CourseScheduleEditor
            schedules={courseSchedules || []}
            loading={courseSchedulesLoading || false}
            onAdd={onAddSchedule}
            onDelete={onDeleteSchedule}
            onDeleteByCourse={onDeleteSchedulesByCourse}
          />
        </div>
      )}

      {/* 필터 탭 */}
      <div className="flex border-b border-gray-200 px-2 dark:border-gray-700">
        {([
          { key: "all" as FilterType, label: "전체", count: assignments.length },
          { key: "upcoming" as FilterType, label: "예정", count: upcomingAssignments.length },
          { key: "today" as FilterType, label: "오늘", count: todayAssignments.length },
          { key: "overdue" as FilterType, label: "지남", count: overdueAssignments.length },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 border-b-2 px-2 py-2 text-xs font-medium transition-colors ${
              filter === tab.key
                ? "border-[#9B1B30] text-[#9B1B30] dark:text-[#e8a0ad]"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                filter === tab.key
                  ? "bg-[#9B1B30]/10 text-[#9B1B30] dark:bg-[#9B1B30]/20 dark:text-[#e8a0ad]"
                  : tab.key === "overdue" && tab.count > 0
                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 과제 추가 */}
      <div className="px-4 pt-3">
        <AddAssignment
          courses={courses}
          defaultCourseId={selectedCourseId || undefined}
          onAdd={onAddAssignment}
        />
      </div>

      {/* 과제 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-2">
          {filteredAssignments.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-2xl">🎉</p>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                {filter === "overdue"
                  ? "지난 과제가 없어요!"
                  : filter === "today"
                    ? "오늘 마감 과제가 없어요!"
                    : filter === "upcoming"
                      ? "예정된 과제가 없어요!"
                      : "과제를 추가해주세요"}
              </p>
            </div>
          ) : (
            filteredAssignments.map((assignment) => (
              <KhuAssignmentItem
                key={assignment.id}
                assignment={assignment}
                onUpdate={onUpdateAssignment}
                onDelete={onDeleteAssignment}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
