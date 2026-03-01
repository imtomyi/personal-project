"use client";

import { memo, useState, useMemo, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Todo, Member } from "@/lib/types";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import { parseLocalDate, nowKST, fmtDateKST, toDateStr, getDurationInDays } from "@/lib/date";
import DurationPicker from "@/components/planning/DurationPicker";
import DatePicker from "@/components/calendar/DatePicker";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

type TodoItemProps = {
  todo: Todo;
  members: Member[];
  isTeam: boolean;
  subtasks?: Todo[];
  onUpdate: (id: string, updates: Partial<Pick<Todo, "title" | "description" | "is_completed" | "assigned_to" | "due_date" | "due_time" | "duration_days" | "priority">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSelect: (todo: Todo) => void;
  onAddSubtask?: (parentId: string, title: string) => Promise<void>;
  isSelected: boolean;
};

type UrgencyStyle = { label: string; textColor: string; bgColor: string };

/** 마감 긴급도 계산 — 3일 전부터 점진적 색상 */
function computeUrgency(
  deadlineDate: Date | null,
  todayStr: string,
  now: Date,
  isCompleted: boolean,
): UrgencyStyle | null {
  if (!deadlineDate || isCompleted) return null;
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const deadlineStr = toDateStr(deadlineDate);

  // 이미 지남
  if (deadlineStr < todayStr) {
    const overDays = Math.floor((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: `${overDays}일 지남`,
      textColor: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-900/30",
    };
  }

  // 오늘 마감
  if (deadlineStr === todayStr) {
    return {
      label: "오늘 마감",
      textColor: "text-red-500 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    };
  }

  // D-1 (내일 마감)
  if (diffDays === 1 || (diffHours > 0 && diffHours <= 48)) {
    return {
      label: diffHours <= 36 ? `${diffHours}시간 남음` : "내일 마감",
      textColor: "text-orange-500 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
    };
  }

  // D-2
  if (diffDays === 2) {
    return {
      label: "2일 남음",
      textColor: "text-amber-500 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/15",
    };
  }

  // D-3
  if (diffDays === 3) {
    return {
      label: "3일 남음",
      textColor: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50/60 dark:bg-yellow-900/10",
    };
  }

  return null;
}

function TodoItem({
  todo,
  members,
  isTeam,
  subtasks = [],
  onUpdate,
  onDelete,
  onSelect,
  onAddSubtask,
  isSelected,
}: TodoItemProps) {
  const isSectionHeader = todo.description === SECTION_HEADER_MARKER;
  const isSubtask = !!todo.parent_id;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [editDescription, setEditDescription] = useState(
    isSectionHeader ? "" : (todo.description || "")
  );

  // 완료 시 exit 애니메이션 상태
  const [isExiting, setIsExiting] = useState(false);

  // ── Mobile swipe gesture hook ──
  const { swipeX, isSwiping, touchRef, handlers } = useSwipeGesture({
    threshold: 100,
    onSwipeLeft: () => onDelete(todo.id),
    onSwipeRight: () => onUpdate(todo.id, { is_completed: !todo.is_completed }),
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleToggle = useCallback(async () => {
    if (!todo.is_completed) {
      // 완료 처리: exit 애니메이션 후 업데이트
      setIsExiting(true);
      setTimeout(() => {
        onUpdate(todo.id, { is_completed: true });
      }, 300);
    } else {
      // 미완료 복원: 즉시 업데이트
      await onUpdate(todo.id, { is_completed: false });
    }
  }, [onUpdate, todo.id, todo.is_completed]);

  const handleSaveEdit = useCallback(async () => {
    if (!editTitle.trim()) return;
    await onUpdate(todo.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
    });
    setIsEditing(false);
  }, [onUpdate, todo.id, editTitle, editDescription]);

  const handleSelectTodo = useCallback(() => {
    onSelect(todo);
  }, [onSelect, todo]);

  const handleStartEdit = useCallback(() => {
    setEditTitle(todo.title);
    setEditDescription(todo.description || "");
    setIsEditing(true);
  }, [todo.title, todo.description]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleDeleteTodo = useCallback(() => {
    onDelete(todo.id);
  }, [onDelete, todo.id]);

  const handleAddSubtask = useCallback(async () => {
    if (!subtaskTitle.trim() || !onAddSubtask) return;
    await onAddSubtask(todo.id, subtaskTitle.trim());
    setSubtaskTitle("");
    setAddingSubtask(false);
  }, [onAddSubtask, todo.id, subtaskTitle]);

  const completedSubtasks = subtasks.filter((s) => s.is_completed).length;

  const handleDurationChange = useCallback((hours: number) => {
    onUpdate(todo.id, { duration_days: hours });
  }, [onUpdate, todo.id]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(todo.id, { due_date: e.target.value || null });
  }, [onUpdate, todo.id]);

  const handleAssignChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(todo.id, { assigned_to: e.target.value || null });
  }, [onUpdate, todo.id]);

  const handlePriorityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onUpdate(todo.id, { priority: val ? Number(val) : null });
  }, [onUpdate, todo.id]);

  const isStarred = todo.priority != null && todo.priority <= 2;

  const handleToggleStar = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(todo.id, { priority: isStarred ? null : 1 });
  }, [onUpdate, todo.id, isStarred]);

  const priorityBorderClass = useMemo(() => {
    if (todo.priority != null && todo.priority <= 2) return "border-l-4 border-l-amber-400";
    return "";
  }, [todo.priority]);

  // Memoized date/urgency computations
  const { deadlineStr, isOverdue, urgency } = useMemo(() => {
    const startDate = todo.due_date ? parseLocalDate(todo.due_date) : null;
    const currentNow = nowKST();
    const currentTodayStr = toDateStr(currentNow);
    const durationInDays = getDurationInDays(todo.duration_days);
    const dl = startDate
      ? (() => { const d = new Date(startDate); d.setDate(d.getDate() + durationInDays - 1); return d; })()
      : null;
    const dlStr = dl ? toDateStr(dl) : null;
    const overdue = dl && !todo.is_completed && toDateStr(dl) < currentTodayStr;

    return {
      deadlineStr: dlStr,
      isOverdue: overdue,
      urgency: computeUrgency(dl, currentTodayStr, currentNow, todo.is_completed),
    };
  }, [todo.due_date, todo.duration_days, todo.is_completed]);

  const assignedProfile = todo.assigned_profile;

  if (isSectionHeader) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-2 rounded-lg px-1 py-3 ${
          isDragging ? "z-50 opacity-50" : ""
        }`}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
          tabIndex={-1}
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
        <div className="flex flex-1 items-center gap-3">
          <h3 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {todo.title}
          </h3>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>
        <button
          onClick={handleDeleteTodo}
          className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          title="Delete section"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(isExiting ? { maxHeight: 0, opacity: 0, marginBottom: 0, padding: 0, overflow: "hidden", transition: "all 300ms ease-out" } : {}),
      }}
      className={`group relative overflow-hidden rounded-xl border shadow-sm transition-all ${priorityBorderClass} ${
        isDragging
          ? "z-50 border-blue-300 shadow-lg dark:border-blue-600"
          : isSelected
            ? "border-blue-200 ring-2 ring-blue-500/20 dark:border-blue-700"
            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
      }`}
      onTouchStart={!isSectionHeader && !isEditing ? handlers.onTouchStart : undefined}
      onTouchMove={!isSectionHeader && !isEditing ? handlers.onTouchMove : undefined}
      onTouchEnd={!isSectionHeader && !isEditing ? handlers.onTouchEnd : undefined}
    >
      {/* Swipe action backgrounds — visible during swipe */}
      {isSwiping && (
        <>
          {/* Right swipe -> green complete area */}
          <div className="absolute inset-0 flex items-center justify-start bg-emerald-500 px-5">
            <div className="flex items-center gap-2 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold">완료</span>
            </div>
          </div>
          {/* Left swipe -> red delete area */}
          <div className="absolute inset-0 flex items-center justify-end bg-red-500 px-5">
            <div className="flex items-center gap-2 text-white">
              <span className="text-sm font-semibold">삭제</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
        </>
      )}

      {/* Card content — slides on swipe */}
      <div
        className="relative bg-white px-3 py-3 dark:bg-gray-800 md:p-4"
        style={{
          transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
          transition: isSwiping && touchRef.current.started ? "none" : "transform 0.3s ease-out",
        }}
      >
      <div className="flex items-start gap-2 md:gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 hidden cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing md:block dark:text-gray-600 dark:hover:text-gray-400"
          tabIndex={-1}
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>

        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            todo.is_completed
              ? "border-green-500 bg-green-500 text-white"
              : "border-gray-300 hover:border-blue-400 dark:border-gray-600"
          }`}
        >
          {todo.is_completed && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded border border-gray-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") handleCancelEdit();
                }}
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full resize-none rounded border border-gray-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:text-gray-300"
                rows={2}
                placeholder="Description..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                >
                  저장
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="rounded px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div
              className="cursor-pointer"
              onClick={handleSelectTodo}
            >
              <p
                className={`text-sm font-medium ${
                  todo.is_completed
                    ? "text-gray-400 line-through dark:text-gray-500"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {isStarred && <span className="mr-1 text-amber-500">★</span>}
                {todo.title}
              </p>
              {todo.description && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {todo.description}
                </p>
              )}

              {/* Date/Duration/Assignment info - always visible */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {/* Assigned profile — team plan only */}
                {isTeam && assignedProfile && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    {assignedProfile.avatar_url ? (
                      <img src={assignedProfile.avatar_url} alt="" className="h-3.5 w-3.5 rounded-full" />
                    ) : null}
                    {assignedProfile.name || assignedProfile.email}
                  </span>
                )}

                {/* 날짜 배지: 시작일 → 마감일 */}
                {todo.due_date && (
                  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ${
                    todo.is_completed
                      ? "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                      : isOverdue
                        ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : urgency
                          ? `${urgency.bgColor} ${urgency.textColor}`
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {fmtDateKST(todo.due_date)}
                    {todo.due_time && (
                      <span className="opacity-70">{todo.due_time}</span>
                    )}
                    {deadlineStr && deadlineStr !== todo.due_date && (
                      <span className="opacity-70">→ {fmtDateKST(deadlineStr)}</span>
                    )}
                  </span>
                )}

                {/* Duration badge - always visible, clickable */}
                <DurationPicker
                  value={todo.duration_days || 24}
                  dueDate={todo.due_date}
                  onChange={handleDurationChange}
                  compact
                />

                {/* 마감 긴급도 표시 */}
                {urgency && (
                  <span className={`whitespace-nowrap text-[10px] font-medium ${urgency.textColor}`}>
                    {urgency.label}
                  </span>
                )}
              </div>

              {/* Mobile quick actions - tap row */}
              <div className="mt-2 flex items-center gap-1.5 md:hidden">
                {/* Date picker (mobile) */}
                <DatePicker
                  value={todo.due_date ? toDateStr(parseLocalDate(todo.due_date)) : ""}
                  onChange={(date) => handleDateChange({ target: { value: date } } as React.ChangeEvent<HTMLInputElement>)}
                  onClear={() => handleDateChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>)}
                  inline
                />
                {/* Time picker (mobile) */}
                <input
                  type="time"
                  value={todo.due_time || ""}
                  onChange={(e) => onUpdate(todo.id, { due_time: e.target.value || null })}
                  className="h-7 w-[80px] rounded-lg border border-gray-200 bg-gray-50 px-1.5 text-[11px] text-gray-600 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  title="선호 시간"
                />
                {/* Star toggle (mobile) */}
                <button
                  onClick={handleToggleStar}
                  className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-colors ${
                    isStarred
                      ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                      : "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500"
                  }`}
                  title="중요 표시"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {isStarred ? "중요" : ""}
                </button>
                <div className="flex-1" />
                {/* Edit (mobile) */}
                <button
                  onClick={handleStartEdit}
                  className="rounded-lg p-1.5 text-gray-400 active:bg-gray-100 dark:active:bg-gray-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                {/* Delete (mobile) */}
                <button
                  onClick={handleDeleteTodo}
                  className="rounded-lg p-1.5 text-gray-400 active:bg-red-50 active:text-red-500"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions - desktop: hover reveal, mobile: hidden (use swipe or tap) */}
        <div className="hidden flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
          <DatePicker
            value={todo.due_date ? toDateStr(parseLocalDate(todo.due_date)) : ""}
            onChange={(date) => handleDateChange({ target: { value: date } } as React.ChangeEvent<HTMLInputElement>)}
            onClear={() => handleDateChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>)}
            inline
          />
          <input
            type="time"
            value={todo.due_time || ""}
            onChange={(e) => onUpdate(todo.id, { due_time: e.target.value || null })}
            className="w-[72px] rounded border border-gray-200 bg-transparent px-1 py-0.5 text-xs text-gray-500 outline-none dark:border-gray-600 dark:text-gray-400"
            title="선호 시간"
          />
          <button
            onClick={handleToggleStar}
            className={`rounded p-1 transition-colors ${
              isStarred
                ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                : "text-gray-300 hover:bg-gray-100 hover:text-amber-400 dark:text-gray-600 dark:hover:bg-gray-700"
            }`}
            title={isStarred ? "중요 해제" : "중요 표시"}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          {isTeam && (
            <select
              value={todo.assigned_to || ""}
              onChange={handleAssignChange}
              className="rounded border border-gray-200 bg-transparent px-1 py-0.5 text-xs text-gray-500 outline-none dark:border-gray-600 dark:text-gray-400"
              title="담당자"
            >
              <option value="">미배정</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profiles?.name || m.profiles?.email || "Unknown"}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleStartEdit}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="수정"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={handleDeleteTodo}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title="삭제"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Subtask section (only for top-level todos) ── */}
      {!isSubtask && !isSectionHeader && (subtasks.length > 0 || onAddSubtask) && (
        <div className="ml-8 mt-2 border-t border-gray-100 pt-2 dark:border-gray-700/50">
          {/* Subtask header with toggle & progress */}
          {subtasks.length > 0 && (
            <button
              onClick={() => setShowSubtasks(!showSubtasks)}
              className="mb-1.5 flex items-center gap-2 text-[11px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <svg
                className={`h-3 w-3 transition-transform ${showSubtasks ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium">하위 작업</span>
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-gray-700">
                {completedSubtasks}/{subtasks.length}
              </span>
              {/* Mini progress bar */}
              {subtasks.length > 0 && (
                <div className="h-1 w-12 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                  />
                </div>
              )}
            </button>
          )}

          {/* Subtask list */}
          {showSubtasks && subtasks.length > 0 && (
            <div className="space-y-1">
              {subtasks.map((sub) => {
                const subDurDays = getDurationInDays(sub.duration_days);
                const subDeadline = sub.due_date ? (() => {
                  const d = new Date(parseLocalDate(sub.due_date));
                  d.setDate(d.getDate() + subDurDays - 1);
                  return fmtDateKST(toDateStr(d));
                })() : null;

                return (
                  <div key={sub.id} className="group/sub rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdate(sub.id, { is_completed: !sub.is_completed })}
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                          sub.is_completed
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-gray-300 hover:border-blue-400 dark:border-gray-600"
                        }`}
                      >
                        {sub.is_completed && (
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`min-w-0 flex-1 text-xs ${
                        sub.is_completed
                          ? "text-gray-400 line-through dark:text-gray-500"
                          : "text-gray-700 dark:text-gray-300"
                      }`}>
                        {sub.title}
                      </span>

                      {/* Subtask date/duration controls — visible on hover */}
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/sub:opacity-100">
                        <DatePicker
                          value={sub.due_date ? toDateStr(parseLocalDate(sub.due_date)) : ""}
                          onChange={(date) => onUpdate(sub.id, { due_date: date })}
                          onClear={() => onUpdate(sub.id, { due_date: null })}
                          inline
                        />
                        <DurationPicker
                          value={sub.duration_days || 24}
                          dueDate={sub.due_date}
                          onChange={(hours) => onUpdate(sub.id, { duration_days: hours })}
                          compact
                        />
                      </div>

                      <button
                        onClick={() => onDelete(sub.id)}
                        className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover/sub:opacity-100 dark:text-gray-600"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {/* Subtask date info — always visible when set */}
                    {sub.due_date && (
                      <div className="ml-6 mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {fmtDateKST(sub.due_date)}
                        {subDeadline && subDeadline !== fmtDateKST(sub.due_date) && (
                          <span>→ {subDeadline}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add subtask input */}
          {addingSubtask ? (
            <div className="mt-1 flex items-center gap-1.5">
              <input
                type="text"
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="하위 작업 입력..."
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-2.5 py-1 text-xs outline-none focus:border-blue-400 dark:border-gray-600 dark:text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubtask();
                  if (e.key === "Escape") { setAddingSubtask(false); setSubtaskTitle(""); }
                }}
              />
              <button
                onClick={handleAddSubtask}
                disabled={!subtaskTitle.trim()}
                className="rounded-lg bg-blue-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                추가
              </button>
              <button
                onClick={() => { setAddingSubtask(false); setSubtaskTitle(""); }}
                className="rounded-lg px-2 py-1 text-[11px] text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                취소
              </button>
            </div>
          ) : onAddSubtask ? (
            <button
              onClick={() => setAddingSubtask(true)}
              className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700/30 dark:hover:text-gray-300"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              하위 작업 추가
            </button>
          ) : null}
        </div>
      )}
      </div>{/* end card content wrapper */}
    </div>
  );
}

export default memo(TodoItem);
