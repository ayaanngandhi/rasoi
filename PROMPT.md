# BUILD SPEC — "Rasoi" (रसोई) — Colorful Home Kitchen Manager

You are building a COMPLETE, WORKING full-stack web app for a 50-year-old Indian mom who manages her home kitchen. She described it in Hindi: she wants to save her recipes (copy-paste text, upload/download photos), write ingredients into menus, plan what to make for breakfast/lunch/dinner, and manage her kitchen food menus easily. The app must be VERY colorful and joyful but POLISHED — premium quality, not childish, not generic-AI-looking.

## Hard requirements

- Name: **Rasoi** (wordmark shows "Rasoi" with "रसोई" as a small accent). Browser title: "Rasoi — My Kitchen".
- Frontend: Next.js (App Router) + Tailwind CSS v4 + Framer Motion + lucide-react. Port **8600**, served with `next start` (production build, NEVER `next dev` — LAN devices block dev-server chunks).
- Backend: Python FastAPI + uvicorn on port **8601**, database = Python built-in **SQLite** (`sqlite3` stdlib, WAL mode) at `backend/data.db`. No other DB.
- Icons: Lucide ONLY (`lucide-react`). ZERO emojis anywhere in the UI.
- Light mode is the DEFAULT (mom's app). Still include a working dark mode toggle (conventions). Tailwind v4 dark mode = hybrid: `light-dark()` in `@theme` + explicit `.dark { ... }` overrides after the theme block + ThemeProvider toggles BOTH `document.documentElement.style.colorScheme` AND `.dark` class; `<html>` gets `style={{ colorScheme: "light" }}` pre-hydration.
- Location: `/home/mac/projects/rasoi/` with `frontend/` and `backend/` subdirectories.

## Design direction (IMPORTANT — this is what makes it special)

- Palette: warm cream base (#FFF9F2-ish), tomato/coral primary (#E8543F-ish), turmeric/amber (#F5A623-ish), coriander green (#3E9B57-ish), deep chilli for text accents (#7C2D12-ish). Poppy, vibrant, appetizing.
- Typography: display font with personality via next/font/google (e.g., Bricolage Grotesque or Fraunces for headings + Inter/Geist for body). Big friendly headings.
- Cards: rounded-2xl/3xl, soft warm shadows, subtle borders. Generous spacing. Micro-animations with Framer Motion (card hover lift, page transitions, staggered lists) — tasteful, fast.
- Avoid: purple/blue gradients, glassmorphism-everywhere, generic dashboard feel, tiny cramped text. Think "beautiful cooking magazine meets friendly app".
- Mobile-first responsive — mom will open this on her phone over home WiFi.

## Features (MVP, all must WORK end-to-end)

### 1. Recipes ("Meri Recipes")
- Grid of recipe cards with photo (or warm placeholder w/ ChefHat icon), title, category chip, prep time.
- Search box + category filter chips: Breakfast, Lunch, Dinner, Snacks, Dessert, Beverages (+ All).
- Recipe detail view: photo carousel/gallery, ingredients as checkable list, steps, description.
- Create/Edit form:
  - title, category select, prep time, description
  - ingredients: dynamic rows (quantity + unit + name), add/remove rows
  - steps: one big paste-friendly textarea (she will copy-paste from WhatsApp/YouTube)
  - photos: multi-file upload + clipboard image PASTE support + add-photo-by-URL; remove photo; first photo = cover
- Delete with confirm dialog.

### 2. Weekly Menu Planner ("Aaj Kya Banau?")
- 7-day grid (Mon–Sun, start on today visually highlighted) × 4 meal slots: Breakfast, Lunch, Evening Snacks, Dinner.
- Each cell: pick an existing recipe from a dropdown OR type free text (e.g., "leftover rice + dal").
- Week navigation (prev/next week), today's column highlighted with accent ring.
- Data keyed by ISO date + slot.

### 3. Shopping List ("Bazaar List")
- "Generate from menu": pick day(s) or whole week → aggregates ingredients from all recipes in those menu slots, grouped/deduped by ingredient name (case-insensitive), quantities joined.
- Manual add item. Check off items (strikethrough animation). Clear checked. Item count badge.

### 4. Nice touches
- Warm empty states (icon + friendly line like "No recipes yet — add your first one!").
- Hinglish micro-copy accents (e.g., section subtitles) but UI primarily English-clear.
- Bottom tab bar on mobile / sidebar on desktop: Recipes, Menu, Shopping.

## Backend API (all under /api)

- `GET /api/recipes` (with ?q= &category= filters), `POST /api/recipes`, `GET/PUT/DELETE /api/recipes/{id}`
- `POST /api/recipes/{id}/photos` (multipart, multiple files), `DELETE /api/photos/{photo_id}`
- Photo by URL fetch: `POST /api/fetch-photo` {url} → downloads server-side into uploads (some URLs block browser CORS).
- `GET/POST /api/menu`, `PUT/DELETE /api/menu/{id}` (fields: date ISO, slot, recipe_id nullable, custom_text nullable)
- `GET /api/shopping`, `POST /api/shopping`, `PATCH /api/shopping/{id}` (toggle checked), `DELETE /api/shopping/{id}`, `POST /api/shopping/generate` {dates: [...]}
- Serve uploads: FastAPI StaticFiles mounting `backend/uploads/` at `/uploads`.
- SQLite tables: recipes(id, title, description, category, prep_time, created_at), recipe_ingredients(id, recipe_id, qty, unit, name, sort), recipe_photos(id, recipe_id, filename, sort), menu_entries(id, date, slot, recipe_id, custom_text), shopping_items(id, name, detail, checked, created_at).
- CORS middleware allow all (same-origin via proxy anyway).

## Wiring

- `frontend/next.config.ts`: rewrites `/api/:path*` → `http://127.0.0.1:8601/api/:path*` and `/uploads/:path*` → `http://127.0.0.1:8601/uploads/:path*` so the whole app is single-origin behind a reverse proxy later.
- Use plain `<img>` for uploaded photos (dynamic files, no next/image optimization headaches).

## Scripts

- `start.sh`: kills whatever holds ports 8600/8601 BY PID (from `ss -tlnp`, never pkill), starts uvicorn (`cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8601`) in background with logs to `backend/server.log`, ensures frontend deps installed + `.next` build exists (build if missing), then `next start -p 8600` in background logging to `frontend/server.log`.
- `stop.sh`: kills by port PID both services.

## Docs

Create concise `docs/`: requirements.md, data.md, tasks.md, progress.md. Keep each short (this is a living doc set, not an essay).

## Verification (MANDATORY before you finish)

1. `npm run build` in frontend passes cleanly.
2. Run `bash start.sh`; confirm BOTH ports listening.
3. curl `http://127.0.0.1:8601/api/recipes` → returns JSON (empty list OK).
4. Create a test recipe via curl POST with 2 ingredients; generate a small test image with Python PIL or a 1x1 png and upload it via the photos endpoint; GET the recipe back and confirm photo path + ingredients.
5. POST a menu entry for today breakfast linked to the test recipe; POST shopping generate for today; confirm aggregated ingredient appears.
6. curl `http://127.0.0.1:8600/` returns HTML containing "Rasoi".
7. DELETE the test recipe (leave DB clean of test data; keep servers RUNNING).
8. Print a final summary of what was built, file tree, and verification results.

Do NOT leave any dev watchers running. Finish, leave both production servers up, print summary, exit.
