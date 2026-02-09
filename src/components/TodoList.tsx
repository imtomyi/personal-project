"use client";

import { useState } from "react";
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
import TodoItem from "./TodoItem";
import Comments from "./Comments";

type TodoListProps = {
  todos: Todo[];
  members: Member[];
  onUpdate: (id: string, updates: Partial<Pick<Todo, "title" | "description" | "is_completed" | "assigned_to">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (todos: Todo[]) => Promise<void>;
};

export default function TodoList({
  todos,
  members,
  onUpdate,
  onDelete,
  onReorder,
}: TodoListProps) {
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.is_completed;
    if (filter === "completed") return todo.is_completed;
    return true;
  });

  const activeTodos = todos.filter((t) => !t.is_completed).length;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredTodos.findIndex((t) => t.id === active.id);
    const newIndex = filteredTodos.findIndex((t) => t.id === over.id);

    const reordered = arrayMove(filteredTodos, oldIndex, newIndex);
    onReorder(reordered);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Todo list */}
      <div className="flex-1">
        {/* Filter tabs */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {(["all", "active", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {f === "all" ? "All" : f === "active" ? "Active" : "Done"}
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
            items={filteredTodos.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filteredTodos.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                  {filter === "all"
                    ? "No tasks yet. Add one above!"
                    : filter === "active"
                      ? "No active tasks. Great job!"
                      : "No completed tasks yet."}
                </div>
              ) : (
                filteredTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    members={members}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onSelect={setSelectedTodo}
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
            onClose={() => setSelectedTodo(null)}
          />
        </div>
      )}
    </div>
  );
}
