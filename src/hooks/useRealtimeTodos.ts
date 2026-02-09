"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Todo } from "@/lib/types";

export function useRealtimeTodos(workspaceId: string) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTodos = useCallback(async () => {
    const { data } = await supabase
      .from("todos")
      .select("*, profiles:created_by(id, email, name, avatar_url), assigned_profile:assigned_to(id, email, name, avatar_url)")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setTodos(data ?? []);
    setLoading(false);
  }, [workspaceId, supabase]);

  useEffect(() => {
    fetchTodos();

    const channel = supabase
      .channel(`todos:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todos",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          // Refetch all todos on any change for simplicity & consistency
          fetchTodos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, fetchTodos, supabase]);

  async function addTodo(title: string, description?: string) {
    const { data: maxOrder } = await supabase
      .from("todos")
      .select("sort_order")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrder?.sort_order ?? 0) + 1;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("todos").insert({
      workspace_id: workspaceId,
      title,
      description: description || null,
      created_by: user?.id,
      sort_order: nextOrder,
    });

    if (error) throw error;
  }

  async function updateTodo(id: string, updates: Partial<Pick<Todo, "title" | "description" | "is_completed" | "assigned_to" | "sort_order">>) {
    const { error } = await supabase
      .from("todos")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
  }

  async function deleteTodo(id: string) {
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) throw error;
  }

  async function reorderTodos(reorderedTodos: Todo[]) {
    const updates = reorderedTodos.map((todo, index) => ({
      id: todo.id,
      workspace_id: todo.workspace_id,
      title: todo.title,
      sort_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from("todos")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);
    }
  }

  return { todos, loading, addTodo, updateTodo, deleteTodo, reorderTodos };
}
