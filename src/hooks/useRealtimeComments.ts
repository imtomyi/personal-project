"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Comment } from "@/lib/types";

export function useRealtimeComments(todoId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchComments = useCallback(async () => {
    if (!todoId) return;
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("*, profiles:user_id(id, email, name, avatar_url)")
      .eq("todo_id", todoId)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
    setLoading(false);
  }, [todoId, supabase]);

  useEffect(() => {
    if (!todoId) {
      setComments([]);
      return;
    }

    fetchComments();

    const channel = supabase
      .channel(`comments:${todoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `todo_id=eq.${todoId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [todoId, fetchComments, supabase]);

  async function addComment(content: string) {
    if (!todoId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("comments").insert({
      todo_id: todoId,
      user_id: user?.id,
      content,
    });
    if (error) throw error;
  }

  async function deleteComment(commentId: string) {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    if (error) throw error;
  }

  return { comments, loading, addComment, deleteComment };
}
