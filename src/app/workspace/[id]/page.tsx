"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeTodos } from "@/hooks/useRealtimeTodos";
import type { Workspace, Member } from "@/lib/types";
import Header from "@/components/Header";
import AddTodo from "@/components/AddTodo";
import TodoList from "@/components/TodoList";
import MemberList from "@/components/MemberList";
import InviteModal from "@/components/InviteModal";

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const { todos, loading: todosLoading, addTodo, updateTodo, deleteTodo, reorderTodos } =
    useRealtimeTodos(workspaceId);

  const fetchWorkspace = useCallback(async () => {
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();
    setWorkspace(data);
  }, [workspaceId, supabase]);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from("members")
      .select("*, profiles:user_id(id, email, name, avatar_url)")
      .eq("workspace_id", workspaceId);
    setMembers(data ?? []);
  }, [workspaceId, supabase]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      Promise.all([fetchWorkspace(), fetchMembers()]).then(() =>
        setLoading(false)
      );
    }
  }, [user, authLoading, router, fetchWorkspace, fetchMembers]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Workspace not found
          </h2>
          <Link href="/workspace" className="mt-2 text-sm text-blue-500 hover:text-blue-600">
            Back to workspaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Workspace header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/workspace"
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {workspace.name}
              </h1>
            </div>
            {workspace.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {workspace.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <MemberList
              workspaceId={workspaceId}
              members={members}
              onMembersChange={fetchMembers}
            />
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Invite
            </button>
          </div>
        </div>

        {/* Add todo */}
        <AddTodo onAdd={addTodo} />

        {/* Todo list */}
        {todosLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <TodoList
            todos={todos}
            members={members}
            onUpdate={updateTodo}
            onDelete={deleteTodo}
            onReorder={reorderTodos}
          />
        )}

        {/* Invite modal */}
        {showInvite && workspace.invite_code && (
          <InviteModal
            inviteCode={workspace.invite_code}
            onClose={() => setShowInvite(false)}
          />
        )}
      </main>
    </div>
  );
}
