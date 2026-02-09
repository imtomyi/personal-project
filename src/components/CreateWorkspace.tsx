"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type CreateWorkspaceProps = {
  onCreated: () => void;
};

export default function CreateWorkspace({ onCreated }: CreateWorkspaceProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);
    try {
      // Create workspace
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (wsError) throw wsError;

      // Add creator as owner
      const { error: memberError } = await supabase.from("members").insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
      });

      if (memberError) throw memberError;

      setName("");
      setDescription("");
      setIsOpen(false);
      onCreated();
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
    setLoading(false);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white/50 p-6 text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Workspace
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Create Workspace
      </h3>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workspace name"
          className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:text-white"
          autoFocus
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full resize-none rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:text-gray-300"
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}
