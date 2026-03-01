"use client";

import { useState } from "react";
import { usePresence } from "@/hooks/usePresence";

type OnlineUsersProps = {
  workspaceId: string;
};

const AVATAR_GRADIENTS = [
  "from-blue-400 to-blue-600",
  "from-purple-400 to-purple-600",
  "from-pink-400 to-pink-600",
  "from-emerald-400 to-emerald-600",
  "from-orange-400 to-orange-600",
  "from-cyan-400 to-cyan-600",
  "from-rose-400 to-rose-600",
  "from-indigo-400 to-indigo-600",
];

function getGradient(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export default function OnlineUsers({ workspaceId }: OnlineUsersProps) {
  const onlineUsers = usePresence(workspaceId);
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  const MAX_VISIBLE = 4;
  const visibleUsers = onlineUsers.slice(0, MAX_VISIBLE);
  const extraCount = onlineUsers.length - MAX_VISIBLE;

  if (onlineUsers.length <= 1) {
    return (
      <span className="text-[11px] text-secondary">
        나만 접속 중
      </span>
    );
  }

  return (
    <div className="flex items-center">
      <div className="flex items-center -space-x-2">
        {visibleUsers.map((u) => (
          <div
            key={u.user_id}
            className="relative"
            onMouseEnter={() => setHoveredUserId(u.user_id)}
            onMouseLeave={() => setHoveredUserId(null)}
          >
            {/* Avatar circle */}
            <div className="relative h-7 w-7 flex-shrink-0 rounded-full border-2 border-white dark:border-gray-900">
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  alt={u.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${getGradient(u.user_id)} text-[10px] font-semibold text-white`}
                >
                  {(u.name || "?")[0].toUpperCase()}
                </div>
              )}

              {/* Green online dot */}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-white bg-emerald-500 dark:border-gray-900" />
            </div>

            {/* Tooltip */}
            {hoveredUserId === u.user_id && (
              <div className="absolute -bottom-9 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white shadow-lg dark:bg-gray-700">
                {u.name} <span className="text-emerald-400">온라인</span>
                <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900 dark:bg-gray-700" />
              </div>
            )}
          </div>
        ))}

        {/* +N indicator */}
        {extraCount > 0 && (
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[10px] font-semibold text-gray-600 dark:border-gray-900 dark:bg-gray-700 dark:text-gray-300">
            +{extraCount}
          </div>
        )}
      </div>
    </div>
  );
}
