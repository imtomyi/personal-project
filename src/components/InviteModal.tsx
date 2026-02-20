"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type InviteModalProps = {
  workspaceId: string;
  workspaceName: string;
  inviteCode: string;
  onClose: () => void;
};

export default function InviteModal({ workspaceId, workspaceName, inviteCode, onClose }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showLinkFallback, setShowLinkFallback] = useState(false);
  const [copied, setCopied] = useState(false);

  const { user, profile } = useAuth();
  const supabase = createClient();

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${inviteCode}`
      : "";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !user) return;
    setSending(true);
    setError("");
    setSuccess("");

    try {
      // 1. Look up user by email
      const { data: targetProfile, error: lookupError } = await supabase
        .from("profiles")
        .select("id, email, name")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (lookupError || !targetProfile) {
        setError("해당 이메일의 사용자를 찾을 수 없습니다");
        setSending(false);
        return;
      }

      // 2. Prevent self-invite
      if (targetProfile.id === user.id) {
        setError("자기 자신은 초대할 수 없습니다");
        setSending(false);
        return;
      }

      // 3. Check if already a member
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetProfile.id)
        .single();

      if (existingMember) {
        setError("이미 워크스페이스의 멤버입니다");
        setSending(false);
        return;
      }

      // 4. Check for existing pending invitation
      const { data: existingInvite } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", targetProfile.id)
        .eq("workspace_id", workspaceId)
        .eq("type", "invitation")
        .eq("status", "pending")
        .single();

      if (existingInvite) {
        setError("이미 초대를 보냈습니다");
        setSending(false);
        return;
      }

      // 5. Create invitation notification
      const { error: insertError } = await supabase.from("notifications").insert({
        user_id: targetProfile.id,
        type: "invitation",
        title: "워크스페이스 초대",
        body: `${profile?.name || user.email}님이 "${workspaceName}" 워크스페이스에 초대했습니다`,
        workspace_id: workspaceId,
        created_by: user.id,
        status: "pending",
        is_read: false,
      });

      if (insertError) {
        setError("초대 전송에 실패했습니다");
        setSending(false);
        return;
      }

      setSuccess(`${targetProfile.name || targetProfile.email}님에게 초대를 보냈습니다`);
      setEmail("");
    } catch {
      setError("오류가 발생했습니다");
    }
    setSending(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          멤버 초대
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          이메일 주소로 멤버를 초대하세요
        </p>

        {/* Email invite form */}
        <form onSubmit={handleInvite} className="mt-4">
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setSuccess("");
              }}
              placeholder="이메일 주소 입력"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={!email.trim() || sending}
              className="rounded-lg bg-[#007AFF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0056b3] disabled:opacity-40"
            >
              {sending ? "전송 중..." : "초대"}
            </button>
          </div>
        </form>

        {/* Error message */}
        {error && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>
        )}

        {/* Success message */}
        {success && (
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
        )}

        {/* Divider */}
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-[11px] text-gray-400">또는</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Link fallback */}
        {!showLinkFallback ? (
          <button
            onClick={() => setShowLinkFallback(true)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            링크로 초대하기
          </button>
        ) : (
          <div>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              이 링크를 공유하면 누구나 워크스페이스에 참여할 수 있습니다
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
              />
              <button
                onClick={handleCopy}
                className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                {copied ? "복사됨!" : "복사"}
              </button>
            </div>
          </div>
        )}

        {/* Close */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
