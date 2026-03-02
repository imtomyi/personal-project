import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/layout/Logo";

export const metadata: Metadata = {
  title: "개인정보처리방침 - KHUDO",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-gray-200/60 dark:border-white/[0.08]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            홈으로
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">
          개인정보처리방침
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              1. 개인정보의 수집 및 이용 목적
            </h2>
            <p>
              KHUDO(이하 &quot;서비스&quot;)는 다음의 목적을 위해 개인정보를 수집합니다.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>회원 가입 및 관리: 회원 식별, 서비스 이용</li>
              <li>서비스 제공: 할 일 관리, 시간표, 루틴, 가계부 등 핵심 기능 제공</li>
              <li>서비스 개선: 이용 통계 분석, 서비스 품질 향상</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              2. 수집하는 개인정보 항목
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>필수 항목:</strong> 이메일 주소, 비밀번호(암호화), 이름</li>
              <li><strong>소셜 로그인 시:</strong> Google 계정 정보(이메일, 이름, 프로필 사진)</li>
              <li><strong>서비스 이용 중 생성:</strong> 할 일, 시간표, 루틴 기록, 가계부 내역, 워크스페이스 데이터</li>
              <li><strong>자동 수집:</strong> 서비스 이용 기록, 접속 로그, 기기 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              3. 개인정보의 보유 및 이용기간
            </h2>
            <p>
              회원 탈퇴 시까지 보유하며, 탈퇴 시 지체 없이 파기합니다.
              단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>전자상거래 등 소비자 보호법: 계약 또는 청약철회 기록 5년</li>
              <li>통신비밀보호법: 로그인 기록 3개월</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              4. 개인정보의 파기절차 및 방법
            </h2>
            <p>
              회원 탈퇴 요청 시 개인정보는 즉시 파기됩니다.
              전자적 파일 형태의 정보는 복구 불가능한 방법으로 영구 삭제합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              5. 개인정보의 제3자 제공
            </h2>
            <p>
              서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
              다만, 서비스 운영을 위해 다음의 외부 서비스를 이용합니다.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Supabase:</strong> 데이터베이스 및 인증 처리 (AWS 서버)</li>
              <li><strong>Vercel:</strong> 웹 호스팅 및 성능 분석</li>
              <li><strong>Google OAuth:</strong> 소셜 로그인 (선택)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              6. 이용자의 권리와 의무
            </h2>
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>개인정보 열람, 수정: 설정 페이지에서 직접 수정 가능</li>
              <li>회원 탈퇴: 설정 페이지에서 계정 삭제 가능</li>
              <li>개인정보 처리 정지 요청: 아래 연락처로 요청</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              7. 개인정보 보호책임자
            </h2>
            <p>
              개인정보 보호에 관한 문의사항은 아래 연락처로 문의해 주세요.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>서비스명: KHUDO</li>
              <li>이메일: support@khudo.app</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              8. 시행일
            </h2>
            <p>본 개인정보처리방침은 2025년 3월 1일부터 시행합니다.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-200/60 dark:border-white/[0.08]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
          <span className="text-sm text-gray-400 dark:text-gray-500">
            &copy; 2025 KHUDO
          </span>
          <Link href="/terms" className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            이용약관
          </Link>
        </div>
      </footer>
    </div>
  );
}
