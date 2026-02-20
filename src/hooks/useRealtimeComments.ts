"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import type { Comment } from "@/lib/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

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
  }, [todoId]);

  useEffect(() => {
    if (!todoId) setComments([]);
  }, [todoId]);

  useRealtimeSubscription({
    channelName: `comments:${todoId}`,
    table: "comments",
    filter: `todo_id=eq.${todoId}`,
    onChanged: fetchComments,
    skip: !todoId,
  });

  async function addComment(content: string) {
    if (!todoId) return;
    const { data: { user } } = await supabase.auth.getUser();

    // 낙관적 업데이트: UI에 먼저 표시
    const optimisticComment = {
      id: crypto.randomUUID(),
      todo_id: todoId,
      user_id: user?.id ?? "",
      content,
      created_at: new Date().toISOString(),
      profiles: {
        id: user?.id ?? "",
        email: user?.email ?? "",
        name: user?.user_metadata?.full_name || user?.email || "",
        avatar_url: user?.user_metadata?.avatar_url || null,
      },
    } as Comment;

    setComments((prev) => [...prev, optimisticComment]);

    const { error } = await supabase.from("comments").insert({
      todo_id: todoId,
      user_id: user?.id,
      content,
    });

    if (error) {
      // 실패 시 복구
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      throw error;
    }

    // DB에서 실제 데이터로 동기화
    await fetchComments();
  }

  async function deleteComment(commentId: string) {
    // 낙관적 업데이트: UI에서 먼저 제거
    setComments((prev) => prev.filter((c) => c.id !== commentId));

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      await fetchComments();
      throw error;
    }
  }

  return { comments, loading, addComment, deleteComment };
}
