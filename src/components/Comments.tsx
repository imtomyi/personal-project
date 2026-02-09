"use client";

import { useState } from "react";
import { useRealtimeComments } from "@/hooks/useRealtimeComments";
import { useAuth } from "@/context/AuthContext";
import type { Todo } from "@/lib/types";

type CommentsProps = {
  todo: Todo;
  onClose: () => void;
};

export default function Comments({ todo, onClose }: CommentsProps) {
  const { comments, loading, addComment, deleteComment } = useRealtimeComments(todo.id);
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      await addComment(content.trim());
      setContent("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
    setSubmitting(false);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Comments
          </h3>
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {todo.title}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Comments list */}
      <div className="max-h-80 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-sm text-gray-400">Loading...</p>
        ) : comments.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500">
            No comments yet
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="group">
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {(comment.profiles?.name || comment.profiles?.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {comment.profiles?.name || comment.profiles?.email}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                      {comment.user_id === user?.id && (
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="ml-auto hidden text-xs text-red-400 hover:text-red-500 group-hover:inline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add comment form */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 p-3 dark:border-gray-700"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:text-white"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
