"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Workspace } from "@/lib/types";
import { buildTemplateTodos, type TemplateId } from "@/lib/templates";
import { todayKST } from "@/lib/date";
import { WORKSPACE_COLOR_KEYS, WORKSPACE_COLOR_MAP, type WorkspaceColorKey } from "@/hooks/useAllWorkspaceTodos";
import TemplateSelector from "./TemplateSelector";
import DatePicker from "./DatePicker";

/** 사용 중인 색상을 피해 다음 미사용 색상을 반환 (모두 사용 시 순환) */
function pickNextColor(usedColors: string[]): WorkspaceColorKey {
  const usedSet = new Set(usedColors);
  const available = WORKSPACE_COLOR_KEYS.find((k) => !usedSet.has(k));
  return available ?? WORKSPACE_COLOR_KEYS[usedColors.length % WORKSPACE_COLOR_KEYS.length];
}

type CreateWorkspaceProps = {
  onCreated: (workspace: Workspace) => void;
  /** 이미 사용 중인 색상 목록 — 자동으로 미사용 색상을 기본 선택 */
  usedColors?: string[];
};

export default function CreateWorkspace({ onCreated, usedColors = [] }: CreateWorkspaceProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState<WorkspaceColorKey>(() => pickNextColor(usedColors));
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [dueDate, setDueDate] = useState(todayKST());
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);
    try {
      // Create workspace
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          color: selectedColor,
          created_by: user.id,
        })
        .select()
        .single();

      if (wsError) throw wsError;

      // Add creator as owner
      const { error: memberError } = await supabase.from("members").insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
      });

      if (memberError) throw memberError;

      // Apply template if selected
      if (selectedTemplate) {
        const todosToInsert = buildTemplateTodos(
          selectedTemplate,
          workspace.id,
          user.id,
          0,
          dueDate,
        );
        if (todosToInsert.length > 0) {
          await supabase.from("todos").insert(todosToInsert);
        }
      }

      setName("");
      setDescription("");
      setSelectedColor(pickNextColor([...usedColors, selectedColor]));
      setSelectedTemplate(null);
      setDueDate(todayKST());
      setIsOpen(false);
      onCreated(workspace as Workspace);
    } catch (err) {
      console.error("Failed to create workspace:", JSON.stringify(err, null, 2));
    }
    setLoading(false);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setSelectedColor(pickNextColor(usedColors));
          setIsOpen(true);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/10 p-6 text-secondary transition-all hover:border-blue-400 hover:text-blue-500 active:scale-[0.98] dark:border-white/10 dark:hover:border-blue-500 dark:hover:text-blue-400"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        새 워크스페이스
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-surface p-6"
    >
      <h3 className="mb-4 text-[17px] font-semibold text-foreground dark:text-white">
        새 워크스페이스
      </h3>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="워크스페이스 이름"
          className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:text-white"
          autoFocus
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명 (선택)"
          rows={2}
          className="w-full resize-none rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:text-gray-300"
        />
        {/* 색상 선택 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">색상</label>
          <div className="flex flex-wrap gap-2">
            {WORKSPACE_COLOR_KEYS.map((key) => {
              const c = WORKSPACE_COLOR_MAP[key];
              const isSelected = selectedColor === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedColor(key)}
                  className={`h-7 w-7 rounded-full transition-all ${c.dot} ${
                    isSelected
                      ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-gray-400 scale-110"
                      : "hover:scale-110 opacity-70 hover:opacity-100"
                  }`}
                  title={key}
                />
              );
            })}
          </div>
        </div>

        <TemplateSelector
          selectedId={selectedTemplate}
          onSelect={setSelectedTemplate}
          mode="create"
        />

        {/* 시작일 — 커스텀 DatePicker */}
        {selectedTemplate && (
          <DatePicker value={dueDate} onChange={setDueDate} />
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-full px-4 py-2 text-[13px] font-medium text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="rounded-full bg-[#1d1d1f] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#1d1d1f]/90 disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {loading ? "생성 중..." : "생성"}
        </button>
      </div>
    </form>
  );
}
