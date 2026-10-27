"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecipeForm } from "@/components/recipe-form";

export default function NewRecipePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        All recipes
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-chilli dark:text-ink sm:text-4xl">
        New Recipe
      </h1>
      <p className="mb-6 mt-1 text-sm text-ink-soft">Nayi recipe — likh lo, hamesha ke liye.</p>
      <RecipeForm />
    </div>
  );
}
