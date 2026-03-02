import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="text-center">
        <div className="mb-4 text-6xl font-bold text-gray-200 dark:text-gray-700">
          404
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-[#5856D6] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4b49b8]"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
