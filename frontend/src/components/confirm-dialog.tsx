"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  busy = false,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, y: 14 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-line bg-card p-6 shadow-warm"
            role="dialog"
            aria-modal="true"
          >
            <span className="mb-3 grid size-11 place-items-center rounded-full bg-tomato/15 text-tomato">
              <TriangleAlert className="size-5" />
            </span>
            <h2 className="font-display text-lg font-bold">{title}</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{body}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className="rounded-full bg-tomato px-4 py-2 text-sm font-bold text-white shadow-warm-sm disabled:opacity-60"
              >
                {busy ? "Deleting..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
