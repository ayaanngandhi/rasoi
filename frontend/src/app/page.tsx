"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Search, X } from "lucide-react";
import { api, type Recipe } from "@/lib/api";
import { CategoryChips } from "@/components/category-chips";
import { RecipeCard } from "@/components/recipe-card";
import { EmptyState, ErrorNote, PageHeader, Spinner } from "@/components/ui";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams();
      if (debounced) params.set("q", debounced);
      if (category !== "All") params.set("category", category);
      const qs = params.toString();
      setRecipes(await api.get<Recipe[]>(`/api/recipes${qs ? `?${qs}` : ""}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load recipes");
    }
  }, [debounced, category]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = useMemo(() => debounced !== "" || category !== "All", [debounced, category]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader title="Meri Recipes" hindi="Har recipe, ek jagah — dil se.">
        <Link
          href="/recipes/new"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary shadow-warm transition-transform hover:scale-[1.03] active:scale-95"
        >
          <Plus className="size-4" />
          Add Recipe
        </Link>
      </PageHeader>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes or ingredients..."
            className="w-full rounded-2xl border border-line bg-card py-3 pl-12 pr-10 text-[15px] outline-none placeholder:text-ink-soft focus:border-primary focus:ring-4 focus:ring-tomato/15"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-soft hover:text-primary"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <CategoryChips value={category} onChange={setCategory} onMutated={load} />
      </div>

      {error && <ErrorNote message={error} />}

      {!recipes && !error && <Spinner label="Fetching your recipes..." />}

      {recipes && recipes.length === 0 && (
        <Link
          href="/recipes/new"
          aria-label="Add your first recipe"
          className="block rounded-3xl transition-transform hover:scale-[1.02] active:scale-[0.99]"
        >
          <EmptyState
            icon={Plus}
            title={hasFilters ? "Nothing matches that search" : "No recipes yet — add your first one!"}
            hint={
              hasFilters
                ? "Try another word or pick a different category."
                : "Tap here to copy it from WhatsApp, YouTube, or amma's notebook."
            }
          />
        </Link>
      )}

      {recipes && recipes.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {recipes.map((r, i) => (
            <RecipeCard key={r.id} recipe={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
