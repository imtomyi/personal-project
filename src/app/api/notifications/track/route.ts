import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Track notification click/dismiss from service worker
    if (body.id && body.action) {
      const update =
        body.action === "click"
          ? { clicked_at: new Date().toISOString() }
          : { dismissed_at: new Date().toISOString() };

      await supabase
        .from("notification_log")
        .update(update)
        .eq("id", body.id);

      return NextResponse.json({ ok: true });
    }

    // Track user activity
    if (body.user_id && body.activity_action) {
      const now = new Date();
      await supabase.from("user_activity_log").insert({
        user_id: body.user_id,
        action: body.activity_action,
        hour_of_day: now.getHours(),
        day_of_week: now.getDay(),
        metadata: body.metadata || {},
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
