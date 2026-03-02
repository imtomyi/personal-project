"use client";

/**
 * 사자 머리 실루엣 SVG (제공된 일러스트 참고)
 * - 옆모습 사자 머리 + 갈기가 흘러내리는 형태
 * - 단색 실루엣 스타일
 */
function LionHead({ size = 40, color = "#C41230" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 갈기 (뒤쪽 흐르는 형태) */}
      <path
        d="M38 6c-3 0-5 2-7 4-2.5 2.5-5 3-8 2.5-2-.3-3.5.5-4.5 2S17 18 17 20c0 2.5-1 4-3 5.5s-3 4-2.5 6.5c.3 1.5 0 3-.8 4.2-1.5 2-1.8 4-.5 6 .8 1.2.5 2.5-.2 3.8-1 2-.5 4 1.2 5.5 2 1.8 4.5 2.5 7 2.5 1.5 0 3-.2 4.2-.8 2-1 3.5-.5 5 .8 1 .8 2.2 1 3.5.8 2-.5 3.2-2 3.8-4 .5-1.5 1.5-2.5 3-3 2-.8 3.2-2.5 3.5-4.5.2-1.5.8-2.8 2-3.8 1.5-1.5 2-3.5 1.5-5.5-.3-1.2 0-2.5.8-3.5 1.5-2 1.5-4 0-6-.8-1-1-2.2-.8-3.5.3-2-.5-3.8-2.2-5-1.2-1-2-2.2-2-3.8 0-2.5-1-4.5-3-5.8C43 8 40.5 6 38 6z"
        fill={color}
      />
      {/* 얼굴 (밝은 영역) */}
      <path
        d="M26 22c-1.5 1-2.5 2.5-2.8 4.5-.3 2 .2 4 1.5 5.5 1 1.2 2.5 2 4 2.2 1 .2 2-.2 2.8-.8.5-.5 1.2-.5 1.8-.2 1 .5 2 .5 3-.2.8-.5 1.2-1.2 1.5-2.2.5-1.5.2-3-.5-4.5-.8-1.5-2-2.5-3.5-3-1.5-.5-3-.2-4.2.5-.8.5-1.5.5-2.2 0-.5-.5-.8-1-1-1.5z"
        fill="white"
        opacity="0.15"
      />
      {/* 눈 */}
      <circle cx="29" cy="27" r="1.8" fill="white" />
      <circle cx="29" cy="27" r="1" fill={color} />
      {/* 코 */}
      <ellipse cx="23.5" cy="30.5" rx="1.5" ry="1.2" fill="white" opacity="0.6" />
    </svg>
  );
}

/* ── Option A: 사자 아이콘 + KHUDO 가로 ── */
function LogoA({ size = 32 }: { size?: number }) {
  const fontSize = size * 0.55;
  return (
    <span className="inline-flex items-center gap-1">
      <LionHead size={size} color="#C41230" />
      <span style={{ fontSize }} className="font-extrabold tracking-tight text-gray-900 dark:text-white">
        KHU<span className="text-[#5856D6]">DO</span>
      </span>
    </span>
  );
}

/* ── Option B: 퍼플 라운드 배경 + 사자 ── */
function LogoB({ size = 32 }: { size?: number }) {
  const fontSize = size * 0.55;
  const iconOuter = size * 1.1;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="flex items-center justify-center rounded-xl bg-[#5856D6]"
        style={{ width: iconOuter, height: iconOuter }}
      >
        <LionHead size={size * 0.8} color="white" />
      </span>
      <span style={{ fontSize }} className="font-extrabold tracking-tight text-gray-900 dark:text-white">
        KHU<span className="text-[#5856D6]">DO</span>
      </span>
    </span>
  );
}

/* ── Option C: 원형 배경 + 사자 ── */
function LogoC({ size = 32 }: { size?: number }) {
  const fontSize = size * 0.55;
  const iconOuter = size * 1.1;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="flex items-center justify-center rounded-full bg-gradient-to-br from-[#C41230] to-[#5856D6]"
        style={{ width: iconOuter, height: iconOuter }}
      >
        <LionHead size={size * 0.78} color="white" />
      </span>
      <span style={{ fontSize }} className="font-extrabold tracking-tight text-gray-900 dark:text-white">
        KHUDO
      </span>
    </span>
  );
}

/* ── Option D: 레드 사자 + 미니멀 텍스트 ── */
function LogoD({ size = 32 }: { size?: number }) {
  const fontSize = size * 0.55;
  return (
    <span className="inline-flex items-center gap-0.5">
      <LionHead size={size} color="#C41230" />
      <span style={{ fontSize }} className="font-black tracking-tighter">
        <span className="text-[#C41230]">KHU</span>
        <span className="text-[#5856D6]">DO</span>
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">로고 디자인 후보 (사자 일러스트)</h1>

      {/* A */}
      <div className="flex flex-col items-center gap-5">
        <h2 className="text-base font-semibold text-gray-500">A. 레드 사자 실루엣 + KHUDO</h2>
        <p className="text-xs text-gray-400">사자를 그대로, KHU=검정 DO=퍼플</p>
        <div className="flex items-end gap-8">
          <DemoCard label="헤더"><LogoA size={26} /></DemoCard>
          <DemoCard label="로그인"><LogoA size={48} /></DemoCard>
        </div>
      </div>

      {/* B */}
      <div className="flex flex-col items-center gap-5">
        <h2 className="text-base font-semibold text-gray-500">B. 퍼플 박스 안 흰 사자</h2>
        <p className="text-xs text-gray-400">앱 아이콘 느낌, 라운드 사각형 배경</p>
        <div className="flex items-end gap-8">
          <DemoCard label="헤더"><LogoB size={26} /></DemoCard>
          <DemoCard label="로그인"><LogoB size={48} /></DemoCard>
        </div>
      </div>

      {/* C */}
      <div className="flex flex-col items-center gap-5">
        <h2 className="text-base font-semibold text-gray-500">C. 레드→퍼플 그라데이션 원형</h2>
        <p className="text-xs text-gray-400">원형 배지 안 흰 사자, 그라데이션</p>
        <div className="flex items-end gap-8">
          <DemoCard label="헤더"><LogoC size={26} /></DemoCard>
          <DemoCard label="로그인"><LogoC size={48} /></DemoCard>
        </div>
      </div>

      {/* D */}
      <div className="flex flex-col items-center gap-5">
        <h2 className="text-base font-semibold text-gray-500">D. KHU=레드 DO=퍼플 투톤</h2>
        <p className="text-xs text-gray-400">사자와 텍스트 모두 컬러 매칭</p>
        <div className="flex items-end gap-8">
          <DemoCard label="헤더"><LogoD size={26} /></DemoCard>
          <DemoCard label="로그인"><LogoD size={48} /></DemoCard>
        </div>
      </div>
    </div>
  );
}
