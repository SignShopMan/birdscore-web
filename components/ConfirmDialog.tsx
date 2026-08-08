"use client";

import { Modal } from "./Modal";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Never mind",
  onConfirm,
  onCancel,
  danger = false,
  confirming = false,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  confirming?: boolean;
}) {
  return (
    <Modal
      onClose={onCancel}
      labelledBy="confirm-dialog-title"
      panelClassName="w-full max-w-sm rounded-t-card bg-paper p-5 shadow-card sm:rounded-card"
    >
      <h2 id="confirm-dialog-title" className="font-display text-lg font-semibold text-ink">
        {title}
      </h2>
      <p className="mt-1 font-body text-sm text-ink/70">{message}</p>
      <div className="mt-5 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-full py-2.5 font-body text-sm font-semibold text-ink ring-1 ring-ink/20"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={confirming}
          className={`flex-1 rounded-full py-2.5 font-body text-sm font-semibold text-white disabled:opacity-50 ${
            danger ? "bg-trump-red" : "bg-ink"
          }`}
        >
          {confirming ? "Working\u2026" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
