import { NextResponse } from "next/server";

export const runtime = "edge";

// Simple ICS VEVENT parser
type IcsEvent = {
  uid: string;
  summary: string;
  dtstart: string;      // ISO or date string
  dtend: string | null;
  location: string | null;
  description: string | null;
  allDay: boolean;
  rrule: string | null;  // raw RRULE if present
};

function unfoldLines(raw: string): string[] {
  // ICS spec: lines starting with space/tab are continuations
  return raw
    .replace(/\r\n[ \t]/g, "")
    .replace(/\r/g, "")
    .split("\n");
}

function parseIcsDate(value: string): { iso: string; allDay: boolean } {
  // VALUE=DATE:20260331 or 20260331T090000Z or 20260331T090000
  const clean = value.replace(/^.*:/, ""); // remove any prefix like VALUE=DATE:
  if (clean.length === 8) {
    // All-day: YYYYMMDD
    const y = clean.slice(0, 4);
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    return { iso: `${y}-${m}-${d}`, allDay: true };
  }
  // DateTime: YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ
  const y = clean.slice(0, 4);
  const m = clean.slice(4, 6);
  const d = clean.slice(6, 8);
  const hh = clean.slice(9, 11);
  const mm = clean.slice(11, 13);
  const ss = clean.slice(13, 15);
  const tz = clean.endsWith("Z") ? "Z" : "";
  return { iso: `${y}-${m}-${d}T${hh}:${mm}:${ss}${tz}`, allDay: false };
}

function parseIcs(raw: string): IcsEvent[] {
  const lines = unfoldLines(raw);
  const events: IcsEvent[] = [];
  let current: Partial<IcsEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.summary) {
        events.push({
          uid: current.uid || crypto.randomUUID(),
          summary: current.summary,
          dtstart: current.dtstart || "",
          dtend: current.dtend || null,
          location: current.location || null,
          description: current.description || null,
          allDay: current.allDay ?? true,
          rrule: current.rrule || null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    // Parse property
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const propPart = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);

    const propName = propPart.split(";")[0].toUpperCase();

    switch (propName) {
      case "UID":
        current.uid = value;
        break;
      case "SUMMARY":
        current.summary = value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";");
        break;
      case "DTSTART": {
        const parsed = parseIcsDate(value);
        current.dtstart = parsed.iso;
        current.allDay = parsed.allDay;
        break;
      }
      case "DTEND": {
        const parsed = parseIcsDate(value);
        current.dtend = parsed.iso;
        break;
      }
      case "LOCATION":
        current.location = value.replace(/\\n/g, "\n").replace(/\\,/g, ",");
        break;
      case "DESCRIPTION":
        current.description = value.replace(/\\n/g, "\n").replace(/\\,/g, ",");
        break;
      case "RRULE":
        current.rrule = value;
        break;
    }
  }

  return events;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const feedUrl = searchParams.get("url");

  if (!feedUrl) {
    return NextResponse.json(
      { error: "url 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  // Validate URL
  try {
    new URL(feedUrl);
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 URL입니다." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": "KHUDO-Calendar/1.0",
        Accept: "text/calendar, */*",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `피드 가져오기 실패: ${response.status}` },
        { status: 502 },
      );
    }

    const text = await response.text();

    if (!text.includes("BEGIN:VCALENDAR")) {
      return NextResponse.json(
        { error: "유효한 ICS 캘린더 피드가 아닙니다." },
        { status: 422 },
      );
    }

    const events = parseIcs(text);

    return NextResponse.json({
      events,
      count: events.length,
      fetchedAt: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: `피드 가져오기 오류: ${message}` },
      { status: 500 },
    );
  }
}
