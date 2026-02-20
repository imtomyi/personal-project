"use client";

import { useState, useMemo, useCallback } from "react";
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Todo, Member } from "@/lib/types";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import TodoItem from "./TodoItem";
import Comments from "./Comments";

type TodoListProps = {
  todos: Todo[];
  members: Member[];
  isTeam: boolean;
  onUpdate: (id: string, updates: Partial<Pick<Todo, "title" | "description" | "is_completed" | "assigned_to" | "due_date" | "duration_days" | "priority">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (todos: Todo[]) => Promise<void>;
  onAddSubtask?: (parentId: string, title: string) => Promise<void>;
};

export default function TodoList({
  todos,
  members,
  isTeam,
  onUpdate,
  onDelete,
  onReorder,
  onAddSubtask,
}: TodoListProps) {
  const { user } = useAuth();
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "mine">("all");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Separate top-level todos and subtasks
  const topLevelTodos = useMemo(
    () => todos.filter((t) => !t.parent_id),
    [todos]
  );

  const subtaskMap = useMemo(() => {
    const map: Record<string, Todo[]> = {};
    for (const t of todos) {
      if (t.parent_id) {
        if (!map[t.parent_id]) map[t.parent_id] = [];
        map[t.parent_id].push(t);
      }
    }
    // Sort subtasks by sort_order
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [todos]);

  const filteredTodos = useMemo(
    () =>
      topLevelTodos.filter((todo) => {
        const isSectionHeader = todo.description === SECTION_HEADER_MARKER;
        if (filter === "completed") return !isSectionHeader && todo.is_completed;
        if (filter === "active") return !todo.is_completed;
        if (filter === "mine") return todo.assigned_to === user?.id;
        return true;
      }),
    [topLevelTodos, filter, user?.id]
  );

  const activeTodos = useMemo(
    () =>
      topLevelTodos.filter(
        (t) => !t.is_completed && t.description !== SECTION_HEADER_MARKER
      ).length,
    [topLevelTodos]
  );

  const sortableIds = useMemo(
    () => filteredTodos.map((t) => t.id),
    [filteredTodos]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = filteredTodos.findIndex((t) => t.id === active.id);
      const newIndex = filteredTodos.findIndex((t) => t.id === over.id);

      const reordered = arrayMove(filteredTodos, oldIndex, newIndex);
      onReorder(reordered);
    },
    [filteredTodos, onReorder]
  );

  const handleCloseComments = useCallback(() => {
    setSelectedTodo(null);
  }, []);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Todo list */}
      <div className="flex-1">
        {/* Filter tabs */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {(["all", "active", "completed", "mine"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {f === "all" ? "All" : f === "active" ? "Active" : f === "completed" ? "Done" : "내 할 일"}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {activeTodos} remaining
          </span>
        </div>

        {/* Sortable list */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filteredTodos.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                  {filter === "all"
                    ? "No tasks yet. Add one above!"
                    : filter === "active"
                      ? "No active tasks. Great job!"
                      : filter === "mine"
                        ? "나에게 할당된 할 일이 없습니다."
                        : "No completed tasks yet."}
                </div>
              ) : (
                filteredTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    members={members}
                    isTeam={isTeam}
                    subtasks={subtaskMap[todo.id] || []}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onSelect={setSelectedTodo}
                    onAddSubtask={onAddSubtask}
                    isSelected={selectedTodo?.id === todo.id}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Comments panel */}
      {selectedTodo && (
        <div className="w-full lg:w-80">
          <Comments
            todo={selectedTodo}
            onClose={handleCloseComments}
          />
        </div>
      )}
    </div>
  );
}
