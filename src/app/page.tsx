"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const features = [
  {
    icon: "✅",
    title: "실시간 협업 투두",
    desc: "워크스페이스에서 팀원과 할 일을 함께 관리하세요. 변경사항이 실시간으로 동기화됩니다.",
  },
  {
    icon: "📅",
    title: "스마트 시간표",
    desc: "수업, 일정, 할 일을 시간표에 자동 배치. 하루를 한눈에 파악하세요.",
  },
  {
    icon: "🔄",
    title: "루틴 트래커",
    desc: "매일의 습관과 루틴을 기록하고 달성률을 추적하세요. 꾸준함이 쌓입니다.",
  },
  {
    icon: "💰",
    title: "가계부",
    desc: "수입과 지출을 카테고리별로 관리하고, 예산 대비 사용 현황을 확인하세요.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/workspace");
    }
  }, [user, loading, router]);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 로딩 중이거나 로그인된 사용자 → 스피너
  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5856D6] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-gray-900 dark:text-white">
      {/* ── Header ── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-gray-200/60 bg-white/72 backdrop-blur-xl dark:border-white/[0.08] dark:bg-gray-900/72"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <span className="text-lg font-bold tracking-tight">KHUDO</span>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              로그인
            </Link>
            <Link
              href="/login?signup=true"
              className="rounded-lg bg-[#5856D6] px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#4b49b8]"
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex min-h-[85vh] flex-col items-center justify-center px-5 pt-14 text-center">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[#5856D6]/20 bg-[#5856D6]/5 px-3 py-1 text-xs font-medium text-[#5856D6]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#5856D6]" />
          대학생을 위한 올인원 생산성 앱
        </div>
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          할 일을 함께,{" "}
          <span className="bg-gradient-to-r from-[#5856D6] to-[#8B5CF6] bg-clip-text text-transparent">
            더 스마트하게
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-gray-500 dark:text-gray-400 sm:text-lg">
          시간표, 루틴, 가계부를 한 곳에서 관리하세요.
          <br className="hidden sm:block" />
          실시간 협업으로 팀 프로젝트도 쉽게.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login?signup=true"
            className="rounded-xl bg-[#5856D6] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5856D6]/25 transition-all hover:bg-[#4b49b8] hover:shadow-[#5856D6]/35"
          >
            무료로 시작하기
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-gray-200 px-7 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            로그인
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            필요한 모든 것을 한 곳에서
          </h2>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            KHUDO가 제공하는 핵심 기능을 확인하세요.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-white/[0.08] dark:bg-white/[0.03]"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-1 text-base font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="mx-auto max-w-5xl px-5 pb-20">
        <div className="rounded-2xl bg-gradient-to-br from-[#5856D6] to-[#7C3AED] p-10 text-center text-white sm:p-14">
          <h2 className="text-2xl font-bold sm:text-3xl">
            지금 바로 시작하세요
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/80 sm:text-base">
            가입은 무료이며, 이메일 또는 Google 계정으로 간편하게 시작할 수 있습니다.
          </p>
          <Link
            href="/login?signup=true"
            className="mt-6 inline-block rounded-xl bg-white px-7 py-3 text-sm font-semibold text-[#5856D6] shadow-lg transition-all hover:bg-gray-50"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200/60 dark:border-white/[0.06]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <span className="text-sm text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} KHUDO. All rights reserved.
          </span>
          <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
            <Link
              href="/privacy"
              className="transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              개인정보처리방침
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              이용약관
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
