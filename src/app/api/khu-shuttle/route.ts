import { NextResponse } from "next/server";

// 경희대 캠퍼스 좌표
const COORDS = {
  // 국제캠퍼스 (경희대 국제캠퍼스 정문)
  global: { lng: 127.0808, lat: 37.2429 },
  // 서울캠퍼스 (경희대 서울캠퍼스 정문)
  seoul: { lng: 127.0512, lat: 37.5974 },
};

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const DIRECTIONS_URL = "https://apis-navi.kakaomobility.com/v1/directions";

// 인메모리 캐시 — 10분간 유지
let shuttleCache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10분
const FETCH_TIMEOUT = 5_000; // 5초

type RouteResult = {
  duration: number; // 초 단위
  distance: number; // 미터 단위
  durationMin: number; // 분 단위
};

async function getRoute(
  origin: { lng: number; lat: number },
  destination: { lng: number; lat: number }
): Promise<RouteResult | null> {
  if (!KAKAO_API_KEY) return null;

  try {
    const url = `${DIRECTIONS_URL}?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&priority=RECOMMEND`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 300 }, // 5분 캐시
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("Kakao API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      if (route.result_code === 0 && route.summary) {
        return {
          duration: route.summary.duration, // 초
          distance: route.summary.distance, // 미터
          durationMin: Math.round(route.summary.duration / 60),
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Kakao directions error:", error);
    return null;
  }
}

export async function GET() {
  // 캐시 히트
  if (shuttleCache && Date.now() - shuttleCache.ts < CACHE_TTL) {
    return NextResponse.json(shuttleCache.data);
  }

  const [globalToSeoul, seoulToGlobal] = await Promise.all([
    getRoute(COORDS.global, COORDS.seoul),
    getRoute(COORDS.seoul, COORDS.global),
  ]);

  const result = {
    globalToSeoul: globalToSeoul
      ? {
          durationMin: globalToSeoul.durationMin,
          distanceKm: Math.round(globalToSeoul.distance / 100) / 10,
          label: `약 ${globalToSeoul.durationMin}분`,
        }
      : null,
    seoulToGlobal: seoulToGlobal
      ? {
          durationMin: seoulToGlobal.durationMin,
          distanceKm: Math.round(seoulToGlobal.distance / 100) / 10,
          label: `약 ${seoulToGlobal.durationMin}분`,
        }
      : null,
    updatedAt: new Date().toISOString(),
  };

  // 캐시 저장
  shuttleCache = { data: result, ts: Date.now() };

  return NextResponse.json(result);
}
