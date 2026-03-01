"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotifications, type Notification } from "@/hooks/useNotifications";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "방금";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const weeks = Math.floor(days / 7);
  return `${weeks}주 전`;
}

function typeIcon(type: Notification["type"]): string {
  switch (type) {
    case "mention":
      return "@";
    case "assignment":
      return "\u{1F464}";
    case "reminder":
      return "\u23F0";
    case "comment":
      return "\u{1F4AC}";
    case "invitation":
      return "\u2709\uFE0F";
    default:
      return "\u{1F514}";
  }
}

export default function NotificationBell() {
  const { notifications, loading, unreadCount, markAsRead, markAllRead, acceptInvite, declineInvite } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function handleAccept(n: Notification) {
    if (!n.workspace_id) return;
    const success = await acceptInvite(n.id, n.workspace_id);
    if (success) {
      setOpen(false);
      router.push(`/workspace/${n.workspace_id}`);
    }
  }

  return (
    <div ref={containerRef} className="relative z-[60]">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative rounded-full p-2 transition-colors ${
          open
            ? "bg-black/[0.08] text-foreground dark:bg-white/[0.12] dark:text-white"
            : "text-foreground/60 hover:bg-black/[0.05] hover:text-foreground dark:text-white/60 dark:hover:bg-white/[0.08] dark:hover:text-white"
        }`}
        aria-label="알림"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown: full-screen on mobile, positioned dropdown on desktop */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 top-0 bottom-0 z-[70] flex flex-col bg-white dark:bg-[#1c1c1e] md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-96 md:rounded-2xl md:border md:border-black/[0.08] md:shadow-[0_8px_40px_rgba(0,0,0,0.16)] md:dark:border-white/[0.1] md:dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-secondary hover:bg-black/[0.05] md:hidden dark:hover:bg-white/[0.08]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-[14px] font-semibold text-foreground dark:text-white">
                알림
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-[12px] font-medium text-[#007AFF] hover:text-[#0056b3]"
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto md:max-h-96">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mb-2 text-2xl opacity-40">🔔</div>
                <p className="text-[13px] text-secondary">알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((n) => {
                // Invitation with pending status — show accept/decline
                if (n.type === "invitation" && n.status === "pending") {
                  return (
                    <div
                      key={n.id}
                      className="flex w-full items-start gap-3 border-l-[3px] border-l-[#007AFF] bg-[#007AFF]/[0.04] px-4 py-3"
                    >
                      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-[13px] dark:bg-white/[0.1]">
                        {typeIcon(n.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-tight text-foreground dark:text-[#e5e5e7]">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 text-[12px] leading-snug text-secondary">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-secondary/70">
                          {timeAgo(n.created_at)}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleAccept(n)}
                            className="rounded-lg bg-[#007AFF] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#0056b3]"
                          >
                            수락
                          </button>
                          <button
                            onClick={() => declineInvite(n.id)}
                            className="rounded-lg bg-black/[0.05] px-3 py-1 text-[12px] font-medium text-secondary hover:bg-black/[0.1] dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Invitation already accepted or declined — show status label
                if (n.type === "invitation" && (n.status === "accepted" || n.status === "declined")) {
                  return (
                    <div
                      key={n.id}
                      className="flex w-full items-start gap-3 border-l-[3px] border-l-transparent px-4 py-3"
                    >
                      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-[13px] dark:bg-white/[0.1]">
                        {typeIcon(n.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-tight text-foreground dark:text-[#e5e5e7]">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 truncate text-[12px] text-secondary">
                            {n.body}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-[11px] text-secondary/70">
                            {timeAgo(n.created_at)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              n.status === "accepted"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {n.status === "accepted" ? "수락됨" : "거절됨"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Regular notifications (mention, assignment, reminder, comment)
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${
                      !n.is_read
                        ? "border-l-[3px] border-l-[#007AFF] bg-[#007AFF]/[0.04]"
                        : "border-l-[3px] border-l-transparent"
                    }`}
                  >
                    {/* Icon */}
                    <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-[13px] dark:bg-white/[0.1]">
                      {typeIcon(n.type)}
                    </span>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-tight text-foreground dark:text-[#e5e5e7]">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 truncate text-[12px] text-secondary">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-secondary/70">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {/* Unread dot */}
                    {!n.is_read && (
                      <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#007AFF]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
