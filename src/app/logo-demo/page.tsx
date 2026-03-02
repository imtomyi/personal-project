"use client";

/* ── Option A: 미니멀 사자 얼굴 ── */
function LogoA({ size = 32 }: { size?: number }) {
  const iconSize = size;
  const fontSize = size * 0.6;
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40" fill="none">
        {/* 배경 라운드 사각형 */}
        <rect width="40" height="40" rx="10" fill="#5856D6" />
        {/* 갈기 (외곽 물결) */}
        <path d="M20 4c-2 0-3.5 1.5-4.5 2.5S13 8 11 8 7.5 6.5 6 8s.5 4 .5 6-.5 4 1 5.5 4 .5 6 .5 4-.5 5.5 1 .5 4 .5 6 -.5 4 1 5.5 4 .5 6 .5 4-.5 5.5-1 .5-4 .5-6-.5-4-1-5.5-4-.5-6-.5-4 .5-5.5-1-.5-4-.5-6 .5-4-1-5.5-4-.5-4.5-2.5" fill="#7B6FE0" opacity="0.4" />
        {/* 얼굴 원 */}
        <circle cx="20" cy="21" r="11" fill="#F5F0FF" />
        {/* 눈 - 웃는 ^ 모양 */}
        <path d="M14 19c.5-1.5 1.5-2 2.5-2s2 .5 2.5 2" stroke="#5856D6" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M21 19c.5-1.5 1.5-2 2.5-2s2 .5 2.5 2" stroke="#5856D6" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* 코 */}
        <ellipse cx="20" cy="23" rx="1.2" ry="0.9" fill="#C41230" />
        {/* 입 - 미소 */}
        <path d="M17 25.5c1 1.5 2.2 2 3 2s2-.5 3-2" stroke="#5856D6" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </svg>
      <span style={{ fontSize }} className="font-extrabold tracking-tight text-gray-900 dark:text-white">
        HUDO
      </span>
    </span>
  );
}

/* ── Option B: 사자 갈기 K ── */
function LogoB({ size = 32 }: { size?: number }) {
  const iconSize = size;
  const fontSize = size * 0.6;
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40" fill="none">
        {/* 배경 원 */}
        <circle cx="20" cy="20" r="20" fill="#5856D6" />
        {/* 갈기 - 방사형 선 */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 20 + Math.cos(rad) * 13;
          const y1 = 20 + Math.sin(rad) * 13;
          const x2 = 20 + Math.cos(rad) * 18;
          const y2 = 20 + Math.sin(rad) * 18;
          return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C41230" strokeWidth="2.5" strokeLinecap="round" />;
        })}
        {/* 내부 원 */}
        <circle cx="20" cy="20" r="12" fill="#4A48C4" />
        {/* K 글자 */}
        <text x="20" y="26" textAnchor="middle" fill="white" fontSize="18" fontWeight="800" fontFamily="system-ui">K</text>
      </svg>
      <span style={{ fontSize }} className="font-extrabold tracking-tight text-gray-900 dark:text-white">
        HUDO
      </span>
    </span>
  );
}

/* ── Option C: 동그라미 사자 원형 ── */
function LogoC({ size = 32 }: { size?: number }) {
  const iconSize = size;
  const fontSize = size * 0.5;
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40" fill="none">
        {/* 갈기 (외곽 짧은 선 6개) */}
        {[30, 90, 150, 210, 270, 330].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 20 + Math.cos(rad) * 16;
          const y1 = 20 + Math.sin(rad) * 16;
          const x2 = 20 + Math.cos(rad) * 19;
          const y2 = 20 + Math.sin(rad) * 19;
          return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C41230" strokeWidth="3" strokeLinecap="round" />;
        })}
        {/* 얼굴 원 */}
        <circle cx="20" cy="20" r="14" fill="#5856D6" />
        {/* 눈 ^^ */}
        <path d="M13 18c.8-1.5 1.8-2 2.8-2s2 .5 2.8 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M21.4 18c.8-1.5 1.8-2 2.8-2s2 .5 2.8 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* 코 */}
        <circle cx="20" cy="22" r="1.2" fill="#FFD4DC" />
        {/* 입 */}
        <path d="M16.5 25c1.2 1.8 2.5 2.3 3.5 2.3s2.3-.5 3.5-2.3" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
      <span style={{ fontSize }} className="font-extrabold tracking-tight text-gray-900 dark:text-white">
        KHUDO
      </span>
    </span>
  );
}

/* ── Option D: 사자 발바닥 체크 ── */
function LogoD({ size = 32 }: { size?: number }) {
  const iconSize = size;
  const fontSize = size * 0.5;
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40" fill="none">
        {/* 배경 라운드 사각형 */}
        <rect width="40" height="40" rx="10" fill="#5856D6" />
        {/* 발바닥 메인 패드 */}
        <ellipse cx="20" cy="24" rx="8" ry="7" fill="white" opacity="0.9" />
        {/* 발가락 패드 4개 */}
        <circle cx="11" cy="14" r="3.5" fill="white" opacity="0.9" />
        <circle cx="18" cy="10" r="3.5" fill="white" opacity="0.9" />
        <circle cx="25.5" cy="11.5" r="3" fill="white" opacity="0.9" />
        <circle cx="30.5" cy="16" r="2.8" fill="white" opacity="0.9" />
        {/* 체크마크 */}
        <path d="M15 24l3.5 3.5 7-7" stroke="#C41230" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize }} className="font-extrabold tracking-tight text-gray-900 dark:text-white">
        KHUDO
      </span>
    </span>
  );
}

export default function LogoDemoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-16 bg-gray-50 px-8 py-16 dark:bg-gray-900">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">로고 디자인 후보</h1>

      {/* A: 미니멀 사자 얼굴 */}
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-lg font-semibold text-gray-500">A. 미니멀 사자 얼굴</h2>
        <div className="flex items-center gap-10">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-gray-400">헤더 (sm)</span>
            <div className="rounded-xl border bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
              <LogoA size={28} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-gray-400">로그인 (xl)</span>
            <div className="rounded-xl border bg-white px-6 py-4 shadow-sm dark:bg-gray-800">
              <LogoA size={52} />
            </div>
          </div>
        </div>
      </div>

      {/* B: 사자 갈기 K */}
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-lg font-semibold text-gray-500">B. 사자 갈기 K</h2>
        <div className="flex items-center gap-10">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-gray-400">헤더 (sm)</span>
            <div className="rounded-xl border bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
              <LogoB size={28} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-gray-400">로그인 (xl)</span>
            <div className="rounded-xl border bg-white px-6 py-4 shadow-sm dark:bg-gray-800">
              <LogoB size={52} />
            </div>
          </div>
        </div>
      </div>

      {/* C: 동그라미 사자 */}
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-lg font-semibold text-gray-500">C. 동그라미 사자 원형</h2>
        <div className="flex items-center gap-10">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-gray-400">헤더 (sm)</span>
            <div className="rounded-xl border bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
              <LogoC size={28} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-gray-400">로그인 (xl)</span>
            <div className="rounded-xl border bg-white px-6 py-4 shadow-sm dark:bg-gray-800">
              <LogoC size={52} />
            </div>
          </div>
        </div>
      </div>

      {/* D: 사자 발바닥 */}
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-lg font-semibold text-gray-500">D. 사자 발바닥 체크</h2>
        <div className="flex items-center gap-10">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-gray-400">헤더 (sm)</span>
            <div className="rounded-xl border bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
              <LogoD size={28} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-gray-400">로그인 (xl)</span>
            <div className="rounded-xl border bg-white px-6 py-4 shadow-sm dark:bg-gray-800">
              <LogoD size={52} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
