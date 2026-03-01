// ─── 5-Level Escalating Notification Templates (Korean) ────────────

type TemplateParams = {
  title?: string;
  count?: number;
  done?: number;
  remaining?: number;
  days?: number;
  streak?: number;
};

type Template = {
  title: string;
  body: string;
};

function t(title: string, body: string): Template {
  return { title, body };
}

function fill(template: Template, params: TemplateParams): Template {
  let { title, body } = template;
  for (const [key, val] of Object.entries(params)) {
    const placeholder = `{${key}}`;
    title = title.replaceAll(placeholder, String(val ?? ""));
    body = body.replaceAll(placeholder, String(val ?? ""));
  }
  return { title, body };
}

// ─── Due Reminder (마감 알림) ────────────────────────────────────────

const DUE_REMINDER: Template[] = [
  t("📋 할 일 알림", '"{title}" 마감이 30분 남았어요'),
  t("⏰ 곧 마감!", '"{title}" 잊지 않으셨죠? 30분 남았습니다'),
  t("🔥 마감 임박", '"{title}" 아직 시작도 안 하셨어요! 지금 바로 확인하세요'),
  t("🚨 마감 직전!", '"{title}" 진짜 얼마 안 남았어요... 지금 안 하면 놓칩니다 😰'),
  t("💀 마지막 기회", '"{title}" 이거 정말 안 하실 건가요? 마감이 코앞이에요!'),
];

// ─── Overdue (지난 할 일) ────────────────────────────────────────────

const OVERDUE: Template[] = [
  t("📌 밀린 할 일", '"{title}" 마감이 지났어요. 확인해주세요'),
  t("😅 깜빡하셨나요?", '"{title}" 어제까지였는데... 지금이라도 해볼까요?'),
  t("😤 아직도 안 하셨어요?", '"{title}" {days}일째 미뤄지고 있어요. 오늘은 꼭!'),
  t("😱 {days}일째 방치 중", '"{title}" 이러다 영영 안 하실 것 같아서 걱정돼요...'),
  t("🪦 이 할 일의 무덤", '"{title}"이(가) {days}일째 잠들어 있어요. 깨워주실 건가요, 아니면 보내주실 건가요?'),
];

// ─── Habit (습관) ────────────────────────────────────────────────────

const HABIT: Template[] = [
  t("💪 오늘의 습관", "아직 체크 안 한 습관이 {count}개 있어요"),
  t("🔥 연속 기록 지키기", "{streak}일 연속 기록 중! 오늘도 이어가세요"),
  t("😢 연속 기록 위험!", "{streak}일 연속 기록이 오늘 끊길 수 있어요..."),
  t("💔 습관이 울고 있어요", "오늘 하루만 빼먹으면 {streak}일 기록이 사라져요ㅠㅠ"),
  t("🥺 정말 포기하시는 건가요?", "{streak}일 동안 쌓아온 노력이 아까워요... 딱 하나만이라도요!"),
];

// ─── Daily Plan (데일리 플랜) ────────────────────────────────────────

const DAILY_PLAN: Template[] = [
  t("📅 오늘 할 일", "오늘 {count}개의 할 일이 예정되어 있어요"),
  t("☀️ 좋은 아침!", "오늘 할 일 {count}개, 확인하고 시작해볼까요?"),
  t("🏃 아직 0개 완료", "오늘 {count}개 중 아직 하나도 못 했어요. 지금 시작하면 충분해요!"),
  t("😰 하루가 절반 지났어요", "{count}개 중 {done}개만 완료... 남은 시간 파이팅!"),
  t("🌙 오늘이 끝나가요", "아직 {remaining}개 남았는데... 내일로 미루지 말고 지금!"),
];

// ─── Exercise (운동) ─────────────────────────────────────────────────

const EXERCISE: Template[] = [
  t("🏃 오늘 운동은?", "오늘도 러닝 완료하셨나요? 몸을 움직여보세요!"),
  t("💪 운동 시간이에요", "어제 {count}분 운동했어요. 오늘도 이어가볼까요?"),
  t("🔥 운동 연속 기록", "{streak}일 연속 운동 중! 오늘도 한 세트 해요"),
  t("😴 운동 안 한 지 오래됐어요", "{days}일째 운동 기록이 없어요... 가벼운 스트레칭이라도!"),
  t("🥺 몸이 굳어가요", "{days}일째 운동 없이 지나가고 있어요. 5분만이라도 움직여봐요!"),
];

// ─── D-day (디데이) ──────────────────────────────────────────────────

const DDAY: Template[] = [
  t("📌 D-day 알림", '"{title}" D-{days}! 준비는 잘 되고 있나요?'),
  t("⏳ 곧 다가와요", '"{title}"까지 {days}일 남았어요. 계획 점검해보세요!'),
  t("🔔 내일이에요!", '"{title}" 내일입니다! 마지막 준비 하셨나요?'),
  t("🎉 오늘이에요!", '"{title}" 바로 오늘! 준비한 만큼 잘 해내세요 💪'),
  t("📅 D-day 지남", '"{title}" D+{days}일 — 어떻게 됐나요? 결과를 기록해보세요'),
];

// ─── Goal (목표) ─────────────────────────────────────────────────────

const GOAL: Template[] = [
  t("🎯 목표 체크", '"{title}" 진행률이 {count}%예요. 조금만 더!'),
  t("📈 목표 점검 시간", '"{title}" 얼마나 진행됐나요? 한 번 확인해보세요'),
  t("🚀 목표를 향해!", '"{title}" {count}% 달성! 끝까지 화이팅!'),
  t("💡 목표 잊지 마세요", '"{title}" 최근 업데이트가 없어요. 오늘 한 걸음 나아가볼까요?'),
  t("🏆 거의 다 왔어요", '"{title}" {count}%까지 왔어요! 조금만 더 하면 완료!'),
];

// ─── Template Map ────────────────────────────────────────────────────

const TEMPLATES: Record<string, Template[]> = {
  due_reminder: DUE_REMINDER,
  overdue: OVERDUE,
  habit: HABIT,
  daily_plan: DAILY_PLAN,
  exercise: EXERCISE,
  dday: DDAY,
  goal: GOAL,
};

export function getNotificationMessage(
  type: string,
  level: number,
  params: TemplateParams = {}
): Template {
  const templates = TEMPLATES[type] || DUE_REMINDER;
  const clampedLevel = Math.min(Math.max(level, 0), templates.length - 1);
  return fill(templates[clampedLevel], params);
}

export type { TemplateParams, Template };
