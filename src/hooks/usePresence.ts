"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type PresenceUser = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  online_at: string;
};

type PresenceData = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  online_at: string;
};

export function usePresence(workspaceId: string) {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!user || !workspaceId) return;

    const channel = supabase.channel(`presence:${workspaceId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        for (const [, presences] of Object.entries(state)) {
          for (const p of presences as PresenceData[]) {
            users.push({
              user_id: p.user_id,
              name: p.name,
              avatar_url: p.avatar_url,
              online_at: p.online_at,
            });
          }
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            name: profile?.name || profile?.email || "Anonymous",
            avatar_url: profile?.avatar_url || null,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile, workspaceId, supabase]);

  return onlineUsers;
}
