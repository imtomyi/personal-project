"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export type Notification = {
  id: string;
  user_id: string;
  type: "mention" | "assignment" | "reminder" | "comment" | "invitation";
  title: string;
  body: string | null;
  is_read: boolean;
  reference_id: string | null;
  workspace_id: string | null;
  status: string | null; // 'pending' | 'accepted' | 'declined' | null
  created_by: string | null;
  created_at: string;
};

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications(data ?? []);
    setLoading(false);
  }, [user, supabase]);

  useRealtimeSubscription({
    channelName: user ? `notifications:${user.id}` : "notifications:noop",
    table: "notifications",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChanged: fetchNotifications,
    skip: !user,
  });

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }, [supabase]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  }, [user, supabase]);

  const acceptInvite = useCallback(async (notificationId: string, workspaceId: string) => {
    if (!user) return false;
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true, status: "accepted" } : n)
    );
    // Insert as member
    const { error: memberError } = await supabase.from("members").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      role: "member",
    });
    // Update notification status
    await supabase
      .from("notifications")
      .update({ is_read: true, status: "accepted" })
      .eq("id", notificationId);
    return !memberError;
  }, [user, supabase]);

  const declineInvite = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true, status: "declined" } : n)
    );
    await supabase
      .from("notifications")
      .update({ is_read: true, status: "declined" })
      .eq("id", notificationId);
  }, [supabase]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return { notifications, loading, unreadCount, markAsRead, markAllRead, acceptInvite, declineInvite };
}
