/**
 * KHUDO 오리지널 로고 컴포넌트
 * - "KHU" 부분: 경희 레드 악센트 하단 바
 * - "DO" 부분: 브랜드 퍼플
 * - 공식 경희대 로고 미사용 (상표권 안전)
 */

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: { fontSize: 16, barH: 2, gap: 0.5 },
  md: { fontSize: 20, barH: 2.5, gap: 0.5 },
  lg: { fontSize: 28, barH: 3, gap: 1 },
  xl: { fontSize: 36, barH: 4, gap: 1 },
};

export default function Logo({ size = "md", className = "" }: LogoProps) {
  const s = sizeMap[size];

  return (
    <span
      className={`inline-flex items-baseline font-extrabold tracking-tight ${className}`}
      style={{ fontSize: s.fontSize, lineHeight: 1 }}
    >
      {/* KHU 부분 — 하단 레드 악센트 바 */}
      <span className="relative">
        <span className="text-gray-900 dark:text-white">KHU</span>
        <span
          className="absolute bottom-0 left-0 w-full rounded-full bg-[#C41230]"
          style={{ height: s.barH, marginBottom: -s.gap }}
        />
      </span>
      {/* DO 부분 — 브랜드 퍼플 */}
      <span className="text-[#5856D6]">DO</span>
    </span>
  );
}
