import { SECTION_HEADER_MARKER } from "./types";
import { todayKST } from "./date";

export type TemplateId =
  | "daily-focus"
  | "semester-planner"
  | "weekly-planner"
  | "team-project";

export type TemplateItem = {
  title: string;
  isHeader: boolean;
};

export type Template = {
  id: TemplateId;
  name: string;
  description: string;
  icon: string;
  items: TemplateItem[];
};

export const TEMPLATES: Template[] = [
  {
    id: "daily-focus",
    name: "Daily Focus",
    description: "하루의 핵심 업무와 루틴을 관리합니다",
    icon: "🎯",
    items: [
      { title: "오늘의 핵심 3가지", isHeader: true },
      { title: "가장 중요한 일 1", isHeader: false },
      { title: "가장 중요한 일 2", isHeader: false },
      { title: "가장 중요한 일 3", isHeader: false },
      { title: "루틴", isHeader: true },
      { title: "아침 루틴", isHeader: false },
      { title: "점심 후 정리", isHeader: false },
      { title: "저녁 회고", isHeader: false },
      { title: "메모", isHeader: true },
      { title: "오늘 배운 것", isHeader: false },
      { title: "내일 할 것", isHeader: false },
    ],
  },
  {
    id: "semester-planner",
    name: "Semester Planner",
    description: "학기 전체를 계획하고 시험/과제를 관리합니다",
    icon: "📚",
    items: [
      { title: "과목 관리", isHeader: true },
      { title: "수강 과목 정리", isHeader: false },
      { title: "수강편람/실라버스 정리", isHeader: false },
      { title: "교재 구매/대여 확인", isHeader: false },
      { title: "중간고사 준비", isHeader: true },
      { title: "중간고사 범위 정리", isHeader: false },
      { title: "과목별 스터디 플랜 수립", isHeader: false },
      { title: "모의고사/기출 풀기", isHeader: false },
      { title: "기말고사 준비", isHeader: true },
      { title: "기말고사 범위 정리", isHeader: false },
      { title: "과목별 스터디 플랜 수립", isHeader: false },
      { title: "최종 정리노트 작성", isHeader: false },
      { title: "과제/프로젝트", isHeader: true },
      { title: "과제 제출 (마감일 기입)", isHeader: false },
      { title: "팀 프로젝트 역할 분담", isHeader: false },
      { title: "발표 자료 준비", isHeader: false },
    ],
  },
  {
    id: "weekly-planner",
    name: "Weekly Planner",
    description: "주간 목표와 습관을 체계적으로 관리합니다",
    icon: "📅",
    items: [
      { title: "이번 주 목표", isHeader: true },
      { title: "주간 핵심 목표 1", isHeader: false },
      { title: "주간 핵심 목표 2", isHeader: false },
      { title: "주간 핵심 목표 3", isHeader: false },
      { title: "월요일 ~ 금요일", isHeader: true },
      { title: "오늘의 목표 설정", isHeader: false },
      { title: "핵심 과제", isHeader: false },
      { title: "습관 트래커", isHeader: true },
      { title: "운동 30분", isHeader: false },
      { title: "독서 20분", isHeader: false },
      { title: "영어 공부", isHeader: false },
      { title: "주간 회고", isHeader: true },
      { title: "이번 주 잘한 점", isHeader: false },
      { title: "다음 주 개선할 점", isHeader: false },
    ],
  },
  {
    id: "team-project",
    name: "Team Project",
    description: "팀 프로젝트를 단계별로 관리하고 협업합니다",
    icon: "👥",
    items: [
      { title: "기획 단계", isHeader: true },
      { title: "주제 선정 및 브레인스토밍", isHeader: false },
      { title: "역할 분담", isHeader: false },
      { title: "일정표 작성", isHeader: false },
      { title: "참고 자료 조사", isHeader: false },
      { title: "실행 단계", isHeader: true },
      { title: "초안 작성", isHeader: false },
      { title: "1차 피드백 및 수정", isHeader: false },
      { title: "2차 피드백 및 수정", isHeader: false },
      { title: "최종본 완성", isHeader: false },
      { title: "발표 준비", isHeader: true },
      { title: "PPT/자료 제작", isHeader: false },
      { title: "발표 리허설", isHeader: false },
      { title: "Q&A 예상 질문 준비", isHeader: false },
      { title: "제출", isHeader: true },
      { title: "최종 보고서 제출", isHeader: false },
      { title: "발표 자료 제출", isHeader: false },
      { title: "팀 활동 보고서 작성", isHeader: false },
    ],
  },
];

export const DEFAULT_TEMPLATE_ID: TemplateId | null = null;

export function getTemplateById(id: TemplateId): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function buildTemplateTodos(
  templateId: TemplateId,
  workspaceId: string,
  userId: string,
  startOrder: number,
  /** 시작일 (기본값: 오늘 KST) */
  dueDate?: string,
) {
  const template = getTemplateById(templateId);
  if (!template) return [];

  const todayStr = dueDate || todayKST();

  return template.items.map((item, index) => ({
    workspace_id: workspaceId,
    title: item.title,
    description: item.isHeader ? SECTION_HEADER_MARKER : null,
    created_by: userId,
    due_date: item.isHeader ? null : todayStr,
    duration_days: 24, // 시간 단위 (24 = 1일)
    sort_order: startOrder + index,
  }));
}
