"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Workspace } from "@/lib/types";

export default function InvitePage() {
  const params = useParams();
  const inviteCode = params.code as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem("pendingInvite", inviteCode);
      router.replace("/login");
      return;
    }

    if (user) {
      fetchWorkspace();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function fetchWorkspace() {
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("invite_code", inviteCode)
      .single();

    if (error || !data) {
      setError("Invalid or expired invite link");
      setLoading(false);
      return;
    }

    setWorkspace(data);

    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("workspace_id", data.id)
      .eq("user_id", user!.id)
      .single();

    if (member) {
      setAlreadyMember(true);
    }

    setLoading(false);
  }

  async function handleJoin() {
    if (!workspace || !user) return;

    setJoining(true);
    try {
      const { error } = await supabase.from("members").insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "member",
      });

      if (error) throw error;
      router.push(`/workspace/${workspace.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join workspace");
      setJoining(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {error ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {error}
            </h2>
            <button
              onClick={() => router.push("/workspace")}
              className="mt-4 text-sm text-blue-500 hover:text-blue-600"
            >
              Go to workspaces
            </button>
          </>
        ) : alreadyMember ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Already a member
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You&apos;re already a member of <strong>{workspace?.name}</strong>
            </p>
            <button
              onClick={() => router.push(`/workspace/${workspace?.id}`)}
              className="mt-4 rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              Go to Workspace
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Join Workspace
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You&apos;ve been invited to join <strong>{workspace?.name}</strong>
            </p>
            {workspace?.description && (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                {workspace.description}
              </p>
            )}
            <button
              onClick={handleJoin}
              disabled={joining}
              className="mt-6 w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join Workspace"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
