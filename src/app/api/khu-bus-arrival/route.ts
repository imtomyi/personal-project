import { NextResponse } from "next/server";

// 경희대 국제캠퍼스 주요 정류소 (GBIS stationId)
const STATIONS = {
  경희대정문: { stationId: "228000723", mobileNo: "29038" },
  사색의광장: { stationId: "228000708", mobileNo: "29058" },
} as const;

// 교내 무료 구간에 해당하는 노선 번호
const CAMPUS_FREE_ROUTES = [
  "9", "9-1", "1112", "1560A", "1560B", "5100", "7000", "M5107",
];

const DATA_GO_KR_KEY = process.env.DATA_GO_KR_SERVICE_KEY;
const ARRIVAL_API =
  "https://apis.data.go.kr/6410000/busarrivalservice/v2/getBusArrivalListv2";

export type BusArrival = {
  routeName: string;
  routeType: string;
  stationName: string;
  predictTime1: number | null;
  predictTime2: number | null;
  locationNo1: number | null;
  locationNo2: number | null;
  remainSeatCnt1: number | null;
  remainSeatCnt2: number | null;
  isCampusFree: boolean;
};

export type BusArrivalResponse = {
  toCenter: BusArrival[]; // 정문 → 사색의광장 (캠퍼스 안쪽으로)
  toGate: BusArrival[]; // 사색의광장 → 정문 (캠퍼스 바깥으로)
  updatedAt: string;
  error?: string;
};

function parseRouteType(typeCode: string): string {
  const map: Record<string, string> = {
    "11": "직행좌석",
    "12": "일반좌석",
    "13": "일반",
    "14": "광역급행",
    "15": "따복",
    "16": "경기순환",
    "21": "직행좌석(시외)",
    "22": "일반좌석(시외)",
    "23": "일반(시외)",
    "30": "마을",
    "41": "시내급행",
    "43": "시내일반",
    "51": "리무진",
    "52": "공항",
  };
  return map[typeCode] || "기타";
}

function num(v: unknown): number | null {
  if (v === undefined || v === null || v === "" || v === "-1") return null;
  const n = Number(v);
  return isNaN(n) || n < 0 ? null : n;
}

async function fetchStationArrivals(
  stationId: string,
  stationName: string
): Promise<BusArrival[]> {
  if (!DATA_GO_KR_KEY) return [];

  try {
    const url = `${ARRIVAL_API}?serviceKey=${DATA_GO_KR_KEY}&stationId=${stationId}&format=json`;
    const res = await fetch(url, { next: { revalidate: 30 } });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Bus arrival API error for ${stationName}:`, res.status, text);
      return [];
    }

    const data = await res.json();
    const body = data?.response?.msgBody;
    if (!body?.busArrivalList) return [];

    const list = Array.isArray(body.busArrivalList)
      ? body.busArrivalList
      : [body.busArrivalList];

    return list.map((item: Record<string, unknown>) => ({
      routeName: String(item.routeName || ""),
      routeType: parseRouteType(String(item.routeTypeCd || "")),
      stationName,
      predictTime1: num(item.predictTime1),
      predictTime2: num(item.predictTime2),
      locationNo1: num(item.locationNo1),
      locationNo2: num(item.locationNo2),
      remainSeatCnt1: num(item.remainSeatCnt1),
      remainSeatCnt2: num(item.remainSeatCnt2),
      isCampusFree: CAMPUS_FREE_ROUTES.some(
        (r) => r === String(item.routeName || "")
      ),
    }));
  } catch (error) {
    console.error(`Bus arrival fetch error for ${stationName}:`, error);
    return [];
  }
}

function filterAndSort(arrivals: BusArrival[]): BusArrival[] {
  return arrivals
    .filter((a) => a.isCampusFree)
    .sort((a, b) => {
      if (a.predictTime1 !== null && b.predictTime1 === null) return -1;
      if (a.predictTime1 === null && b.predictTime1 !== null) return 1;
      return (a.predictTime1 ?? 999) - (b.predictTime1 ?? 999);
    });
}

// 인메모리 캐시 — 30초간 유지 (공공API 호출 절약 + 응답 속도 향상)
let cache: { data: BusArrivalResponse; ts: number } | null = null;
const CACHE_TTL = 30_000; // 30초

export async function GET() {
  if (!DATA_GO_KR_KEY) {
    return NextResponse.json({
      toCenter: [],
      toGate: [],
      error: "DATA_GO_KR_SERVICE_KEY not configured",
      updatedAt: new Date().toISOString(),
    } satisfies BusArrivalResponse);
  }

  // 캐시 히트
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  // 양방향 동시 조회
  const [gateArrivals, centerArrivals] = await Promise.all([
    fetchStationArrivals(STATIONS.경희대정문.stationId, "경희대정문"),
    fetchStationArrivals(STATIONS.사색의광장.stationId, "사색의광장"),
  ]);

  const result: BusArrivalResponse = {
    toCenter: filterAndSort(gateArrivals),
    toGate: filterAndSort(centerArrivals),
    updatedAt: new Date().toISOString(),
  };

  cache = { data: result, ts: Date.now() };
  return NextResponse.json(result);
}
