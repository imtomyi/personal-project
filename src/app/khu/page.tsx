"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useAuth } from "@/context/AuthContext";
import { useCourses } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import { useCanvas } from "@/hooks/useCanvas";
import { useAllWorkspaceTodos } from "@/hooks/useAllWorkspaceTodos";
import { useWidgetConfig } from "@/hooks/useWidgetConfig";
import type { WidgetId } from "@/lib/types";
import { KHU_QUICK_LINKS } from "@/lib/constants";
import Header from "@/components/layout/Header";
import KhuSidebar from "@/components/khu/KhuSidebar";
import KhuAcademicCalendar from "@/components/khu/KhuAcademicCalendar";
import KhuShuttleInfo from "@/components/khu/KhuShuttleInfo";
import KhuCanvasSync from "@/components/khu/KhuCanvasSync";
import KhuMealInfo from "@/components/khu/KhuMealInfo";
import { useIcsFeed } from "@/hooks/useIcsFeed";
import { useCourseSchedules } from "@/hooks/useCourseSchedules";
import SortableWidget from "@/components/khu/SortableWidget";
import WidgetPicker from "@/components/khu/WidgetPicker";

export default function KhuPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const { courses, addCourse, deleteCourse, importCoursesFromCanvas, linkCourseToWorkspace } = useCourses();
  const {
    assignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    importAssignmentsFromCanvas,
    upcomingAssignments,
    overdueAssignments,
    todayAssignments,
  } = useAssignments();
  const canvas = useCanvas();
  const { workspaces } = useAllWorkspaceTodos();
  const { events: icsEvents, feedUrl: icsFeedUrl, setFeedUrl: setIcsFeedUrl, loading: icsFeedLoading } = useIcsFeed();
  const {
    schedules: courseSchedules,
    loading: courseSchedulesLoading,
    addSchedule,
    deleteSchedule,
    deleteSchedulesByCourse,
  } = useCourseSchedules();
  const {
    widgets,
    visibleWidgets,
    isEditing,
    setIsEditing,
    toggleWidget,
    reorderWidgets,
    resetConfig,
  } = useWidgetConfig();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Canvas 토큰이 저장되어 있으면 자동 연결
  useEffect(() => {
    if (canvas.token && !canvas.isConnected && !canvas.loading) {
      canvas.fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Canvas → 학기 플래너 가져오기 핸들러
  async function handleCanvasImport() {
    if (canvas.courses.length === 0) return;
    // 1. 과목 먼저 가져와서 canvasId → courseId 매핑 생성
    const courseMapping = await importCoursesFromCanvas(canvas.courses);
    // 2. 과제가 아직 없으면 먼저 불러오기
    if (canvas.assignments.length === 0) {
      await canvas.fetchAllAssignments();
    }
    // 3. 과제 가져오기
    if (canvas.assignments.length > 0) {
      await importAssignmentsFromCanvas(canvas.assignments, courseMapping);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleWidgets.findIndex((w) => w.id === active.id);
    const newIndex = visibleWidgets.findIndex((w) => w.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderWidgets(oldIndex, newIndex);
    }
  }

  // 위젯 ID → 컴포넌트 매핑
  function renderWidget(widgetId: WidgetId) {
    switch (widgetId) {
      case "calendar":
        return <KhuAcademicCalendar workspaces={workspaces} />;
      case "shuttle":
        return <KhuShuttleInfo />;
      case "meals":
        return <KhuMealInfo />;
      case "canvas":
        return (
          <KhuCanvasSync
            isConnected={canvas.isConnected}
            loading={canvas.loading}
            error={canvas.error}
            courses={canvas.courses}
            assignments={canvas.assignments}
            onConnect={canvas.connect}
            onDisconnect={canvas.disconnect}
            onFetchAllAssignments={canvas.fetchAllAssignments}
            onImportToPlanner={handleCanvasImport}
            icsFeedUrl={icsFeedUrl}
            onIcsFeedUrlChange={setIcsFeedUrl}
            icsFeedLoading={icsFeedLoading}
            icsFeedEventCount={icsEvents.length}
          />
        );
      default:
        return null;
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#9B1B30]/[0.04] via-[#f5f5f7] to-[#f5f5f7] dark:from-[#9B1B30]/[0.08] dark:via-[#111827] dark:to-[#111827]">
        <div className="h-7 w-7 animate-spin rounded-full border-[2.5px] border-[#9B1B30] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#9B1B30]/[0.05] via-[#f5f5f7] to-[#f5f5f7] dark:from-[#9B1B30]/[0.10] dark:via-[#111827] dark:to-[#111827]">
      <Header />

      {/* KHU 서브 헤더 */}
      <div className="border-b border-[#9B1B30]/[0.08] bg-gradient-to-r from-[#9B1B30]/[0.03] via-white/80 to-white/80 backdrop-blur-xl backdrop-saturate-[1.8] dark:border-[#9B1B30]/[0.15] dark:from-[#9B1B30]/[0.08] dark:via-[#111827]/80 dark:to-[#111827]/80">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="flex items-center gap-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#9B1B30] shadow-[0_2px_8px_rgba(155,27,48,0.25)]">
                <span className="text-[13px] font-bold text-white">KHU</span>
              </div>
              <div>
                <h1 className="text-[17px] font-semibold text-foreground dark:text-white">
                  경희대학교
                </h1>
                <p className="text-[12px] text-[#9B1B30]/60 dark:text-[#e8a0ad]/60">
                  Kyung Hee University
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {overdueAssignments.length > 0 && (
                <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[12px] font-medium text-red-600 dark:text-red-400">
                  지난 과제 {overdueAssignments.length}개
                </span>
              )}
              {todayAssignments.length > 0 && (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[12px] font-medium text-amber-600 dark:text-amber-400">
                  오늘 마감 {todayAssignments.length}개
                </span>
              )}

              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-medium ${
                  isEditing
                    ? "bg-[#9B1B30] text-white dark:bg-[#9B1B30]"
                    : "bg-[#9B1B30]/[0.08] text-[#9B1B30] hover:bg-[#9B1B30]/[0.12] dark:bg-[#9B1B30]/[0.15] dark:text-[#e8a0ad] dark:hover:bg-[#9B1B30]/[0.22]"
                }`}
              >
                {isEditing ? "완료" : "위젯 편집"}
              </button>
            </div>
          </div>
          {/* 바로가기 메뉴바 */}
          <div className="-mx-5 flex items-center gap-1 overflow-x-auto px-5 pb-2.5">
            {KHU_QUICK_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium text-secondary transition-colors hover:bg-[#9B1B30]/[0.08] hover:text-[#9B1B30] dark:hover:bg-[#9B1B30]/[0.15] dark:hover:text-[#e8a0ad]"
              >
                {link.emoji} {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠: 6:4 레이아웃 */}
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* 왼쪽: 메인 영역 (60%) - 위젯 대시보드 */}
          <main className="min-w-0 flex-1 space-y-4 lg:w-[60%]">
            {/* 위젯 편집 패널 */}
            {isEditing && (
              <WidgetPicker
                widgets={widgets}
                onToggle={toggleWidget}
                onReset={resetConfig}
                onClose={() => setIsEditing(false)}
              />
            )}

            {/* 위젯 목록 */}
            {isEditing ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleWidgets.map((w) => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {visibleWidgets.map((w) => (
                      <SortableWidget
                        key={w.id}
                        id={w.id}
                        isEditing={true}
                        onRemove={toggleWidget}
                      >
                        {renderWidget(w.id)}
                      </SortableWidget>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              visibleWidgets.map((w) => (
                <div key={w.id}>{renderWidget(w.id)}</div>
              ))
            )}

            {/* 빈 대시보드 */}
            {visibleWidgets.length === 0 && (
              <div className="card-surface p-12 text-center">
                <p className="text-3xl">📭</p>
                <p className="mt-3 text-[15px] font-medium text-foreground dark:text-white">
                  표시할 위젯이 없습니다
                </p>
                <p className="mt-1 text-[13px] text-secondary">
                  위젯 편집 버튼을 눌러서 원하는 위젯을 추가하세요
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-4 rounded-full bg-[#9B1B30] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#9B1B30]/90"
                >
                  위젯 추가하기
                </button>
              </div>
            )}
          </main>

          {/* 오른쪽: 사이드바 (40%) - 과제 관리 (항상 표시) */}
          <aside className="w-full flex-shrink-0 lg:w-[40%]">
            <div className="card-surface overflow-hidden lg:sticky lg:top-[120px]" style={{ maxHeight: "calc(100vh - 150px)" }}>
              <KhuSidebar
                courses={courses}
                assignments={assignments}
                upcomingAssignments={upcomingAssignments}
                overdueAssignments={overdueAssignments}
                todayAssignments={todayAssignments}
                onAddCourse={addCourse}
                onDeleteCourse={deleteCourse}
                onAddAssignment={addAssignment}
                onUpdateAssignment={updateAssignment}
                onDeleteAssignment={deleteAssignment}
                workspaces={workspaces}
                onLinkWorkspace={linkCourseToWorkspace}
                courseSchedules={courseSchedules}
                courseSchedulesLoading={courseSchedulesLoading}
                onAddSchedule={addSchedule}
                onDeleteSchedule={deleteSchedule}
                onDeleteSchedulesByCourse={deleteSchedulesByCourse}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
