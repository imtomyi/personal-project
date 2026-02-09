"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Todo, Member } from "@/lib/types";

type TodoItemProps = {
  todo: Todo;
  members: Member[];
  onUpdate: (id: string, updates: Partial<Pick<Todo, "title" | "description" | "is_completed" | "assigned_to">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSelect: (todo: Todo) => void;
  isSelected: boolean;
};

export default function TodoItem({
  todo,
  members,
  onUpdate,
  onDelete,
  onSelect,
  isSelected,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description || "");

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

  async function handleToggle() {
    await onUpdate(todo.id, { is_completed: !todo.is_completed });
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) return;
    await onUpdate(todo.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
    });
    setIsEditing(false);
  }

  async function handleAssign(userId: string | null) {
    await onUpdate(todo.id, { assigned_to: userId });
  }

  const assignedProfile = todo.assigned_profile;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-xl border bg-white p-4 shadow-sm transition-all dark:bg-gray-800 ${
        isDragging
          ? "z-50 border-blue-300 shadow-lg dark:border-blue-600"
          : isSelected
            ? "border-blue-200 ring-2 ring-blue-500/20 dark:border-blue-700"
            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
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
                  if (e.key === "Escape") setIsEditing(false);
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
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className="cursor-pointer"
              onClick={() => onSelect(todo)}
            >
              <p
                className={`text-sm font-medium ${
                  todo.is_completed
                    ? "text-gray-400 line-through dark:text-gray-500"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {todo.title}
              </p>
              {todo.description && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {todo.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                {assignedProfile && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    {assignedProfile.avatar_url ? (
                      <img src={assignedProfile.avatar_url} alt="" className="h-3.5 w-3.5 rounded-full" />
                    ) : null}
                    {assignedProfile.name || assignedProfile.email}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {/* Assign dropdown */}
          <select
            value={todo.assigned_to || ""}
            onChange={(e) => handleAssign(e.target.value || null)}
            className="rounded border border-gray-200 bg-transparent px-1 py-0.5 text-xs text-gray-500 outline-none dark:border-gray-600 dark:text-gray-400"
            title="Assign to"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profiles?.name || m.profiles?.email || "Unknown"}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setEditTitle(todo.title);
              setEditDescription(todo.description || "");
              setIsEditing(true);
            }}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="Edit"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>

          <button
            onClick={() => onDelete(todo.id)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title="Delete"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
