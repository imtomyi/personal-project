"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Member } from "@/lib/types";

type MemberListProps = {
  workspaceId: string;
  members: Member[];
  onMembersChange: () => void;
};

export default function MemberList({
  workspaceId,
  members,
  onMembersChange,
}: MemberListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  const currentUserRole = members.find((m) => m.user_id === user?.id)?.role;
  const canManage = currentUserRole === "owner" || currentUserRole === "admin";

  async function handleRemoveMember(memberId: string) {
    // 낙관적 업데이트: UI에서 먼저 제거
    onMembersChange();

    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", memberId);
    if (error) {
      onMembersChange();
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        {members.length} members
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Members ({members.length})
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between rounded-lg p-2"
          >
            <div className="flex items-center gap-2">
              {member.profiles?.avatar_url ? (
                <img
                  src={member.profiles.avatar_url}
                  alt=""
                  className="h-7 w-7 rounded-full"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                  {(member.profiles?.name || member.profiles?.email || "?")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {member.profiles?.name || member.profiles?.email}
                </p>
                <p className="text-xs text-gray-400">{member.role}</p>
              </div>
            </div>
            {canManage &&
              member.user_id !== user?.id &&
              member.role !== "owner" && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Remove
                </button>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
