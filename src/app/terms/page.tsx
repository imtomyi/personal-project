import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 - KHUDO",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-gray-200/60 dark:border-white/[0.08]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-lg font-bold text-gray-900 dark:text-white">
            KHUDO
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            홈으로
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">
          이용약관
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              제1조 (목적)
            </h2>
            <p>
              본 약관은 KHUDO(이하 &quot;서비스&quot;)의 이용에 관한 기본적인 사항을 규정하는 것을 목적으로 합니다.
              서비스는 실시간 협업 할 일 관리, 시간표, 루틴, 가계부 등의 생산성 도구를 제공합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              제2조 (정의)
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>&quot;서비스&quot;란 KHUDO가 제공하는 웹 및 모바일 앱 기반의 생산성 관리 플랫폼을 말합니다.</li>
              <li>&quot;이용자&quot;란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.</li>
              <li>&quot;워크스페이스&quot;란 이용자가 생성하는 할 일 관리 공간을 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              제3조 (이용 계약의 성립)
            </h2>
            <p>
              이용 계약은 이용자가 본 약관에 동의하고 회원가입을 완료한 때에 성립합니다.
              서비스는 다음의 경우 가입을 거절할 수 있습니다.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>타인의 명의를 사용한 경우</li>
              <li>허위 정보를 기재한 경우</li>
              <li>서비스 운영을 방해할 목적이 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              제4조 (서비스의 제공)
            </h2>
            <p>서비스는 다음의 기능을 제공합니다.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>워크스페이스 기반 할 일 관리 및 실시간 협업</li>
              <li>일일 시간표 자동 배치 및 관리</li>
              <li>루틴/습관 트래커</li>
              <li>가계부 및 예산 관리</li>
              <li>디데이, 캘린더 등 부가 기능</li>
            </ul>
            <p className="mt-2">
              서비스는 현재 무료로 제공되며, 향후 유료 서비스를 추가할 수 있습니다.
              유료 전환 시 사전에 고지합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              제5조 (이용자의 의무)
            </h2>
            <p>이용자는 다음의 행위를 해서는 안 됩니다.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>타인의 개인정보를 도용하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>불법적인 목적으로 서비스를 이용하는 행위</li>
              <li>서비스를 이용하여 타인에게 피해를 주는 행위</li>
              <li>서비스의 보안을 위협하는 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              제6조 (서비스 변경 및 중단)
            </h2>
            <p>
              서비스는 운영상 필요한 경우 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.
              서비스 변경 또는 중단 시 사전에 공지합니다.
              단, 긴급한 경우 사후에 공지할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              제7조 (면책)
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>서비스는 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              <li>이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
              <li>서비스에 저장된 데이터의 손실에 대해 책임을 지지 않습니다. 중요한 데이터는 별도로 백업하시기 바랍니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              제8조 (회원 탈퇴)
            </h2>
            <p>
              이용자는 언제든지 설정 페이지를 통해 회원 탈퇴를 요청할 수 있습니다.
              탈퇴 시 이용자의 모든 데이터는 즉시 삭제되며, 복구가 불가능합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              제9조 (준거법 및 관할)
            </h2>
            <p>
              본 약관의 해석 및 서비스 이용에 관한 분쟁은 대한민국 법률을 적용하며,
              관련 분쟁 발생 시 서울중앙지방법원을 전속적 관할 법원으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              제10조 (시행일)
            </h2>
            <p>본 약관은 2025년 3월 1일부터 시행합니다.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-200/60 dark:border-white/[0.08]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
          <span className="text-sm text-gray-400 dark:text-gray-500">
            &copy; 2025 KHUDO
          </span>
          <Link href="/privacy" className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            개인정보처리방침
          </Link>
        </div>
      </footer>
    </div>
  );
}
