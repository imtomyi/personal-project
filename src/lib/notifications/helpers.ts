import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { nowKST, todayKST } from "@/lib/date";

let vapidConfigured = false;

/**
 * Supabase client factory
 * Uses service role key to bypass RLS (all notification tables have RLS enabled)
 */
export function supabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key
  );
}

/**
 * Ensure VAPID details are configured for web push
 */
export function ensureVapid() {
  if (!vapidConfigured) {
    webpush.setVapidDetails(
      "mailto:noreply@khudo.app",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    vapidConfigured = true;
  }
}

// ─── Time Helpers ────────────────────────────────────────────────────

/**
 * Get current hour in KST
 */
export function nowKSTHour(): number {
  return nowKST().getHours();
}

/**
 * Get current minutes in KST (as offset from midnight)
 */
export function nowKSTMinutes(): number {
  const n = nowKST();
  return n.getHours() * 60 + n.getMinutes();
}

/**
 * Calculate days between two dates
 */
export function daysBetween(dateStr: string, today: string): number {
  const d1 = new Date(dateStr);
  const d2 = new Date(today);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a given hour is within quiet hours
 */
export function isInQuietHours(hour: number, quietStart: number, quietEnd: number): boolean {
  if (quietStart === quietEnd) return false; // same hour = no quiet period
  if (quietStart < quietEnd) {
    // Non-wrapping, e.g. 1-7 means quiet from 1:00 to 6:59
    return hour >= quietStart && hour < quietEnd;
  }
  // Wraps midnight, e.g. 23-7 means quiet from 23:00 to 6:59
  return hour >= quietStart || hour < quietEnd;
}

// ─── Smart Timing ────────────────────────────────────────────────────

/**
 * Get optimal send hours based on user activity patterns
 */
export async function getOptimalHours(userId: string): Promise<number[]> {
  const { data } = await supabase()
    .from("user_activity_log")
    .select("hour_of_day, day_of_week")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

  if (!data || data.length < 5) {
    return [9, 13, 20]; // defaults
  }

  const todayDow = new Date().getDay();
  const hourCounts = new Map<number, number>();

  for (const row of data) {
    const weight = row.day_of_week === todayDow ? 1.5 : 1;
    hourCounts.set(row.hour_of_day, (hourCounts.get(row.hour_of_day) || 0) + weight);
  }

  return [...hourCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour)
    .sort((a, b) => a - b);
}

// ─── Escalation ──────────────────────────────────────────────────────

/**
 * Get escalation level based on unclicked notifications
 */
export async function getEscalationLevel(userId: string, todoId: string | null, type: string): Promise<number> {
  if (!todoId) return 0;

  const { data } = await supabase()
    .from("notification_log")
    .select("id, clicked_at")
    .eq("user_id", userId)
    .eq("todo_id", todoId)
    .eq("type", type)
    .order("sent_at", { ascending: false })
    .limit(5);

  if (!data || data.length === 0) return 0;

  // Count consecutive unclicked notifications
  let ignored = 0;
  for (const log of data) {
    if (!log.clicked_at) ignored++;
    else break;
  }

  return Math.min(ignored, 4);
}

// ─── Send Push ───────────────────────────────────────────────────────

/**
 * Send push notification to user
 */
export async function sendPush(
  userId: string,
  type: string,
  level: number,
  title: string,
  body: string,
  todoId: string | null,
  url: string
) {
  // Log the notification
  const { data: logEntry } = await supabase()
    .from("notification_log")
    .insert({
      user_id: userId,
      todo_id: todoId,
      type,
      escalation_level: level,
      title,
      body,
    })
    .select("id")
    .single();

  // Get all subscriptions for this user
  const { data: subs } = await supabase()
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({
    title,
    body,
    tag: `${type}-${todoId || "general"}`,
    data: {
      url,
      notification_log_id: logEntry?.id,
      escalation_level: level,
    },
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
    } catch (err: unknown) {
      // 410 Gone or 404 = subscription expired
      if (err && typeof err === "object" && "statusCode" in err) {
        const statusCode = (err as { statusCode: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase().from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }
}

// ─── Rate Limiting ───────────────────────────────────────────────────

/**
 * Get count of notifications sent today
 */
export async function getTodaySentCount(userId: string): Promise<number> {
  const today = todayKST();
  const { count } = await supabase()
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("sent_at", `${today}T00:00:00+09:00`);
  return count || 0;
}

/**
 * Get timestamp of last sent notification
 */
export async function getLastSentTime(userId: string): Promise<Date | null> {
  const { data } = await supabase()
    .from("notification_log")
    .select("sent_at")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(1)
    .single();
  return data ? new Date(data.sent_at) : null;
}
