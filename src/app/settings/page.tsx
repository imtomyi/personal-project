"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import Header from "@/components/layout/Header";
import AppInstallSection from "@/components/settings/AppInstallSection";
import NotificationSection from "@/components/settings/NotificationSection";

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const supabase = createClient();

  // Profile edit state
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim() || null, avatar_url: avatarUrl })
        .eq("id", user.id);

      if (error) throw error;
      showToast("프로필이 저장되었습니다.", "success");
      // Force profile refresh by re-triggering auth state
      window.dispatchEvent(new Event("profile-updated"));
    } catch {
      showToast("프로필 저장에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  }, [user, name, avatarUrl, supabase, showToast]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      showToast("이미지 파일만 업로드 가능합니다.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("파일 크기는 2MB 이하여야 합니다.", "error");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      showToast("아바타가 업로드되었습니다.", "success");
    } catch {
      showToast("아바타 업로드에 실패했습니다.", "error");
    } finally {
      setUploading(false);
    }
  }, [user, supabase, showToast]);

  const handleChangePassword = useCallback(async () => {
    if (newPassword.length < 6) {
      showToast("비밀번호는 6자 이상이어야 합니다.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("비밀번호가 일치하지 않습니다.", "error");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast("비밀번호가 변경되었습니다.", "success");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      showToast("비밀번호 변경에 실패했습니다.", "error");
    } finally {
      setChangingPassword(false);
    }
  }, [newPassword, confirmPassword, supabase, showToast]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace("/login");
  }, [signOut, router]);

  const isGoogleUser = user?.app_metadata?.provider === "google";
  const hasChanges = profile && (
    name !== (profile.name || "") ||
    avatarUrl !== profile.avatar_url
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] via-[var(--background)] to-[var(--background)]">
      <Header />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">설정</h1>

        {/* Profile Section */}
        <section className="mb-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            프로필
          </h2>

          {/* Avatar */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xl font-bold text-white ring-2 ring-gray-100 dark:ring-gray-700">
                  {(name || profile?.email || "?")[0].toUpperCase()}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {uploading ? "업로드 중..." : "사진 변경"}
              </button>
              {avatarUrl && (
                <button
                  onClick={() => setAvatarUrl(null)}
                  className="ml-2 text-xs text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                >
                  삭제
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-500"
            />
          </div>

          {/* Email (read-only) */}
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              이메일
            </label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400"
            />
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              이메일은 변경할 수 없습니다.
            </p>
          </div>

          {/* Save button */}
          <button
            onClick={handleSaveProfile}
            disabled={saving || !hasChanges}
            className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "저장 중..." : "변경사항 저장"}
          </button>
        </section>

        {/* Appearance Section */}
        <section className="mb-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            외관
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">테마</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                라이트 모드와 다크 모드를 전환합니다.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800">
              <button
                onClick={() => { if (theme === "dark") toggleTheme(); }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  theme === "light"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                라이트
              </button>
              <button
                onClick={() => { if (theme === "light") toggleTheme(); }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  theme === "dark"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                다크
              </button>
            </div>
          </div>
        </section>

        {/* App Install Section */}
        <AppInstallSection />

        {/* Notification Section */}
        <NotificationSection />

        {/* Security Section */}
        {!isGoogleUser && (
          <section className="mb-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              보안
            </h2>

            <div>
              <p className="mb-3 text-sm font-medium text-gray-900 dark:text-white">비밀번호 변경</p>
              <div className="space-y-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 (6자 이상)"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-500"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 확인"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-500"
                />
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {changingPassword ? "변경 중..." : "비밀번호 변경"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Account Info Section */}
        <section className="mb-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            계정
          </h2>

          {/* Login method */}
          <div className="mb-5 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">로그인 방법</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {isGoogleUser ? "Google 계정" : "이메일/비밀번호"}
              </p>
            </div>
            {isGoogleUser && (
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
          </div>

          {/* Account created */}
          <div className="mb-5 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">가입일</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"}
              </p>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            로그아웃
          </button>
        </section>

        {/* Danger Zone */}
        <section className="rounded-2xl border border-red-200/60 bg-white p-6 shadow-sm dark:border-red-900/30 dark:bg-white/[0.03]">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-red-500 dark:text-red-400">
            위험 영역
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">계정 삭제</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              계정 삭제
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">
              <p className="mb-3 text-xs text-red-600 dark:text-red-400">
                정말 계정을 삭제하시겠습니까? 확인을 위해 &quot;삭제&quot;를 입력해 주세요.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder='삭제'
                  className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 dark:border-red-800 dark:bg-gray-800 dark:text-white"
                />
                <button
                  disabled={deleteText !== "삭제"}
                  onClick={() => {
                    showToast("계정 삭제 기능은 관리자에게 문의해 주세요.", "info");
                  }}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  삭제 확인
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Bottom spacing */}
        <div className="h-12" />
      </main>
    </div>
  );
}
