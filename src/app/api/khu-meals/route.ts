import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// 경희대 학식 게시판 (주간 메뉴표)
const MEALS_BOARD_URL =
  "https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200283&catId=137";

const DETAIL_BASE_URL =
  "https://www.khu.ac.kr/kor/user/bbs/BMSR00040/view.do?menuNo=200283&catId=137&boardId=";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

// 인메모리 캐시 — 5분간 유지 (khu.ac.kr 스크래핑 느림 대응)
let mealsCache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5분
const FETCH_TIMEOUT = 5_000; // 5초

export type MealPost = {
  id: string;
  title: string;
  url: string;
  date: string | null;
  campus: "서울" | "국제" | "기타";
  cafeteria: string;
  dateRange: string | null;
  imageUrl: string | null; // 식단표 이미지
};

/** 상세 페이지에서 식단표 이미지 URL 추출 */
async function fetchMenuImage(boardId: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(`${DETAIL_BASE_URL}${boardId}`, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      next: { revalidate: 3600 },
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // 본문 영역에서 /upload/ 경로의 이미지 찾기
    let imageUrl: string | null = null;

    $("img").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (src.includes("/upload/cross/images/") || src.includes("/upload/")) {
        // 상대 경로면 절대 경로로 변환
        imageUrl = src.startsWith("http")
          ? src
          : `https://www.khu.ac.kr${src}`;
        return false; // 첫 번째 이미지만
      }
    });

    return imageUrl;
  } catch {
    return null;
  }
}

export async function GET() {
  // 캐시 히트
  if (mealsCache && Date.now() - mealsCache.ts < CACHE_TTL) {
    return NextResponse.json(mealsCache.data);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(MEALS_BOARD_URL, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      next: { revalidate: 3600 }, // 1시간 캐시
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const posts: MealPost[] = [];

    $("table tbody tr").each((index, element) => {
      const $el = $(element);
      const tds = $el.find("td");

      if (tds.length < 4) return;

      const titleEl = $el.find("td a").first();
      const rawTitle = titleEl.text().trim();

      if (!rawTitle) return;

      // javascript:view('321071','137') 에서 boardId 추출
      const href = titleEl.attr("href") || "";
      const boardIdMatch = href.match(/view\('(\d+)'/);
      const boardId = boardIdMatch ? boardIdMatch[1] : "";

      const detailUrl = boardId
        ? `${DETAIL_BASE_URL}${boardId}`
        : MEALS_BOARD_URL;

      const date = tds.eq(4).text().trim() || tds.eq(3).text().trim() || null;

      // 캠퍼스 판별
      let campus: "서울" | "국제" | "기타" = "기타";
      if (rawTitle.includes("국제") || rawTitle.includes("2기숙사")) {
        campus = "국제";
      } else if (rawTitle.includes("서울") || rawTitle.includes("청운") || rawTitle.includes("푸른솔")) {
        campus = "서울";
      }

      // 식당 이름 추출: [xxx] 패턴
      const cafeteriaMatch = rawTitle.match(/\[(.+?)\]/);
      const cafeteria = cafeteriaMatch ? cafeteriaMatch[1] : rawTitle;

      // 날짜 범위 추출: MM.DD~MM.DD 또는 유사 패턴
      const dateRangeMatch = rawTitle.match(
        /(\d{2,4}[.\/-]\d{1,2}[.\/-]?\d{0,2})\s*[~\-]\s*(\d{2,4}[.\/-]?\d{1,2}[.\/-]?\d{0,2})/,
      );
      const dateRange = dateRangeMatch
        ? `${dateRangeMatch[1]} ~ ${dateRangeMatch[2]}`
        : null;

      posts.push({
        id: `meal-${boardId || index}`,
        title: rawTitle,
        url: detailUrl,
        date,
        campus,
        cafeteria,
        dateRange,
        imageUrl: null, // 나중에 채움
      });
    });

    // 최신 6개만 상세 이미지 크롤링 (병렬 처리, 너무 많으면 느려짐)
    const topPosts = posts.slice(0, 6);
    const imagePromises = topPosts.map(async (post) => {
      const boardId = post.id.replace("meal-", "");
      if (boardId && boardId !== "0") {
        post.imageUrl = await fetchMenuImage(boardId);
      }
    });
    await Promise.all(imagePromises);

    const result = {
      posts: topPosts,
      boardUrl: MEALS_BOARD_URL,
    };

    // 캐시 저장
    mealsCache = { data: result, ts: Date.now() };

    return NextResponse.json(result);
  } catch (error) {
    console.error("KHU meals scraping error:", error);

    // 타임아웃 등 에러 시 이전 캐시가 있으면 stale 데이터라도 반환
    if (mealsCache) {
      return NextResponse.json(mealsCache.data);
    }

    return NextResponse.json(
      { posts: [], error: "학식 정보를 가져오는데 실패했습니다.", boardUrl: MEALS_BOARD_URL },
      { status: 200 },
    );
  }
}
