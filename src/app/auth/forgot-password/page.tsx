"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Logo from "@/components/layout/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSent(true);
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
          {sent ? (
            <div className="text-center">
              <div className="mb-4 text-4xl">📧</div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                이메일을 확인해 주세요
              </h2>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                <strong className="text-gray-700 dark:text-gray-200">{email}</strong>
                로 비밀번호 재설정 링크를 보냈습니다.
                <br />
                이메일이 도착하지 않으면 스팸 폴더를 확인해 주세요.
              </p>
              <Link
                href="/login"
                className="inline-block rounded-lg bg-[#5856D6] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#4b49b8]"
              >
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                비밀번호 찾기
              </h2>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                가입한 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#5856D6] dark:border-gray-600 dark:text-white"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#5856D6] py-2.5 text-sm font-medium text-white hover:bg-[#4b49b8] disabled:opacity-50"
                >
                  {loading ? "전송 중..." : "재설정 링크 보내기"}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                <Link href="/login" className="font-medium text-[#5856D6] hover:text-[#4b49b8]">
                  로그인으로 돌아가기
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
