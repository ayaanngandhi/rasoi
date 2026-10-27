"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChefHat } from "lucide-react";
import { api, ApiError, type Recipe } from "@/lib/api";
import { RecipeForm } from "@/components/recipe-form";
import { EmptyState, ErrorNote, Spinner } from "@/components/ui";

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Recipe>(`/api/recipes/${id}`)
      .then(setRecipe)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(e instanceof Error ? e.message : "Could not load recipe");
      });
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <Link
        href={`/recipes/${id}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Back to recipe
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-chilli dark:text-ink sm:text-4xl">
        Edit Recipe
      </h1>
      {error && <div className="mt-6"><ErrorNote message={error} /></div>}
      {notFound && (
        <div className="mt-10">
          <EmptyState icon={ChefHat} title="Recipe not found" hint="It may have been deleted." />
        </div>
      )}
      {!recipe && !notFound && !error && <Spinner label="Opening the recipe card..." />}
      {recipe && <div className="mt-6"><RecipeForm initial={recipe} /></div>}
    </div>
  );
}
