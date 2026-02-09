"use client";

import { useState } from "react";

type AddTodoProps = {
  onAdd: (title: string, description?: string) => Promise<void>;
};

export default function AddTodo({ onAdd }: AddTodoProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onAdd(title.trim(), description.trim() || undefined);
      setTitle("");
      setDescription("");
      setExpanded(false);
    } catch (err) {
      console.error("Failed to add todo:", err);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Add a new task..."
          className="w-full bg-transparent text-gray-900 placeholder-gray-400 outline-none dark:text-white"
          disabled={loading}
        />
        {expanded && (
          <>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description (optional)"
              rows={2}
              className="mt-2 w-full resize-none bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none dark:text-gray-300"
              disabled={loading}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  setTitle("");
                  setDescription("");
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || loading}
                className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Task"}
              </button>
            </div>
          </>
        )}
      </div>
    </form>
  );
}
