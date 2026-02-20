import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcalDate(dateStr: string): string {
  // "YYYY-MM-DD" → "YYYYMMDD" (all-day event VALUE=DATE format)
  return dateStr.replace(/-/g, "");
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase 설정이 누락되었습니다." },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: todos, error } = await supabase
    .from("todos")
    .select("*")
    .eq("workspace_id", workspaceId)
    .not("description", "eq", "__section_header__");

  if (error) {
    return NextResponse.json(
      { error: "할 일 목록을 불러올 수 없습니다." },
      { status: 500 },
    );
  }

  const now = new Date();
  const timestamp =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0") +
    "T" +
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0") +
    String(now.getUTCSeconds()).padStart(2, "0") +
    "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CollabTodo//CollabTodo//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Collab Todo`,
  ];

  for (const todo of todos ?? []) {
    if (!todo.due_date) continue;

    // duration_days is in hours (e.g. 24 = 1 day). Default to 24h (1 day).
    const durationHours: number = todo.duration_days || 24;
    const durationDays = Math.max(1, Math.ceil(durationHours / 24));

    const dtstart = toIcalDate(todo.due_date);
    // DTEND for all-day events is exclusive, so add durationDays
    const dtend = addDays(todo.due_date, durationDays);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${todo.id}@collab-todo`);
    lines.push(`DTSTAMP:${timestamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    lines.push(`DTEND;VALUE=DATE:${dtend}`);
    lines.push(`SUMMARY:${escapeIcal(todo.title)}`);
    if (todo.description && todo.description !== "__section_header__") {
      lines.push(`DESCRIPTION:${escapeIcal(todo.description)}`);
    }
    lines.push(`STATUS:${todo.is_completed ? "COMPLETED" : "NEEDS-ACTION"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const icsContent = lines.join("\r\n");

  return new Response(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="todos.ics"',
    },
  });
}
