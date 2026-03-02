"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Logo from "@/components/layout/Logo";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // 이미 세션이 있는 경우 바로 ready 상태로
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.replace("/workspace"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Logo size="xl" className="justify-center" />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {success ? (
            <div className="text-center">
              <div className="mb-4 text-4xl">✅</div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                비밀번호가 변경되었습니다
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                잠시 후 워크스페이스로 이동합니다...
              </p>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center py-8">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#5856D6] border-t-transparent" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                인증 확인 중...
              </p>
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                새 비밀번호 설정
              </h2>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                새로운 비밀번호를 입력해 주세요.
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6자 이상"
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#5856D6] dark:border-gray-600 dark:text-white"
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    비밀번호 확인
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호를 다시 입력하세요"
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#5856D6] dark:border-gray-600 dark:text-white"
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#5856D6] py-2.5 text-sm font-medium text-white hover:bg-[#4b49b8] disabled:opacity-50"
                >
                  {loading ? "변경 중..." : "비밀번호 변경"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
