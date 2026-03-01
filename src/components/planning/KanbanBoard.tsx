"use client";

import { useMemo, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Todo, Member, TodoStatus } from "@/lib/types";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import { parseLocalDate, toDateStr, nowKST } from "@/lib/date";

type KanbanBoardProps = {
  todos: Todo[];
  members: Member[];
  onUpdate: (
    id: string,
    updates: Partial<Pick<Todo, "is_completed" | "status" | "sort_order" | "priority">>
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

type ColumnDef = {
  id: TodoStatus;
  label: string;
  emoji: string;
  color: string;
  headerBg: string;
  countBg: string;
};

const COLUMNS: ColumnDef[] = [
  {
    id: "todo",
    label: "할 일",
    emoji: "📋",
    color: "border-t-blue-400",
    headerBg: "text-blue-600 dark:text-blue-400",
    countBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    id: "in_progress",
    label: "진행 중",
    emoji: "🔄",
    color: "border-t-amber-400",
    headerBg: "text-amber-600 dark:text-amber-400",
    countBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  {
    id: "done",
    label: "완료",
    emoji: "✅",
    color: "border-t-emerald-400",
    headerBg: "text-emerald-600 dark:text-emerald-400",
    countBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
];

const PRIORITY_STYLES: Record<number, { label: string; bg: string }> = {
  1: { label: "긴급", bg: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  2: { label: "높음", bg: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  3: { label: "보통", bg: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" },
  4: { label: "낮음", bg: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
};

// ── Sortable Card ──
function SortableCard({
  todo,
  members,
  onDelete,
}: {
  todo: Todo;
  members: Member[];
  onDelete: (id: string) => Promise<void>;
}) {
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
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard todo={todo} members={members} onDelete={onDelete} />
    </div>
  );
}

// ── Card UI ──
function KanbanCard({
  todo,
  members,
  onDelete,
  isOverlay,
}: {
  todo: Todo;
  members: Member[];
  onDelete?: (id: string) => Promise<void>;
  isOverlay?: boolean;
}) {
  const todayStr = toDateStr(nowKST());
  const assignee = members.find((m) => m.user_id === todo.assigned_to);

  let dueBadge: { text: string; className: string } | null = null;
  if (todo.due_date && !todo.is_completed) {
    const dueStr = toDateStr(parseLocalDate(todo.due_date));
    if (dueStr < todayStr) {
      dueBadge = { text: "지연", className: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" };
    } else if (dueStr === todayStr) {
      dueBadge = { text: "오늘", className: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" };
    }
  }

  return (
    <div
      className={`group rounded-xl border border-black/[0.06] bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-white/[0.08] dark:bg-[#1c1c1e] ${
        isOverlay ? "rotate-2 shadow-lg" : ""
      }`}
    >
      {/* Title */}
      <p
        className={`text-[13px] font-medium leading-snug ${
          todo.is_completed
            ? "text-secondary line-through"
            : "text-foreground dark:text-[#e5e5e7]"
        }`}
      >
        {todo.title}
      </p>

      {/* Badges row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {todo.priority && PRIORITY_STYLES[todo.priority] && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[todo.priority].bg}`}>
            {PRIORITY_STYLES[todo.priority].label}
          </span>
        )}
        {dueBadge && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${dueBadge.className}`}>
            {dueBadge.text}
          </span>
        )}
        {todo.due_date && (
          <span className="text-[10px] text-secondary">
            {todo.due_date.slice(5).replace("-", "/")}
          </span>
        )}
      </div>

      {/* Footer: assignee + delete */}
      <div className="mt-2 flex items-center justify-between">
        {assignee?.profiles ? (
          <div className="flex items-center gap-1">
            {assignee.profiles.avatar_url ? (
              <img src={assignee.profiles.avatar_url} alt="" className="h-4 w-4 rounded-full" />
            ) : (
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-[8px] font-bold text-white">
                {(assignee.profiles.name || assignee.profiles.email || "?")[0].toUpperCase()}
              </div>
            )}
            <span className="text-[10px] text-secondary">
              {assignee.profiles.name || assignee.profiles.email}
            </span>
          </div>
        ) : (
          <div />
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo.id);
            }}
            className="rounded p-0.5 text-secondary opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Droppable Column ──
function DroppableColumn({
  column,
  todos,
  members,
  onDelete,
}: {
  column: ColumnDef;
  todos: Todo[];
  members: Member[];
  onDelete: (id: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      className={`flex min-h-[200px] w-full min-w-[260px] flex-col rounded-2xl border-t-[3px] bg-[#f5f5f7]/70 p-3 transition-colors dark:bg-white/[0.04] ${column.color} ${
        isOver ? "bg-blue-50/50 ring-2 ring-blue-200 dark:bg-blue-900/10 dark:ring-blue-800" : ""
      }`}
    >
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{column.emoji}</span>
          <span className={`text-[13px] font-semibold ${column.headerBg}`}>
            {column.label}
          </span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${column.countBg}`}>
          {todos.length}
        </span>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2">
        <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {todos.map((todo) => (
            <SortableCard key={todo.id} todo={todo} members={members} onDelete={onDelete} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {todos.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-black/[0.06] py-8 dark:border-white/[0.06]">
            <p className="text-[12px] text-secondary/60">드래그하여 이동</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main KanbanBoard ──
export default function KanbanBoard({ todos, members, onUpdate, onDelete }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Filter out section headers
  const realTodos = useMemo(
    () => todos.filter((t) => t.description !== SECTION_HEADER_MARKER && !t.parent_id),
    [todos]
  );

  // Group by status
  const columns = useMemo(() => {
    const grouped: Record<TodoStatus, Todo[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const t of realTodos) {
      const status = t.status || (t.is_completed ? "done" : "todo");
      grouped[status].push(t);
    }
    return grouped;
  }, [realTodos]);

  const activeTodo = activeId ? realTodos.find((t) => t.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // No-op: we handle everything in onDragEnd
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const draggedTodo = realTodos.find((t) => t.id === active.id);
      if (!draggedTodo) return;

      // Determine target column
      let targetStatus: TodoStatus;
      const overId = over.id as string;

      if (overId === "todo" || overId === "in_progress" || overId === "done") {
        targetStatus = overId;
      } else {
        // Dropped on a card — find which column it belongs to
        const overTodo = realTodos.find((t) => t.id === overId);
        if (!overTodo) return;
        targetStatus = overTodo.status || (overTodo.is_completed ? "done" : "todo");
      }

      const currentStatus = draggedTodo.status || (draggedTodo.is_completed ? "done" : "todo");

      if (currentStatus !== targetStatus) {
        const updates: Partial<Pick<Todo, "status" | "is_completed">> = {
          status: targetStatus,
          is_completed: targetStatus === "done",
        };
        await onUpdate(draggedTodo.id, updates);
      }
    },
    [realTodos, onUpdate]
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map((col) => (
          <div key={col.id} className="flex-1 snap-center">
            <DroppableColumn
              column={col}
              todos={columns[col.id]}
              members={members}
              onDelete={onDelete}
            />
          </div>
        ))}

        <DragOverlay>
          {activeTodo ? (
            <KanbanCard todo={activeTodo} members={members} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
