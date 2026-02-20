"use client";

import { useEffect, useState, useCallback } from "react";
import { nowKST } from "@/lib/date";
import type { BusArrival, BusArrivalResponse } from "@/app/api/khu-bus-arrival/route";

// 셔틀버스 정보 — 학교 페이지에 실시간 시간표가 없어서 하드코딩
// 출처: 경희대 셔틀버스 운영 정보 (동영관광) 2025-1학기 기준
const SHUTTLE_SCHEDULES = {
  globalToSeoul: {
    label: "국제캠 → 서울캠",
    times: ["07:10", "10:00", "11:55", "13:30", "16:40", "18:00"],
  },
  seoulToGlobal: {
    label: "서울캠 → 국제캠",
    times: ["07:20", "10:00", "13:30", "15:10", "16:40", "18:00"],
  },
};

// 교내 무료 구간 광역버스 (국제캠퍼스)
const CAMPUS_BUSES = {
  route: "경희대정문 → 외대앞 → 생대앞 → 사색의광장",
  freeNote: "교내 구간 무료 (카드 불필요)",
  buses: ["9", "1112", "1560", "5100", "7000", "M5107"],
};

const SHUTTLE_INFO = {
  fare: "2,000원",
  // PAYCO 앱 딥링크 — 앱이 없으면 모바일 웹으로 폴백
  ticketUrl: "https://m.payco.com/app/exec.nhn?open=brandhome/branddetail?id=KH_USE&direct=Y",
  // PAYCO 앱 스킴 (iOS/Android 네이티브 앱 우선 열기)
  ticketAppScheme: "payco://brandhome/branddetail?id=KH_USE",
  infoUrl: "https://sites.google.com/dongyeongtour.co.kr/khu/main",
  contact: "총무팀 02-961-0035",
};

type RouteInfo = {
  durationMin: number;
  distanceKm: number;
  label: string;
} | null;

type TrafficData = {
  globalToSeoul: RouteInfo;
  seoulToGlobal: RouteInfo;
  updatedAt: string;
};

export default function KhuShuttleInfo() {
  const [activeTab, setActiveTab] = useState<"campus" | "local">("local");
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [busData, setBusData] = useState<{ toCenter: BusArrival[]; toGate: BusArrival[] }>({ toCenter: [], toGate: [] });
  const [busLoading, setBusLoading] = useState(true);
  const [busExpanded, setBusExpanded] = useState(false);

  const now = nowKST();
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  const fetchTraffic = useCallback(async () => {
    try {
      const res = await fetch("/api/khu-shuttle");
      const data = await res.json();
      setTraffic(data);
    } catch {
      setTraffic(null);
    } finally {
      setTrafficLoading(false);
    }
  }, []);

  const fetchBusArrivals = useCallback(async () => {
    try {
      const res = await fetch("/api/khu-bus-arrival");
      const data: BusArrivalResponse = await res.json();
      setBusData({ toCenter: data.toCenter || [], toGate: data.toGate || [] });
    } catch {
      setBusData({ toCenter: [], toGate: [] });
    } finally {
      setBusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTraffic();
    const trafficInterval = setInterval(fetchTraffic, 30 * 60 * 1000);
    return () => clearInterval(trafficInterval);
  }, [fetchTraffic]);

  // 교내버스 탭 활성화 시에만 버스 도착정보 호출 + 60초 자동갱신
  useEffect(() => {
    if (activeTab !== "local") return;
    fetchBusArrivals();
    const busInterval = setInterval(fetchBusArrivals, 60 * 1000);
    return () => clearInterval(busInterval);
  }, [activeTab, fetchBusArrivals]);

  function getNextShuttle(times: string[]) {
    return times.find((t) => t > currentTimeStr) || null;
  }

  function getMinutesUntil(timeStr: string) {
    const [h, m] = timeStr.split(":").map(Number);
    const [nowH, nowM] = currentTimeStr.split(":").map(Number);
    return (h * 60 + m) - (nowH * 60 + nowM);
  }

  const nextGlobalToSeoul = getNextShuttle(SHUTTLE_SCHEDULES.globalToSeoul.times);
  const nextSeoulToGlobal = getNextShuttle(SHUTTLE_SCHEDULES.seoulToGlobal.times);

  function renderTimeBadges(times: string[], nextTime: string | null) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {times.map((time) => {
          const isPast = time < currentTimeStr;
          const isNext = time === nextTime;
          return (
            <span
              key={time}
              className={`rounded-md px-2 py-1 text-xs font-mono ${
                isNext
                  ? "bg-green-500 font-bold text-white"
                  : isPast
                    ? "bg-gray-100 text-gray-400 line-through dark:bg-gray-700 dark:text-gray-500"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
              }`}
            >
              {time}
            </span>
          );
        })}
      </div>
    );
  }

  function renderBusRow(bus: BusArrival) {
    return (
      <div
        key={bus.routeName}
        className="flex items-center gap-2 py-1"
      >
        <span
          className={`min-w-[44px] rounded px-1.5 py-0.5 text-center text-[11px] font-bold ${
            bus.routeName.startsWith("M")
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : bus.routeName.length >= 4
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                : "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
          }`}
        >
          {bus.routeName}
        </span>
        <div className="flex-1 min-w-0">
          {bus.predictTime1 !== null ? (
            <span className="text-xs">
              <span className="font-bold text-gray-900 dark:text-white">{bus.predictTime1}분</span>
              {bus.locationNo1 !== null && (
                <span className="text-[10px] text-gray-400"> ({bus.locationNo1}전)</span>
              )}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">정보없음</span>
          )}
        </div>
        {bus.remainSeatCnt1 !== null && bus.remainSeatCnt1 > 0 && (
          <span className={`text-[10px] font-medium ${
            bus.remainSeatCnt1 <= 5
              ? "text-red-500"
              : bus.remainSeatCnt1 <= 15
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-green-600 dark:text-green-400"
          }`}>
            {bus.remainSeatCnt1}석
          </span>
        )}
      </div>
    );
  }

  function renderBusDirection(label: string, buses: BusArrival[], expanded: boolean) {
    const withTime = buses.filter((b) => b.predictTime1 !== null);
    const noTime = buses.filter((b) => b.predictTime1 === null);
    const sorted = [...withTime, ...noTime];
    const display = expanded ? sorted : sorted.slice(0, 3);

    if (sorted.length === 0) return null;

    return (
      <div>
        <p className="mb-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {display.map(renderBusRow)}
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          🚌 교통 정보
        </h3>
      </div>

      {/* 탭 */}
      <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700/50">
        {([
          { key: "local" as const, label: "국제캠 교내버스", emoji: "🚏" },
          { key: "campus" as const, label: "캠퍼스간", emoji: "🚐" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* 캠퍼스간 셔틀 탭 */}
      {activeTab === "campus" && (
        <>
          {/* 실시간 도로 소요시간 */}
          {!trafficLoading && traffic && (traffic.globalToSeoul || traffic.seoulToGlobal) && (
            <div className="mb-3 flex gap-2">
              {traffic.globalToSeoul && (
                <div className="flex-1 rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-900/20">
                  <p className="text-[10px] text-blue-500 dark:text-blue-400">국제→서울 도로상황</p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {traffic.globalToSeoul.label}
                  </p>
                  <p className="text-[10px] text-blue-400 dark:text-blue-500">
                    {traffic.globalToSeoul.distanceKm}km
                  </p>
                </div>
              )}
              {traffic.seoulToGlobal && (
                <div className="flex-1 rounded-lg bg-purple-50 px-3 py-2 dark:bg-purple-900/20">
                  <p className="text-[10px] text-purple-500 dark:text-purple-400">서울→국제 도로상황</p>
                  <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                    {traffic.seoulToGlobal.label}
                  </p>
                  <p className="text-[10px] text-purple-400 dark:text-purple-500">
                    {traffic.seoulToGlobal.distanceKm}km
                  </p>
                </div>
              )}
            </div>
          )}

          {trafficLoading && (
            <div className="mb-3 flex gap-2">
              <div className="h-16 flex-1 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
              <div className="h-16 flex-1 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
            </div>
          )}

          {isWeekend ? (
            <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                🚫 주말에는 셔틀버스가 운행하지 않습니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    🏛 국제캠 → 서울캠
                  </span>
                  {nextGlobalToSeoul && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      {getMinutesUntil(nextGlobalToSeoul)}분 후 출발
                    </span>
                  )}
                </div>
                {renderTimeBadges(SHUTTLE_SCHEDULES.globalToSeoul.times, nextGlobalToSeoul)}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    🏛 서울캠 → 국제캠
                  </span>
                  {nextSeoulToGlobal && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      {getMinutesUntil(nextSeoulToGlobal)}분 후 출발
                    </span>
                  )}
                </div>
                {renderTimeBadges(SHUTTLE_SCHEDULES.seoulToGlobal.times, nextSeoulToGlobal)}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-gray-400 dark:text-gray-500">{SHUTTLE_INFO.fare} · PAYCO 예약</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (isMobile) {
                    const fallbackTimer = setTimeout(() => {
                      window.open(SHUTTLE_INFO.ticketUrl, "_blank", "noopener,noreferrer");
                    }, 800);
                    window.location.href = SHUTTLE_INFO.ticketAppScheme;
                    const onBlur = () => { clearTimeout(fallbackTimer); window.removeEventListener("blur", onBlur); };
                    window.addEventListener("blur", onBlur);
                  } else {
                    window.open(SHUTTLE_INFO.ticketUrl, "_blank", "noopener,noreferrer");
                  }
                }}
                className="text-[#9B1B30] hover:text-[#7a1526]"
              >
                티켓구매 →
              </button>
              <a href={SHUTTLE_INFO.infoUrl} target="_blank" rel="noopener noreferrer" className="text-[#9B1B30] hover:text-[#7a1526]">
                상세정보 →
              </a>
            </div>
          </div>
        </>
      )}

      {/* 교내 광역버스 탭 */}
      {activeTab === "local" && (
        <div className="space-y-2">
          {/* 실시간 도착 정보 */}
          {busLoading ? (
            <div className="space-y-1.5">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
              ))}
            </div>
          ) : (busData.toCenter.length > 0 || busData.toGate.length > 0) ? (
            <>
              {/* 양방향 컴팩트 뷰 */}
              {renderBusDirection("🔼 정문 → 사색의광장", busData.toCenter, busExpanded)}
              {renderBusDirection("🔽 사색의광장 → 정문", busData.toGate, busExpanded)}

              {/* 더보기 / 접기 */}
              {(busData.toCenter.length > 3 || busData.toGate.length > 3) && (
                <button
                  onClick={() => setBusExpanded(!busExpanded)}
                  className="w-full rounded-lg bg-gray-50 py-1.5 text-[11px] text-gray-500 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  {busExpanded ? "접기 ▲" : `더보기 ▼ (${busData.toCenter.length + busData.toGate.length}개 노선)`}
                </button>
              )}

              {/* 새로고침 + 무료 안내 */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
                <span>🆓 교내 구간 무료 (카드 불필요)</span>
                <button
                  onClick={fetchBusArrivals}
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400"
                >
                  🔄 새로고침
                </button>
              </div>
            </>
          ) : (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                📍 {CAMPUS_BUSES.route}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CAMPUS_BUSES.buses.map((bus) => (
                  <span
                    key={bus}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      bus.startsWith("M")
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : bus.length >= 4
                          ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                          : "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
                    }`}
                  >
                    {bus}번
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">🆓 교내 구간 무료 (카드 불필요)</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
