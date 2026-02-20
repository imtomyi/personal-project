"use client";

import { useEffect, useState, useCallback } from "react";

type MealPost = {
  id: string;
  title: string;
  url: string;
  date: string | null;
  campus: "서울" | "국제" | "기타";
  cafeteria: string;
  dateRange: string | null;
  imageUrl: string | null;
};

export default function KhuMealInfo() {
  const [posts, setPosts] = useState<MealPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardUrl, setBoardUrl] = useState("");
  const [selectedCampus, setSelectedCampus] = useState<"all" | "서울" | "국제">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/khu-meals");
      const data = await res.json();
      setPosts(data.posts || []);
      setBoardUrl(data.boardUrl || "");
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const filteredPosts =
    selectedCampus === "all"
      ? posts
      : posts.filter((p) => p.campus === selectedCampus);

  // 최신 식단표만 식당별로 그루핑 (같은 식당은 최신 1개만)
  const latestByCafeteria = new Map<string, MealPost>();
  for (const post of filteredPosts) {
    if (!latestByCafeteria.has(post.cafeteria)) {
      latestByCafeteria.set(post.cafeteria, post);
    }
  }
  const uniquePosts = Array.from(latestByCafeteria.values());

  if (loading) {
    return (
      <div className="card-surface p-5">
        <div className="animate-pulse">
          <div className="mb-3 h-5 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-gray-100 dark:bg-gray-700"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          🍽️ 학식 메뉴
        </h3>
        <button
          onClick={fetchMeals}
          disabled={loading}
          className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="새로고침"
        >
          <svg
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* 캠퍼스 필터 */}
      <div className="mb-3 flex gap-1">
        {(["all", "서울", "국제"] as const).map((campus) => (
          <button
            key={campus}
            onClick={() => setSelectedCampus(campus)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              selectedCampus === campus
                ? "bg-[#9B1B30] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
            }`}
          >
            {campus === "all" ? "전체" : campus + "캠"}
          </button>
        ))}
      </div>

      {/* 식단표 목록 */}
      {uniquePosts.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            등록된 식단표가 없습니다
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {uniquePosts.map((post) => {
            const isExpanded = expandedId === post.id;
            return (
              <div key={post.id} className="overflow-hidden rounded-lg border border-gray-100 transition-all dark:border-gray-700">
                {/* 클릭 가능한 헤더 */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : post.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  {/* 캠퍼스 뱃지 */}
                  <span
                    className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                      post.campus === "서울"
                        ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                        : post.campus === "국제"
                          ? "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {post.campus === "기타" ? "기타" : post.campus}
                  </span>

                  {/* 식당 정보 */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                      {post.cafeteria}
                    </p>
                    {post.dateRange && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {post.dateRange}
                      </p>
                    )}
                  </div>

                  {/* 이미지 있음 표시 + 펼침 화살표 */}
                  <div className="flex items-center gap-1.5">
                    {post.imageUrl && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        사진
                      </span>
                    )}
                    <svg
                      className={`h-3 w-3 flex-shrink-0 text-gray-300 transition-transform dark:text-gray-600 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* 펼침 영역 — 식단표 이미지 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
                    {post.imageUrl ? (
                      <div className="space-y-2">
                        <img
                          src={post.imageUrl}
                          alt={`${post.cafeteria} 식단표`}
                          className="w-full rounded-lg"
                          loading="lazy"
                          style={{ maxHeight: "400px", objectFit: "contain" }}
                        />
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center text-[10px] text-[#9B1B30] hover:text-[#7a1526]"
                        >
                          원본 게시글 보기 →
                        </a>
                      </div>
                    ) : (
                      <div className="py-3 text-center">
                        <p className="mb-1 text-xs text-gray-400">이미지를 불러올 수 없습니다</p>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#9B1B30] hover:text-[#7a1526]"
                        >
                          게시글에서 직접 확인 →
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {boardUrl && (
        <a
          href={boardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-center text-[11px] text-[#9B1B30] hover:text-[#7a1526] dark:text-blue-400"
        >
          전체 식단표 보기 →
        </a>
      )}
    </div>
  );
}
