"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Cookie,
  Coffee,
  Plus,
  ShoppingBasket,
  Soup,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import { api, type MenuEntry, type Recipe } from "@/lib/api";
import {
  addDays,
  dayName,
  isoDate,
  shortDate,
  SLOTS,
  startOfWeek,
  todayISO,
  weekDates,
  weekRangeLabel,
} from "@/lib/kitchen";
import { ErrorNote, PageHeader, Spinner } from "@/components/ui";

const SLOT_ICONS = {
  breakfast: Coffee,
  lunch: UtensilsCrossed,
  snacks: Cookie,
  dinner: Soup,
} as const;

type Editing = { date: string; slot: string };

export default function MenuPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [entries, setEntries] = useState<Map<string, MenuEntry> | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      const list = await api.get<MenuEntry[]>("/api/menu");
      setEntries(new Map(list.map((e) => [`${e.date}|${e.slot}`, e])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load menu");
    }
  }, []);

  useEffect(() => {
    loadEntries();
    api
      .get<Recipe[]>("/api/recipes")
      .then(setRecipes)
      .catch(() => {});
  }, [loadEntries]);

  const days = useMemo(() => weekDates(weekStart), [weekStart]);
  const today = todayISO();
  const isCurrentWeek = isThisWeek(weekStart);
  const weekLabel = isCurrentWeek
    ? `This week · ${weekRangeLabel(days)}`
    : weekRangeLabel(days);


  const key = (date: string, slot: string) => `${date}|${slot}`;

  const entryFor = (date: string, slot: string): MenuEntry | undefined => entries?.get(key(date, slot));

  function labelFor(entry?: MenuEntry): { main: string; custom: boolean } | null {
    if (!entry) return null;
    if (entry.recipe_id) {
      const r = recipes.find((x) => x.id === entry.recipe_id);
      return r ? { main: r.title, custom: false } : null;
    }
    if (entry.custom_text.trim()) return { main: entry.custom_text, custom: true };
    return null;
  }

  async function handleSave(date: string, slot: string, recipeId: number | null, text: string) {
    await api.post("/api/menu", {
      date,
      slot,
      recipe_id: recipeId,
      custom_text: recipeId ? "" : text,
    });
    await loadEntries();
  }

  async function handleClear(entry: MenuEntry) {
    await api.del(`/api/menu/${entry.id}`);
    await loadEntries();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader title="Aaj Kya Banau?" hindi="Poore hafte ka plan, ek nazar mein.">
        <Link
          href="/shopping"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-semibold shadow-warm-sm transition-colors hover:border-leaf hover:text-leaf"
        >
          <ShoppingBasket className="size-4" />
          Bazaar list
        </Link>
      </PageHeader>

      {/* Week navigation */}
      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-2 shadow-warm-sm">
        <button
          onClick={() => setWeekStart((w) => addDays(w, -7))}
          aria-label="Previous week"
          className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-card-soft hover:text-primary"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <p className="font-display font-bold">{weekLabel}</p>
          {!isThisWeek(weekStart) && (
            <button
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Jump to this week
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekStart((w) => addDays(w, 7))}
          aria-label="Next week"
          className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-card-soft hover:text-primary"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {error && <ErrorNote message={error} />}
      {!entries && !error && <Spinner label="Setting the table..." />}

      {/* Desktop grid */}
      {entries && (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-line bg-card shadow-warm lg:block">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr>
                  <th className="w-36 p-3" />
                  {days.map((d) => {
                    const iso = isoDate(d);
                    return (
                      <th
                        key={iso}
                        scope="col"
                        className={`p-3 text-center ${
                          iso === today ? "rounded-t-2xl bg-tomato/10 ring-2 ring-inset ring-tomato" : ""
                        }`}
                      >
                        <span
                          className={`block font-display text-sm font-bold ${
                            iso === today ? "text-tomato" : "text-ink"
                          }`}
                        >
                          {dayName(d)}
                        </span>
                        <span className={`text-xs ${iso === today ? "font-semibold text-tomato" : "text-ink-soft"}`}>
                          {iso === today ? "Today" : shortDate(d)}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map(({ key: slot, label }) => {
                  const Icon = SLOT_ICONS[slot];
                  return (
                    <tr key={slot} className="border-t border-line">
                      <th scope="row" className="p-3 align-middle text-left">
                        <span className="flex items-center gap-2 text-sm font-bold">
                          <Icon className="size-4 shrink-0 text-caramel dark:text-spice" />
                          {label}
                        </span>
                      </th>
                      {days.map((d) => {
                        const iso = isoDate(d);
                        const cellKey = key(iso, slot);
                        return (
                          <td key={cellKey} className={`p-1.5 align-top ${iso === today ? "bg-tomato/5" : ""}`}>
                            <MenuCell
                              label={labelFor(entries.get(cellKey))}
                              highlightToday={iso === today}
                              onClick={() => setEditing({ date: iso, slot })}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked days */}
          <div className="space-y-5 lg:hidden">
            {days.map((d) => {
              const iso = isoDate(d);
              return (
                <section
                  key={iso}
                  className={`overflow-hidden rounded-3xl border bg-card shadow-warm-sm ${
                    iso === today ? "border-tomato ring-2 ring-tomato" : "border-line"
                  }`}
                >
                  <header
                    className={`flex items-baseline justify-between px-4 py-2.5 ${
                      iso === today ? "bg-tomato text-white" : "bg-card-soft"
                    }`}
                  >
                    <h2 className="font-display font-bold">
                      {dayName(d)}, {shortDate(d)}
                    </h2>
                    {iso === today && <span className="text-xs font-bold">TODAY</span>}
                  </header>
                  <div className="divide-y divide-line">
                    {SLOTS.map(({ key: slot, label }) => {
                      const Icon = SLOT_ICONS[slot];
                      return (
                        <div key={slot} className="flex items-stretch gap-0 px-2 py-1">
                          <span className="flex w-28 shrink-0 items-center gap-1.5 pl-1 text-xs font-semibold text-ink-soft">
                            <Icon className="size-3.5 shrink-0 text-caramel dark:text-spice" />
                            {label}
                          </span>
                          <div className="min-w-0 flex-1 py-1">
                            <MenuCell
                              compact
                              label={labelFor(entries.get(key(iso, slot)))}
                              onClick={() => setEditing({ date: iso, slot })}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {recipes.length === 0 && entries && (
        <p className="mt-6 text-center text-sm text-ink-soft">
          Tip: add recipes first to pick them here —{" "}
          <Link href="/recipes/new" className="font-semibold text-primary hover:underline">
            add one now
          </Link>
          .
        </p>
      )}

      <EditModal
        editing={editing}
        onClose={() => setEditing(null)}
        recipes={recipes}
        entry={editing ? entries?.get(key(editing.date, editing.slot)) : undefined}
        onSave={handleSave}
        onClear={handleClear}
      />
    </div>
  );
}

function isThisWeek(weekStart: Date): boolean {
  return isoDate(weekStart) === isoDate(startOfWeek(new Date()));
}

function MenuCell({
  label,
  onClick,
  highlightToday,
  compact = false,
}: {
  label: { main: string; custom: boolean } | null;
  onClick: () => void;
  highlightToday?: boolean;
  compact?: boolean;
}) {
  if (!label)
    return (
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className={`group flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line px-2 text-xs font-medium text-ink-soft/70 transition-colors hover:border-primary/50 hover:text-primary ${
          compact ? "min-h-11" : "min-h-16 flex-col"
        }`}
      >
        <Plus className="size-4" />
        Add
      </motion.button>
    );
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`w-full truncate rounded-2xl px-3 py-2 text-left text-[13px] font-semibold shadow-warm-sm ${
        label.custom
          ? "border border-teal/40 bg-teal/10 italic text-teal"
          : "bg-leaf/12 text-[color-mix(in_srgb,var(--color-leaf)_85%,var(--color-ink))]"
      } ${highlightToday && !compact ? "ring-1 ring-tomato/40" : ""} ${compact ? "min-h-11" : "min-h-16"}`}
      title={label.main}
    >
      {label.main}
    </motion.button>
  );
}

function EditModal({
  editing,
  onClose,
  recipes,
  entry,
  onSave,
  onClear,
}: {
  editing: Editing | null;
  onClose: () => void;
  recipes: Recipe[];
  entry?: MenuEntry;
  onSave: (date: string, slot: string, recipeId: number | null, text: string) => Promise<void>;
  onClear: (entry: MenuEntry) => Promise<void>;
}) {
  const [recipeId, setRecipeId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setRecipeId(entry?.recipe_id ?? null);
      setText(entry && !entry.recipe_id ? entry.custom_text : "");
      setError("");
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function save() {
    if (!editing || busy) return;
    if (recipeId == null && !text.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (recipeId != null) await onSave(editing.date, editing.slot, recipeId, "");
      else await onSave(editing.date, editing.slot, null, text.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (!editing || !entry || busy) return;
    setBusy(true);
    setError("");
    try {
      await onClear(entry);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clear — try again.");
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {editing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 grid place-items-end bg-black/45 sm:place-items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="w-full rounded-t-3xl border border-line bg-card p-5 shadow-warm sm:max-w-md sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg font-bold capitalize">{editing.slot}</h2>
                <p className="text-sm text-ink-soft">{editing.date}</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-card-soft"
              >
                <X className="size-4" />
              </button>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Pick a recipe</span>
              <select
                value={recipeId ?? ""}
                onChange={(e) => setRecipeId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-2xl border border-line bg-page px-4 py-2.5 text-[15px] outline-none focus:border-primary focus:ring-4 focus:ring-tomato/15"
              >
                <option value="">— None —</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                    {r.categories.length > 0 && ` (${r.categories.map((c) => c.name).join(", ")})`}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-semibold">Or type something</span>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='e.g. leftover rice + dal'
                disabled={recipeId != null}
                className="w-full rounded-2xl border border-line bg-page px-4 py-2.5 text-[15px] outline-none placeholder:text-ink-soft focus:border-primary focus:ring-4 focus:ring-tomato/15 disabled:opacity-45"
              />
            </label>

            {error && (
              <p className="mt-3 rounded-2xl border border-tomato/30 bg-tomato/10 px-3 py-2 text-sm font-medium text-tomato">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-2">
              {entry ? (
                <button
                  onClick={clear}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-tomato hover:bg-tomato/10 disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                  Clear
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={save}
                disabled={busy || (recipeId == null && !text.trim())}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary shadow-warm-sm disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
