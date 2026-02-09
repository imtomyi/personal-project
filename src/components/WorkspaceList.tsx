"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Workspace } from "@/lib/types";
import CreateWorkspace from "./CreateWorkspace";

export default function WorkspaceList() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  async function fetchWorkspaces() {
    if (!user) return;
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false });
    setWorkspaces(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((ws) => (
          <Link
            key={ws.id}
            href={`/workspace/${ws.id}`}
            className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
          >
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              {ws.name}
            </h3>
            {ws.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {ws.description}
              </p>
            )}
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              Created {new Date(ws.created_at).toLocaleDateString()}
            </p>
          </Link>
        ))}

        <CreateWorkspace onCreated={fetchWorkspaces} />
      </div>

      {workspaces.length === 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Create your first workspace to get started!
        </p>
      )}
    </div>
  );
}
