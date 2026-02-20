import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { KhuNotice } from "@/lib/types";

// 경희대 공지사항 — 새로운 URL (구 URL은 404)
const NOTICE_BOARDS: Record<string, { url: string; label: string }> = {
  general: {
    url: "https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200072",
    label: "학사공지",
  },
  seoul: {
    url: "https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200073",
    label: "서울캠퍼스",
  },
  global: {
    url: "https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200074",
    label: "국제캠퍼스",
  },
};

// 인메모리 캐시 — 5분간 유지 (khu.ac.kr 스크래핑 느림 대응)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분
const FETCH_TIMEOUT = 5_000; // 5초

// 학생에게 중요한 키워드
const IMPORTANT_KEYWORDS = [
  "수강", "수강신청", "수강정정", "등록", "등록금",
  "시험", "중간", "기말", "성적", "학점",
  "장학", "장학금", "졸업", "졸업요건",
  "휴학", "복학", "전과", "전공",
  "수업", "강의", "개강", "종강",
  "취업", "채용", "인턴",
  "긴급", "필독", "중요", "안내",
  "방학", "계절학기",
];

function isImportantNotice(title: string, category: string | null): boolean {
  const text = (title + " " + (category || "")).toLowerCase();
  return IMPORTANT_KEYWORDS.some((kw) => text.includes(kw));
}

function isRecentNotice(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const noticeDate = new Date(dateStr);
  const now = new Date();
  const diffDays = (now.getTime() - noticeDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7; // 7일 이내
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const board = searchParams.get("board") || "general";
  const boardConfig = NOTICE_BOARDS[board] || NOTICE_BOARDS.general;

  // 캐시 히트
  const cacheKey = `notices-${board}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(boardConfig.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: controller.signal,
      next: { revalidate: 300 }, // 5분 캐시
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const notices: KhuNotice[] = [];

    // 경희대 공지사항 테이블: table > tbody > tr
    $("table tbody tr").each((index, element) => {
      const $el = $(element);
      const tds = $el.find("td");

      if (tds.length < 4) return;

      const titleEl = $el.find("td:nth-child(2) a, td a").first();
      const title = titleEl.text().trim();

      if (!title) return;

      // javascript:view('317406','') 에서 boardId 추출
      const href = titleEl.attr("href") || "";
      const boardIdMatch = href.match(/view\('(\d+)'/);
      const boardId = boardIdMatch ? boardIdMatch[1] : "";

      const menuNo = boardConfig.url.match(/menuNo=(\d+)/)?.[1] || "200072";
      const detailUrl = boardId
        ? `https://www.khu.ac.kr/kor/user/bbs/BMSR00040/view.do?menuNo=${menuNo}&boardId=${boardId}`
        : boardConfig.url;

      const author = tds.eq(2).text().trim() || null;
      const date = tds.eq(3).text().trim() || null;

      const categoryEl = $el.find("span.txtBox01, span.tag").first();
      const category = categoryEl.length ? categoryEl.text().trim() : null;

      notices.push({
        id: `khu-${boardId || index}-${board}`,
        title,
        url: detailUrl,
        author,
        date,
        category,
        isImportant: isImportantNotice(title, category),
        isRecent: isRecentNotice(date),
      });
    });

    // 중요 공지를 앞으로, 그 안에서 최신순
    const sorted = [
      ...notices.filter((n) => n.isImportant && n.isRecent),
      ...notices.filter((n) => n.isImportant && !n.isRecent),
      ...notices.filter((n) => !n.isImportant && n.isRecent),
      ...notices.filter((n) => !n.isImportant && !n.isRecent),
    ];

    const result = {
      notices: sorted.slice(0, 20),
      board: boardConfig.label,
    };

    // 캐시 저장
    cache.set(cacheKey, { data: result, ts: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error("KHU notice scraping error:", error);

    // 타임아웃 등 에러 시 이전 캐시가 있으면 stale 데이터라도 반환
    const stale = cache.get(cacheKey);
    if (stale) {
      return NextResponse.json(stale.data);
    }

    return NextResponse.json(
      { notices: [], error: "공지사항을 가져오는데 실패했습니다." },
      { status: 200 },
    );
  }
}
