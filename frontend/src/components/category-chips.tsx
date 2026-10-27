"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { api, type Category } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function CategoryChips({
  value,
  onChange,
  onMutated,
}: {
  value: string;
  onChange: (cat: string) => void;
  onMutated?: () => void;
}) {
  const [cats, setCats] = useState<Category[] | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setCats(await api.get<Category[]>("/api/categories"));
    } catch {
      setCats([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["All", ...(cats ?? [])] as (string | Category)[]).map((item) => {
        const isAll = item === "All";
        const cat = isAll ? null : (item as Category);
        const name = isAll ? "All" : cat!.name;
        const active = name === value;
        return (
          <button
            key={isAll ? "all" : cat!.id}
            onClick={() => onChange(name)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-all",
              !isAll && `cat-${cat!.color_index}`,
              active
                ? "border-primary bg-primary text-on-primary shadow-warm-sm"
                : "text-ink-soft hover:brightness-105",
              !active && !isAll && "tint-btn",
              !active && isAll && "border-line bg-card hover:border-primary/50 hover:text-primary",
            )}
          >
            {name}
          </button>
        );
      })}
      <button
        onClick={() => setManageOpen(true)}
        aria-label="Manage categories"
        title="Manage categories"
        className="grid size-8 place-items-center rounded-full border border-line bg-card text-ink-soft transition-colors hover:border-primary/50 hover:text-primary"
      >
        <Settings2 className="size-4" />
      </button>
      {manageOpen && (
        <ManageCategories
          cats={cats ?? []}
          onClose={() => setManageOpen(false)}
          onChanged={load}
          onDeleted={(deletedName) => {
            if (value === deletedName) onChange("All");
          }}
          onMutated={onMutated}
        />
      )}
    </div>
  );
}

function ManageCategories({
  cats,
  onClose,
  onChanged,
  onDeleted,
  onMutated,
}: {
  cats: Category[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onDeleted: (name: string) => void;
  onMutated?: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function run(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      await onChanged();
      onMutated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  async function addCategory() {
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    await run(async () => {
      await api.post("/api/categories", { name });
      setNewName("");
    });
    setAdding(false);
    addRef.current?.focus();
  }

  async function saveRename() {
    if (editingId == null || savingEdit) return;
    const name = editName.trim();
    if (!name) return;
    setSavingEdit(true);
    await run(() => api.put(`/api/categories/${editingId}`, { name }));
    setSavingEdit(false);
    setEditingId(null);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const name = deleteTarget.name;
    await run(() => api.del(`/api/categories/${deleteTarget.id}`));
    setDeleting(false);
    setDeleteTarget(null);
    onDeleted(name);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Manage categories"
          className="w-full rounded-t-3xl border border-line bg-card p-5 shadow-warm sm:max-w-md sm:rounded-3xl sm:p-6"
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Manage categories</h2>
              <p className="mt-0.5 text-sm text-ink-soft">
                Add as many as you like — rename or remove anytime.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-card-soft"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              ref={addRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCategory();
                }
              }}
              placeholder="New category name..."
              className="min-w-0 flex-1 rounded-2xl border border-line bg-page px-4 py-2.5 text-sm outline-none placeholder:text-ink-soft focus:border-primary focus:ring-4 focus:ring-tomato/15"
            />
            <button
              onClick={addCategory}
              disabled={adding || !newName.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition-opacity disabled:opacity-50"
            >
              <Plus className="size-4" />
              Add
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-2xl border border-tomato/30 bg-tomato/10 px-3 py-2 text-sm font-medium text-tomato">
              {error}
            </p>
          )}

          <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto">
            {cats.map((c) => (
              <li
                key={c.id}
                className={`flex items-center gap-2 rounded-2xl px-2 py-1.5 ${
                  editingId === c.id ? "bg-card-soft" : ""
                }`}
              >
                <span className={cn("size-3 shrink-0 rounded-full", `cat-${c.color_index} chip-dot`)} />
                {editingId === c.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveRename();
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="min-w-0 flex-1 rounded-xl border border-line bg-page px-3 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <button
                      onClick={saveRename}
                      disabled={savingEdit || !editName.trim()}
                      aria-label={`Save ${c.name}`}
                      className="grid size-8 shrink-0 place-items-center rounded-xl text-leaf transition-colors hover:bg-leaf/10 disabled:opacity-40"
                    >
                      <Check className="size-4" strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel rename"
                      className="grid size-8 shrink-0 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-card-soft"
                    >
                      <X className="size-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                    <span className="shrink-0 text-xs text-ink-soft">
                      {c.recipe_count} {c.recipe_count === 1 ? "recipe" : "recipes"}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                      aria-label={`Rename ${c.name}`}
                      className="grid size-8 shrink-0 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-card-soft hover:text-primary"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      aria-label={`Delete ${c.name}`}
                      className="grid size-8 shrink-0 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-tomato/10 hover:text-tomato"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <ConfirmDialog
            open={deleteTarget != null}
            title={`Delete "${deleteTarget?.name ?? ""}"?`}
            body="Recipes stay — they just lose this label."
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
            busy={deleting}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
