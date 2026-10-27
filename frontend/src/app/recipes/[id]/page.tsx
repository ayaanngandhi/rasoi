"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Pencil,
  ScrollText,
  Trash2,
  X,
} from "lucide-react";
import { api, ApiError, type Recipe } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorNote, Spinner } from "@/components/ui";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<Recipe>(`/api/recipes/${id}`)
      .then(setRecipe)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(e instanceof Error ? e.message : "Could not load recipe");
      });
  }, [id]);

  const toggleIngredient = useCallback((i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const photos = recipe?.photos ?? [];
  const cover = photos[photoIdx]?.url;

  // Lightbox: keyboard nav + body scroll lock (Coco-site style)
  useEffect(() => {
    if (lightboxIdx == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") setLightboxIdx((i) => (i == null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft")
        setLightboxIdx((i) => (i == null ? i : (i - 1 + photos.length) % photos.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, photos.length]);

  useEffect(() => {
    document.body.style.overflow = lightboxIdx != null ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxIdx]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.del(`/api/recipes/${id}`);
      router.push("/");
    } catch (e) {
      setDeleting(false);
      setConfirmOpen(false);
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (notFound)
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <EmptyState icon={ChefHat} title="Recipe not found" hint="It may have been deleted." />
        <div className="mt-6 text-center">
          <Link href="/" className="font-semibold text-primary hover:underline">
            Back to recipes
          </Link>
        </div>
      </div>
    );

  if (!recipe && !error) return <Spinner label="Plating it up..." />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        All recipes
      </Link>

      {error && <ErrorNote message={error} />}

      {recipe && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {recipe.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {recipe.categories.map((c) => (
                    <span key={c.id} className={`chip cat-${c.id % 6}`}>
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="mt-2 break-words font-display text-3xl font-extrabold tracking-tight text-chilli dark:text-ink sm:text-4xl">
                {recipe.title}
              </h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/recipes/${id}/edit`}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-semibold shadow-warm-sm transition-colors hover:border-spice hover:text-caramel dark:hover:text-spice"
              >
                <Pencil className="size-4" />
                Edit
              </Link>
              <button
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-tomato/10 px-4 py-2.5 text-sm font-semibold text-tomato transition-colors hover:bg-tomato hover:text-white"
              >
                <Trash2 className="size-4" />
                Delete
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* Gallery */}
            <div>
              <div className="relative overflow-hidden rounded-3xl border border-line bg-card-soft shadow-warm-sm">
                {cover ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover}
                      alt={recipe.title}
                      onClick={() => setLightboxIdx(photoIdx)}
                      className="aspect-[4/3] w-full cursor-zoom-in object-cover"
                    />
                    {photos.length > 1 && (
                      <>
                        <button
                          aria-label="Previous photo"
                          onClick={() => setPhotoIdx((photoIdx - 1 + photos.length) % photos.length)}
                          className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65"
                        >
                          <ChevronLeft className="size-5" />
                        </button>
                        <button
                          aria-label="Next photo"
                          onClick={() => setPhotoIdx((photoIdx + 1) % photos.length)}
                          className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65"
                        >
                          <ChevronRight className="size-5" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                          {photos.map((_, i) => (
                            <button
                              key={i}
                              aria-label={`Photo ${i + 1}`}
                              onClick={() => setPhotoIdx(i)}
                              className={`h-2 rounded-full transition-all ${
                                i === photoIdx ? "w-5 bg-white" : "w-2 bg-white/50"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-spice/20 via-tomato/10 to-leaf/15">
                    <ChefHat className="size-16 text-caramel/60 dark:text-spice/50" />
                  </div>
                )}
              </div>

              {photos.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {photos.map((p, i) => (
                    <button
                      key={p.id ?? i}
                      onClick={() => {
                        setPhotoIdx(i);
                        setLightboxIdx(i);
                      }}
                      className={`h-16 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border-2 transition-all ${
                        i === photoIdx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

            </div>

            {/* Ingredients + The Recipe */}
            <div className="space-y-6">
              {recipe.ingredients.length > 0 && (
                <section className="rounded-3xl border border-line bg-card p-5 shadow-warm-sm">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                    <ListChecks className="size-5 text-leaf" />
                    Ingredients
                    <span className="ml-auto text-xs font-semibold text-ink-soft">
                      {checked.size}/{recipe.ingredients.length} ready
                    </span>
                  </h2>
                  <ul className="mt-3 space-y-1.5">
                    {recipe.ingredients.map((ing, i) => {
                      const done = checked.has(i);
                      return (
                        <li key={i}>
                          <button
                            onClick={() => toggleIngredient(i)}
                            className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-card-soft"
                          >
                            <span
                              className={`grid size-5 shrink-0 place-items-center rounded-md border-2 transition-all ${
                                done
                                  ? "border-leaf bg-leaf text-white"
                                  : "border-line group-hover:border-leaf"
                              }`}
                            >
                              <AnimatePresence initial={false}>
                                {done && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    transition={{ duration: 0.12 }}
                                  >
                                    <Check className="size-3.5" strokeWidth={3} />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </span>
                            <span
                              className={`text-[15px] transition-all ${
                                done ? "text-ink-soft line-through decoration-tomato/60" : ""
                              }`}
                            >
                              {ing.qty || ing.unit ? (
                                <strong className="mr-1.5 font-semibold text-caramel dark:text-spice">
                                  {[ing.qty, ing.unit].filter(Boolean).join(" ")}
                                </strong>
                              ) : null}
                              {ing.name}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <section className="rounded-3xl border border-line bg-card p-5 shadow-warm-sm">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                  <ScrollText className="size-5 text-tomato" />
                  The Recipe
                </h2>
                {recipe.steps.trim() ? (
                  <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">
                    {recipe.steps}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-ink-soft">
                    Nothing written yet — edit the recipe to add it.
                  </p>
                )}
              </section>
            </div>
          </div>
        </motion.div>
      )}

      {/* Lightbox — tap any photo to expand */}
      <AnimatePresence>
        {lightboxIdx != null && photos[lightboxIdx] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightboxIdx(null);
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 sm:p-10"
          >
            <button
              onClick={() => setLightboxIdx(null)}
              aria-label="Close photo viewer"
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-all hover:scale-105 hover:bg-white/25 sm:right-6 sm:top-6"
            >
              <X className="size-5" />
            </button>

            {photos.length > 1 && (
              <>
                <button
                  aria-label="Previous photo"
                  onClick={() => setLightboxIdx((lightboxIdx - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:left-5"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  aria-label="Next photo"
                  onClick={() => setLightboxIdx((lightboxIdx + 1) % photos.length)}
                  className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:right-5"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              key={photos[lightboxIdx].id ?? lightboxIdx}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              src={photos[lightboxIdx].url}
              alt={recipe?.title ?? ""}
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />

            {photos.length > 1 && (
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white">
                {lightboxIdx + 1} / {photos.length}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this recipe?"
        body={
          recipe
            ? `"${recipe.title}" and its photos will be gone for good.`
            : "This cannot be undone."
        }
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        busy={deleting}
      />
    </div>
  );
}
