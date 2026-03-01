import { NextResponse } from "next/server";
import { todayKST } from "@/lib/date";
import { getNotificationMessage } from "@/lib/notificationTemplates";
import {
  supabase,
  ensureVapid,
  nowKSTHour,
  nowKSTMinutes,
  daysBetween,
  isInQuietHours,
  getOptimalHours,
  getEscalationLevel,
  sendPush,
  getTodaySentCount,
  getLastSentTime,
} from "@/lib/notifications/helpers";

export async function GET(request: Request) {
  try {
    ensureVapid();
  } catch (err) {
    console.error("[Notif] VAPID config error:", err);
    return NextResponse.json({ error: "VAPID configuration failed", detail: String(err) }, { status: 500 });
  }

  // Verify cron secret if set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
  const today = todayKST();
  const currentHour = nowKSTHour();
  const currentMin = nowKSTMinutes();
  let sent = 0;
  let skipped = 0;

  // Get all users with push subscriptions
  const { data: subscribers } = await supabase()
    .from("push_subscriptions")
    .select("user_id")
    .limit(500);

  if (!subscribers) {
    return NextResponse.json({ sent: 0, message: "No subscribers" });
  }

  const userIds = [...new Set(subscribers.map((s) => s.user_id))];

  for (const userId of userIds) {
    let userSent = 0; // Per-user sent counter for rate limiting

    // Load preferences
    const { data: prefs } = await supabase()
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    const preferences = prefs || {
      enabled: true,
      quiet_start: 23,
      quiet_end: 7,
      max_per_day: 5,
      due_reminder: true,
      overdue_reminder: true,
      habit_reminder: true,
      daily_plan_reminder: true,
      exercise_reminder: true,
      dday_reminder: true,
      goal_reminder: true,
    };

    if (!preferences.enabled) {
      skipped++;
      continue;
    }

    // Quiet hours check
    if (isInQuietHours(currentHour, preferences.quiet_start, preferences.quiet_end)) {
      skipped++;
      continue;
    }

    // Rate limit check
    const todayCount = await getTodaySentCount(userId);
    if (todayCount >= preferences.max_per_day) {
      skipped++;
      continue;
    }

    // Throttle: at least 15 min between notifications
    const lastSent = await getLastSentTime(userId);
    if (lastSent && Date.now() - lastSent.getTime() < 15 * 60 * 1000) {
      skipped++;
      continue;
    }

    // Get optimal send hours for this user
    const optimalHours = await getOptimalHours(userId);

    // ─── Trigger 1: Due Reminder (마감 30분 전) ──────────────────
    // NOTE: Disabled — todos table has no due_time column yet.
    // To enable: add `due_time time` column to todos table, then uncomment.

    // ─── Trigger 2: Overdue (마감 지난 할 일) ────────────────────

    if (preferences.overdue_reminder && todayCount + userSent < preferences.max_per_day) {
      // Only send overdue at optimal hours
      if (optimalHours.some((h) => Math.abs(h - currentHour) <= 1)) {
        const { data: overdueTodos } = await supabase()
          .from("todos")
          .select("id, title, due_date, workspace_id")
          .eq("is_completed", false)
          .lt("due_date", today)
          .or("description.is.null,description.neq.__section_header__")
          .not("due_date", "is", null)
          .order("due_date", { ascending: true })
          .limit(3);

        if (overdueTodos) {
          for (const todo of overdueTodos) {
            const { data: membership } = await supabase()
              .from("members")
              .select("user_id")
              .eq("workspace_id", todo.workspace_id)
              .eq("user_id", userId)
              .single();

            if (!membership) continue;

            const days = daysBetween(todo.due_date!, today);

            // Check last notification for this todo
            const { data: lastNotif } = await supabase()
              .from("notification_log")
              .select("sent_at")
              .eq("user_id", userId)
              .eq("todo_id", todo.id)
              .eq("type", "overdue")
              .order("sent_at", { ascending: false })
              .limit(1)
              .single();

            // Cooldown: don't send overdue for same todo within 6 hours
            if (lastNotif && Date.now() - new Date(lastNotif.sent_at).getTime() < 6 * 60 * 60 * 1000) {
              continue;
            }

            const level = await getEscalationLevel(userId, todo.id, "overdue");
            const msg = getNotificationMessage("overdue", level, { title: todo.title, days });
            await sendPush(userId, "overdue", level, msg.title, msg.body, todo.id, `/workspace`);
            sent++; userSent++;
            break;
          }
        }
      }
    }

    // ─── Trigger 3: Habit (습관 체크) ────────────────────────────

    if (preferences.habit_reminder && todayCount + userSent < preferences.max_per_day) {
      // Send habit reminders in the evening (after 18:00 or at optimal time)
      const isHabitTime = currentHour >= 18 || optimalHours.includes(currentHour);

      if (isHabitTime) {
        // Check if already sent habit reminder today
        const { count: habitSent } = await supabase()
          .from("notification_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "habit")
          .gte("sent_at", `${today}T00:00:00+09:00`);

        if ((habitSent || 0) === 0) {
          const { data: habits } = await supabase()
            .from("habits")
            .select("id")
            .eq("user_id", userId)
            .eq("is_active", true);

          const { data: todayLogs } = await supabase()
            .from("habit_logs")
            .select("habit_id")
            .eq("user_id", userId)
            .eq("date", today);

          if (habits && habits.length > 0) {
            const loggedIds = new Set((todayLogs || []).map((l) => l.habit_id));
            const unchecked = habits.filter((h) => !loggedIds.has(h.id));

            if (unchecked.length > 0) {
              // Calculate streak - batch query instead of N sequential queries
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              const { data: recentLogs } = await supabase()
                .from("habit_logs")
                .select("date")
                .eq("user_id", userId)
                .gte("date", thirtyDaysAgo.toISOString().slice(0, 10))
                .order("date", { ascending: false });

              const loggedDates = new Set((recentLogs || []).map((l) => l.date));
              let streak = 0;
              for (let i = 1; i <= 30; i++) {
                // Use KST date for consistency with the rest of the code
                const d = new Date(Date.now() + 9 * 60 * 60 * 1000 - i * 24 * 60 * 60 * 1000);
                const dateStr = d.toISOString().slice(0, 10);
                if (loggedDates.has(dateStr)) streak++;
                else break;
              }

              const level = await getEscalationLevel(userId, null, "habit");
              const msg = getNotificationMessage("habit", level, {
                count: unchecked.length,
                streak,
              });
              await sendPush(userId, "habit", level, msg.title, msg.body, null, `/workspace`);
              sent++; userSent++;
            }
          }
        }
      }
    }

    // ─── Trigger 4: Daily Plan (오늘 할 일) ──────────────────────

    if (preferences.daily_plan_reminder && todayCount + userSent < preferences.max_per_day) {
      // Morning reminder (8-10) or mid-day (12-14)
      const isDailyPlanTime =
        (currentHour >= 8 && currentHour <= 10) ||
        (currentHour >= 12 && currentHour <= 14) ||
        (currentHour >= 19 && currentHour <= 21);

      if (isDailyPlanTime) {
        const { count: planSent } = await supabase()
          .from("notification_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "daily_plan")
          .gte("sent_at", `${today}T00:00:00+09:00`);

        // Max 2 daily plan reminders per day
        if ((planSent || 0) < 2) {
          const { data: plans } = await supabase()
            .from("daily_plans")
            .select("id, todo_id, is_skipped")
            .eq("user_id", userId)
            .eq("date", today)
            .eq("is_skipped", false);

          if (plans && plans.length > 0) {
            const todoIds = plans.map((p) => p.todo_id);
            const { data: todos } = await supabase()
              .from("todos")
              .select("id, is_completed")
              .in("id", todoIds);

            const total = plans.length;
            const done = (todos || []).filter((t) => t.is_completed).length;
            const remaining = total - done;

            if (remaining > 0) {
              // Use different escalation for morning vs evening
              const level = currentHour >= 19 ? Math.min((planSent || 0) + 2, 4) : planSent || 0;
              const msg = getNotificationMessage("daily_plan", level, {
                count: total,
                done,
                remaining,
              });
              await sendPush(userId, "daily_plan", level, msg.title, msg.body, null, `/workspace`);
              sent++; userSent++;
            }
          }
        }
      }
    }

    // ─── Trigger 5: Exercise (운동 리마인더) ─────────────────────

    if (preferences.exercise_reminder !== false && todayCount + userSent < preferences.max_per_day) {
      // Send exercise reminder in the afternoon/evening (16-21)
      const isExerciseTime = currentHour >= 16 && currentHour <= 21;

      if (isExerciseTime) {
        // Check if already sent exercise reminder today
        const { count: exerciseSent } = await supabase()
          .from("notification_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "exercise")
          .gte("sent_at", `${today}T00:00:00+09:00`);

        if ((exerciseSent || 0) === 0) {
          // Check if user has exercise_sessions table data (active exerciser)
          const { data: recentExercise } = await supabase()
            .from("exercise_sessions")
            .select("id, date, duration_min")
            .eq("user_id", userId)
            .order("date", { ascending: false })
            .limit(10);

          // Only send if user has ever logged exercise (active user)
          if (recentExercise && recentExercise.length > 0) {
            const todaySession = recentExercise.find((e) => e.date === today);

            if (!todaySession) {
              // Calculate exercise streak
              let exerciseStreak = 0;
              const exerciseDates = new Set(recentExercise.map((e) => e.date));
              for (let i = 1; i <= 30; i++) {
                const d = new Date(Date.now() + 9 * 60 * 60 * 1000 - i * 24 * 60 * 60 * 1000);
                const dateStr = d.toISOString().slice(0, 10);
                if (exerciseDates.has(dateStr)) exerciseStreak++;
                else break;
              }

              // Days since last exercise
              const lastExDate = recentExercise[0].date;
              const daysSince = daysBetween(lastExDate, today);
              const lastDuration = recentExercise[0].duration_min;

              const level = daysSince >= 3 ? Math.min(daysSince - 1, 4) : exerciseStreak > 0 ? 2 : 0;
              const msg = getNotificationMessage("exercise", level, {
                count: lastDuration,
                streak: exerciseStreak,
                days: daysSince,
              });
              await sendPush(userId, "exercise", level, msg.title, msg.body, null, `/workspace`);
              sent++; userSent++;
            }
          }
        }
      }
    }

    // ─── Trigger 6: D-day (디데이 리마인더) ──────────────────────

    if (preferences.dday_reminder !== false && todayCount + userSent < preferences.max_per_day) {
      // Send D-day reminders in the morning (8-10)
      const isDdayTime = currentHour >= 8 && currentHour <= 10;

      if (isDdayTime) {
        // Check if already sent dday reminder today
        const { count: ddaySent } = await supabase()
          .from("notification_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "dday")
          .gte("sent_at", `${today}T00:00:00+09:00`);

        if ((ddaySent || 0) === 0) {
          const { data: ddayEntries } = await supabase()
            .from("dday_entries")
            .select("id, title, date, emoji")
            .eq("user_id", userId)
            .order("date", { ascending: true });

          if (ddayEntries && ddayEntries.length > 0) {
            // Find entries worth notifying: D-0, D-1, D-3, D-7, D-14, D-30
            const notifyDays = [0, 1, 3, 7, 14, 30];
            for (const entry of ddayEntries) {
              const daysUntil = daysBetween(today, entry.date); // positive = future
              if (notifyDays.includes(daysUntil)) {
                // D-day or upcoming
                const level = daysUntil === 0 ? 3 : daysUntil === 1 ? 2 : daysUntil <= 3 ? 1 : 0;
                const msg = getNotificationMessage("dday", level, {
                  title: entry.title,
                  days: daysUntil,
                });
                await sendPush(userId, "dday", level, msg.title, msg.body, null, `/workspace`);
                sent++; userSent++;
                break; // One D-day notification per day
              }
              // Also notify D+1 (just passed)
              const daysPast = daysBetween(entry.date, today);
              if (daysPast === 1) {
                const msg = getNotificationMessage("dday", 4, {
                  title: entry.title,
                  days: daysPast,
                });
                await sendPush(userId, "dday", 4, msg.title, msg.body, null, `/workspace`);
                sent++; userSent++;
                break;
              }
            }
          }
        }
      }
    }

    // ─── Trigger 7: Goal (목표 진행률 리마인더) ──────────────────

    if (preferences.goal_reminder !== false && todayCount + userSent < preferences.max_per_day) {
      // Send goal reminders once a week (or at optimal hours on weekends)
      const dayOfWeek = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDay();
      const isGoalTime = (dayOfWeek === 0 || dayOfWeek === 6) && currentHour >= 10 && currentHour <= 14;

      if (isGoalTime) {
        // Check if sent goal reminder this week
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: goalSent } = await supabase()
          .from("notification_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "goal")
          .gte("sent_at", weekAgo);

        if ((goalSent || 0) === 0) {
          const { data: goals } = await supabase()
            .from("goals")
            .select("id, title, emoji, progress, status")
            .eq("user_id", userId)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(3);

          if (goals && goals.length > 0) {
            // Pick the goal with most progress to motivate
            const goal = goals.sort((a, b) => b.progress - a.progress)[0];
            const level = goal.progress >= 80 ? 4 : goal.progress >= 50 ? 2 : goal.progress > 0 ? 0 : 3;
            const msg = getNotificationMessage("goal", level, {
              title: goal.title,
              count: goal.progress,
            });
            await sendPush(userId, "goal", level, msg.title, msg.body, null, `/workspace`);
            sent++; userSent++;
          }
        }
      }
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    users: userIds.length,
    timestamp: new Date().toISOString(),
  });
  } catch (err) {
    console.error("[Notif] Process error:", err);
    return NextResponse.json({ error: "Processing failed", detail: String(err) }, { status: 500 });
  }
}
