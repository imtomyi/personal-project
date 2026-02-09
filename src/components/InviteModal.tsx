"use client";

import { useState } from "react";

type InviteModalProps = {
  inviteCode: string;
  onClose: () => void;
};

export default function InviteModal({ inviteCode, onClose }: InviteModalProps) {
  const [copied, setCopied] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${inviteCode}`
      : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Invite Members
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Share this link with others to invite them to your workspace.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={inviteUrl}
            readOnly
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          />
          <button
            onClick={handleCopy}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
