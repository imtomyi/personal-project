"use client";

/**
 * 로고 데모 페이지 — 사자 PNG 이미지 + KHUDO 텍스트 조합
 */

/* ── Option A: 사자 + KHU(검정) DO(퍼플) ── */
function LogoA({ size = 32 }: { size?: number }) {
  const fontSize = size * 0.6;
  return (
    <span className="inline-flex items-center gap-1.5">
      <img src="/lion-logo.png" alt="" width={size} height={size} className="object-contain" />
      <span style={{ fontSize }} className="font-extrabold tracking-tight text-gray-900 dark:text-white">
        KHU<span className="text-[#5856D6]">DO</span>
      </span>
    </span>
  );
}

/* ── Option B: 사자 + KHU(레드) DO(퍼플) ── */
function LogoB({ size = 32 }: { size?: number }) {
  const fontSize = size * 0.6;
  return (
    <span className="inline-flex items-center gap-1.5">
      <img src="/lion-logo.png" alt="" width={size} height={size} className="object-contain" />
      <span style={{ fontSize }} className="font-extrabold tracking-tight">
        <span className="text-[#C41230]">KHU</span>
        <span className="text-[#5856D6]">DO</span>
      </span>
    </span>
  );
}

/* ── Option C: 사자 + KHUDO(전체 검정) ── */
function LogoC({ size = 32 }: { size?: number }) {
  const fontSize = size * 0.6;
  return (
    <span className="inline-flex items-center gap-1.5">
      <img src="/lion-logo.png" alt="" width={size} height={size} className="object-contain" />
      <span style={{ fontSize }} className="font-extrabold tracking-tight text-gray-900 dark:text-white">
        KHUDO
      </span>
    </span>
  );
}

/* ── Option D: 사자 + KHUDO(퍼플) ── */
function LogoD({ size = 32 }: { size?: number }) {
  const fontSize = size * 0.6;
  return (
    <span className="inline-flex items-center gap-1.5">
      <img src="/lion-logo.png" alt="" width={size} height={size} className="object-contain" />
      <span style={{ fontSize }} className="font-extrabold tracking-tight text-[#5856D6]">
        KHUDO
      </span>
    </span>
  );
}

function DemoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {children}
      </div>
    </div>
  );
}

export default function LogoDemoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-14 bg-gray-50 px-8 py-14 dark:bg-gray-900">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">로고 디자인 후보 (사자 이미지 + KHUDO)</h1>

      {/* A */}
      <div className="flex flex-col items-center gap-5">
        <h2 className="text-base font-semibold text-gray-500">A. KHU=검정 DO=퍼플</h2>
        <p className="text-xs text-gray-400">KHU 검정, DO만 브랜드 퍼플 강조</p>
        <div className="flex items-end gap-8">
          <DemoCard label="헤더"><LogoA size={26} /></DemoCard>
          <DemoCard label="로그인"><LogoA size={48} /></DemoCard>
        </div>
      </div>

      {/* B */}
      <div className="flex flex-col items-center gap-5">
        <h2 className="text-base font-semibold text-gray-500">B. KHU=레드 DO=퍼플 투톤</h2>
        <p className="text-xs text-gray-400">사자와 같은 레드 + 브랜드 퍼플 매칭</p>
        <div className="flex items-end gap-8">
          <DemoCard label="헤더"><LogoB size={26} /></DemoCard>
          <DemoCard label="로그인"><LogoB size={48} /></DemoCard>
        </div>
      </div>

      {/* C */}
      <div className="flex flex-col items-center gap-5">
        <h2 className="text-base font-semibold text-gray-500">C. KHUDO 전체 검정</h2>
        <p className="text-xs text-gray-400">깔끔한 단색 텍스트, 사자가 컬러 포인트</p>
        <div className="flex items-end gap-8">
          <DemoCard label="헤더"><LogoC size={26} /></DemoCard>
          <DemoCard label="로그인"><LogoC size={48} /></DemoCard>
        </div>
      </div>

      {/* D */}
      <div className="flex flex-col items-center gap-5">
        <h2 className="text-base font-semibold text-gray-500">D. KHUDO 전체 퍼플</h2>
        <p className="text-xs text-gray-400">텍스트도 브랜드 퍼플로 통일</p>
        <div className="flex items-end gap-8">
          <DemoCard label="헤더"><LogoD size={26} /></DemoCard>
          <DemoCard label="로그인"><LogoD size={48} /></DemoCard>
        </div>
      </div>
    </div>
  );
}
