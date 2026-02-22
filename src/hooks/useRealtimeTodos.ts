"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Todo } from "@/lib/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import { type TemplateId, getTemplateById } from "@/lib/templates";
import { todayKST } from "@/lib/date";

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
  }, [workspaceId]);

  useRealtimeSubscription({
    channelName: `todos:${workspaceId}`,
    table: "todos",
    filter: `workspace_id=eq.${workspaceId}`,
    onChanged: fetchTodos,
  });

  async function addTodo(title: string, description?: string, dueDate?: string, durationDays?: number, goalId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const nextOrder = (todos.length > 0 ? Math.max(...todos.map(t => t.sort_order)) : 0) + 1;
    const finalDueDate = dueDate || todayKST();
    const finalDuration = durationDays || 24;

    const optimisticTodo = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      title,
      description: description || null,
      is_completed: false,
      assigned_to: null,
      created_by: user?.id ?? null,
      due_date: finalDueDate,
      duration_days: finalDuration,
      sort_order: nextOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: null,
      assigned_profile: null,
    } as Todo;

    setTodos((prev) => [optimisticTodo, ...prev]);

    const { error } = await supabase.from("todos").insert({
      workspace_id: workspaceId,
      title,
      description: description || null,
      created_by: user?.id,
      due_date: finalDueDate,
      duration_days: finalDuration,
      sort_order: nextOrder,
      ...(goalId ? { goal_id: goalId } : {}),
    });

    if (error) {
      console.error("[addTodo] Supabase insert error:", JSON.stringify(error, null, 2));
      setTodos((prev) => prev.filter((t) => t.id !== optimisticTodo.id));
      throw error;
    }

    await fetchTodos();
  }

  async function updateTodo(id: string, updates: Partial<Pick<Todo, "title" | "description" | "is_completed" | "assigned_to" | "due_date" | "duration_days" | "sort_order" | "priority" | "status">>) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

    const { error } = await supabase
      .from("todos")
      .update(updates)
      .eq("id", id);
    if (error) {
      await fetchTodos();
      throw error;
    }
  }

  async function addSubtask(parentId: string, title: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const parent = todos.find((t) => t.id === parentId);
    const siblings = todos.filter((t) => t.parent_id === parentId);
    const nextOrder = siblings.length > 0 ? Math.max(...siblings.map((t) => t.sort_order)) + 1 : 0;

    const optimistic = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      title,
      description: null,
      is_completed: false,
      assigned_to: null,
      created_by: user?.id ?? null,
      due_date: parent?.due_date || todayKST(),
      duration_days: 24,
      sort_order: nextOrder,
      parent_id: parentId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: null,
      assigned_profile: null,
    } as Todo;

    setTodos((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("todos").insert({
      workspace_id: workspaceId,
      title,
      created_by: user?.id,
      due_date: parent?.due_date || todayKST(),
      duration_days: 24,
      sort_order: nextOrder,
      parent_id: parentId,
    });

    if (error) {
      setTodos((prev) => prev.filter((t) => t.id !== optimistic.id));
      throw error;
    }

    await fetchTodos();
  }

  async function deleteTodo(id: string) {
    // Also remove subtasks from optimistic state (DB handles cascade)
    setTodos((prev) => prev.filter((t) => t.id !== id && t.parent_id !== id));

    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) {
      await fetchTodos();
      throw error;
    }
  }

  async function reorderTodos(reorderedTodos: Todo[]) {
    const reorderedWithSort = reorderedTodos.map((todo, index) => ({ ...todo, sort_order: index }));
    setTodos(reorderedWithSort);

    const updates = reorderedTodos.map((todo, index) => ({
      id: todo.id,
      sort_order: index,
    }));

    try {
      for (const update of updates) {
        await supabase
          .from("todos")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }
    } catch {
      await fetchTodos();
    }
  }

  async function applyTemplate(templateId: TemplateId) {
    const template = getTemplateById(templateId);
    if (!template) return;

    const startOrder = (todos.length > 0 ? Math.max(...todos.map(t => t.sort_order)) : -1) + 1;
    const { data: { user } } = await supabase.auth.getUser();
    const today = todayKST();

    const todosToInsert = template.items.map((item, index) => ({
      workspace_id: workspaceId,
      title: item.title,
      description: item.isHeader ? SECTION_HEADER_MARKER : null,
      created_by: user?.id,
      due_date: item.isHeader ? null : today,
      duration_days: 24,
      sort_order: startOrder + index,
    }));

    const { error } = await supabase.from("todos").insert(todosToInsert);
    if (error) throw error;
    await fetchTodos();
  }

  return { todos, loading, addTodo, addSubtask, updateTodo, deleteTodo, reorderTodos, applyTemplate };
}
