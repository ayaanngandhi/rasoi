"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";
import { api, type Category, type Photo, type Recipe } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ErrorNote } from "@/components/ui";

type UrlPhoto = { filename: string; url: string };
type NewFile = { file: File; preview: string };

export function RecipeForm({ initial }: { initial?: Recipe }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [cats, setCats] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<Set<number>>(
    new Set(initial?.categories.map((c) => c.id) ?? []),
  );
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [body, setBody] = useState(initial?.steps ?? "");

  useEffect(() => {
    api
      .get<Category[]>("/api/categories")
      .then(setCats)
      .catch(() => setCats([]));
  }, []);

  function toggleCat(id: number) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addCategoryInline() {
    const name = newCatName.trim();
    if (!name || addingCat) return;
    setAddingCat(true);
    try {
      const created = await api.post<Category>("/api/categories", { name });
      setCats((prev) => [...prev, created]);
      setSelectedCats((prev) => new Set(prev).add(created.id));
      setNewCatName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that category");
    } finally {
      setAddingCat(false);
    }
  }


  const existingPhotos = useRef<Photo[]>(initial?.photos ?? []);
  const [photos, setPhotos] = useState<Photo[]>(initial?.photos ?? []);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [newFiles, setNewFiles] = useState<NewFile[]>([]);
  const [urlPhotos, setUrlPhotos] = useState<UrlPhoto[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const stepsRef = useRef<HTMLTextAreaElement>(null);

  // Clipboard image paste support
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revoke previews on unmount
  useEffect(() => {
    return () => newFiles.forEach((n) => URL.revokeObjectURL(n.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((files: File[]) => {
    setNewFiles((prev) => [
      ...prev,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
  }, []);

  function removeExisting(p: Photo) {
    if (p.id == null) return;
    setRemovedIds((prev) => [...prev, p.id!]);
    setPhotos((prev) => prev.filter((x) => x.id !== p.id));
  }

  function removeNew(idx: number) {
    setNewFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function addByUrl() {
    const url = urlInput.trim();
    if (!url || fetchingUrl) return;
    setFetchingUrl(true);
    setError("");
    try {
      const res = await api.post<{ filename: string; url: string }>("/api/fetch-photo", { url });
      setUrlPhotos((prev) => [...prev, res]);
      setUrlInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch that image");
    } finally {
      setFetchingUrl(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!title.trim()) {
      setError("Give your recipe a title first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: title.trim(),
        steps: body,
        category_ids: [...selectedCats],
      };
      const saved =
        initial
          ? await api.put<Recipe>(`/api/recipes/${initial.id}`, payload)
          : await api.post<Recipe>("/api/recipes", payload);

      for (const pid of removedIds) await api.del(`/api/photos/${pid}`);
      if (newFiles.length)
        await api.uploadPhotos(saved.id, newFiles.map((n) => n.file));
      if (urlPhotos.length)
        await api.post(`/api/recipes/${saved.id}/photos/attach`, {
          filenames: urlPhotos.map((u) => u.filename),
        });

      router.push(`/recipes/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the recipe");
      setSaving(false);
    }
  }

  const totalPending = removedIds.length; // just for clarity below

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <ErrorNote message={error} />}

      {/* Basics */}
      <section className="rounded-3xl border border-line bg-card p-5 shadow-warm-sm sm:p-6">
        <div>
          <h2 className="font-display text-lg font-bold">Recipe name</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masala Dosa"
            className="mt-3 w-full rounded-2xl border border-line bg-page px-4 py-2.5 text-[15px] outline-none placeholder:text-ink-soft focus:border-primary focus:ring-4 focus:ring-tomato/15"
          />
        </div>

        <div className="mt-6">
          <h2 className="font-display text-lg font-bold">Categories</h2>
          <p className="mb-3 mt-0.5 text-sm text-ink-soft">Pick any that fit — as many as you like.</p>
          <div className="flex flex-wrap items-center gap-2">
            {cats.map((c) => {
              const active = selectedCats.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCat(c.id)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-semibold transition-all",
                    `cat-${c.color_index}`,
                    active
                      ? "border-primary bg-primary text-on-primary shadow-warm-sm"
                      : "tint-btn text-ink-soft hover:brightness-105",
                  )}
                >
                  {c.name}
                </button>
              );
            })}
            <div className="flex items-center gap-1.5">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategoryInline();
                  }
                }}
                placeholder="New category..."
                className="w-36 rounded-full border-2 border-dashed border-line bg-transparent px-4 py-1.5 text-sm outline-none placeholder:text-ink-soft focus:border-primary focus:ring-4 focus:ring-tomato/10"
              />
              <button
                type="button"
                onClick={addCategoryInline}
                disabled={addingCat || !newCatName.trim()}
                aria-label="Add new category"
                className="grid size-8 place-items-center rounded-full border border-line bg-card text-ink-soft transition-colors hover:border-leaf hover:text-leaf disabled:opacity-40"
              >
                {addingCat ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* The Recipe */}
      <section className="rounded-3xl border border-line bg-card p-5 shadow-warm-sm sm:p-6">
        <h2 className="font-display text-lg font-bold">The Recipe</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Write or paste the whole thing here — from WhatsApp, YouTube, or amma's notebook.
        </p>
        <textarea
          ref={stepsRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          placeholder={"Write the full recipe here...\n\nIngredients, method, tips — however you like it."}
          className="mt-4 w-full resize-y rounded-2xl border border-line bg-page px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-ink-soft focus:border-primary focus:ring-4 focus:ring-tomato/15"
        />
      </section>

      {/* Photos */}
      <section className="rounded-3xl border border-line bg-card p-5 shadow-warm-sm sm:p-6">
        <h2 className="font-display text-lg font-bold">Photos</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Upload, paste from clipboard (Ctrl/Cmd+V), or add by link. First photo becomes the cover.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-page px-4 py-5 text-sm font-semibold text-ink-soft transition-colors hover:border-spice hover:text-caramel dark:hover:text-spice">
            <ImagePlus className="size-5" />
            Choose photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) addFiles(files);
                e.target.value = "";
              }}
            />
          </label>
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addByUrl();
                }
              }}
              placeholder="Paste image URL..."
              className="min-w-0 flex-1 rounded-2xl border border-line bg-page px-4 py-2.5 text-sm outline-none placeholder:text-ink-soft focus:border-primary sm:w-64"
            />
            <button
              type="button"
              onClick={addByUrl}
              disabled={fetchingUrl || !urlInput.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-leaf px-4 py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
            >
              {fetchingUrl ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              Fetch
            </button>
          </div>
        </div>

        {(photos.length > 0 || newFiles.length > 0 || urlPhotos.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <div key={p.id} className="group relative size-24 overflow-hidden rounded-2xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="size-full object-cover" />
                {i === 0 && !totalPending && (
                  <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeExisting(p)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {newFiles.map((n, i) => (
              <div key={n.preview} className="group relative size-24 overflow-hidden rounded-2xl border border-spice">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={n.preview} alt="" className="size-full object-cover" />
                {i === 0 && photos.length === 0 && urlPhotos.length === 0 && (
                  <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeNew(i)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {urlPhotos.map((u, i) => (
              <div key={u.filename} className="group relative size-24 overflow-hidden rounded-2xl border border-teal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.url} alt="" className="size-full object-cover" />
                {i === 0 && photos.length === 0 && newFiles.length === 0 && (
                  <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setUrlPhotos((prev) => prev.filter((x) => x.filename !== u.filename))}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex justify-end pb-4">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-bold text-on-primary shadow-warm transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {initial ? "Save changes" : "Save recipe"}
        </button>
      </div>
    </form>
  );
}
