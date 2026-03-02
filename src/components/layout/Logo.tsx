/**
 * KHUDO 로고 컴포넌트
 * - 사자 캐릭터 이미지 + KHU(레드) DO(퍼플) 투톤 텍스트
 */

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: { icon: 22, fontSize: 15, gap: 4 },
  md: { icon: 28, fontSize: 19, gap: 5 },
  lg: { icon: 36, fontSize: 26, gap: 6 },
  xl: { icon: 48, fontSize: 34, gap: 8 },
};

export default function Logo({ size = "md", className = "" }: LogoProps) {
  const s = sizeMap[size];

  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ gap: s.gap }}
    >
      {/* 사자 이미지 */}
      <img
        src="/lion-logo.png"
        alt="KHUDO"
        width={s.icon}
        height={s.icon}
        className="object-contain"
        style={{ width: s.icon, height: s.icon }}
      />
      {/* KHU=레드 DO=퍼플 투톤 텍스트 */}
      <span
        className="font-extrabold tracking-tight"
        style={{ fontSize: s.fontSize, lineHeight: 1 }}
      >
        <span className="text-[#C41230]">KHU</span>
        <span className="text-[#5856D6]">DO</span>
      </span>
    </span>
  );
}
