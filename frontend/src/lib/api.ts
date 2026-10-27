export type Ingredient = { qty: string; unit: string; name: string };

export type Photo = { id?: number; filename?: string; url: string; sort?: number };

export type RecipeCategory = { id: number; name: string };

export type Category = {
  id: number;
  name: string;
  sort: number;
  recipe_count: number;
  color_index: number;
};

export type Recipe = {
  id: number;
  title: string;
  steps: string;
  created_at: string;
  categories: RecipeCategory[];
  ingredients: Ingredient[];
  photos: Photo[];
};

export type MenuEntry = {
  id: number;
  date: string;
  slot: string;
  recipe_id: number | null;
  custom_text: string;
};

export type ShoppingItem = {
  id: number;
  name: string;
  detail: string;
  checked: boolean;
  created_at: string;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") msg = body.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  get: <T>(url: string) => fetch(url).then((r) => parse<T>(r)),
  post: <T>(url: string, body?: unknown) =>
    fetch(url, jsonInit("POST", body)).then((r) => parse<T>(r)),
  put: <T>(url: string, body?: unknown) =>
    fetch(url, jsonInit("PUT", body)).then((r) => parse<T>(r)),
  patch: <T>(url: string, body?: unknown) =>
    fetch(url, jsonInit("PATCH", body)).then((r) => parse<T>(r)),
  del: <T>(url: string) => fetch(url, { method: "DELETE" }).then((r) => parse<T>(r)),

  uploadPhotos(recipeId: number, files: File[]) {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    return fetch(`/api/recipes/${recipeId}/photos`, { method: "POST", body: fd }).then((r) =>
      parse<Photo[]>(r),
    );
  },
};
