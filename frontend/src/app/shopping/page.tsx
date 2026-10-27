"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Eraser,
  Plus,
  ShoppingBasket,
  X,
} from "lucide-react";
import { api, type ShoppingItem } from "@/lib/api";
import { cn } from "@/lib/cn";
import { EmptyState, ErrorNote, PageHeader, Spinner } from "@/components/ui";

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[] | null>(null);
  const [error, setError] = useState("");
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api.get<ShoppingItem[]>("/api/shopping"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the list");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const uncheckedCount = items?.filter((i) => !i.checked).length ?? 0;
  const checkedCount = items?.filter((i) => i.checked).length ?? 0;

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const name = newItem.trim();
    if (!name || adding) return;
    setAdding(true);
    setError("");
    try {
      await api.post("/api/shopping", { name });
      setNewItem("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setAdding(false);
    }
  }

  async function toggle(item: ShoppingItem) {
    setItems((prev) =>
      prev?.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)) ?? prev,
    );
    try {
      await api.patch(`/api/shopping/${item.id}`, { checked: !item.checked });
    } catch {
      load();
    }
    // Re-sort to match backend order (unchecked first)
    setTimeout(load, 400);
  }

  async function removeItem(id: number) {
    try {
      await api.del(`/api/shopping/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove item");
    }
  }

  async function clearChecked() {
    if (!items || clearing) return;
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id);
    setClearing(true);
    try {
      await Promise.all(checkedIds.map((id) => api.del(`/api/shopping/${id}`)));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clear items");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader title="Bazaar List" hindi="Kya kya laana hai — likhte jao.">
        <span className="inline-flex items-center gap-2 rounded-full bg-spice/20 px-4 py-1.5 text-sm font-bold text-caramel dark:text-spice">
          <ShoppingBasket className="size-4" />
          {items ? `${uncheckedCount} to buy` : "..."}
        </span>
      </PageHeader>

      {/* Add manually */}
      <form onSubmit={addItem} className="mb-6 flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add an item — dhaniya, ghee, atta..."
          className="min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 py-3 text-[15px] outline-none placeholder:text-ink-soft focus:border-primary focus:ring-4 focus:ring-tomato/15"
        />
        <button
          type="submit"
          disabled={!newItem.trim() || adding}
          aria-label="Add item"
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-tomato text-on-primary shadow-warm-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <Plus className="size-5" />
        </button>
      </form>

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {!items && !error && <Spinner label="Checking the pantry..." />}

      {items && items.length === 0 && (
        <EmptyState
          icon={ShoppingBasket}
          title="Your bazaar list is empty"
          hint="Add items by hand — dhaniya, ghee, atta..."
        />
      )}

      {items && items.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-line bg-card shadow-warm-sm">
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.18 }}
                  className="group flex items-center gap-3 px-4 py-3"
                >
                  <button
                    onClick={() => toggle(item)}
                    aria-label={item.checked ? "Mark as not bought" : "Mark as bought"}
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border-2 transition-all",
                      item.checked
                        ? "border-leaf bg-leaf text-white"
                        : "border-line hover:border-leaf",
                    )}
                  >
                    {item.checked && <Check className="size-4" strokeWidth={3} />}
                  </button>
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-[15px] transition-all duration-200",
                      item.checked && "text-ink-soft line-through decoration-tomato/60",
                    )}
                  >
                    <strong className="font-semibold">{item.name}</strong>
                    {item.detail && (
                      <span className="ml-2 text-xs font-medium text-ink-soft">{item.detail}</span>
                    )}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="shrink-0 rounded-full p-1.5 text-ink-soft opacity-0 transition-opacity hover:bg-tomato/10 hover:text-tomato group-hover:opacity-100"
                  >
                    <X className="size-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {checkedCount > 0 && (
            <footer className="border-t border-line px-4 py-3">
              <button
                onClick={clearChecked}
                disabled={clearing}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-card-soft hover:text-tomato disabled:opacity-60"
              >
                <Eraser className="size-4" />
                Clear {checkedCount} bought item{checkedCount === 1 ? "" : "s"}
              </button>
            </footer>
          )}
        </section>
      )}
    </div>
  );
}
