# Rasoi (रसोई) — Requirements

Home kitchen manager for a 50-year-old Indian mom. Colorful, joyful, polished. Mobile-first.

## Stack
- Frontend: Next.js App Router + Tailwind CSS v4 + Framer Motion + lucide-react. Port 8600, `next start` only.
- Backend: FastAPI + uvicorn on port 8601. SQLite stdlib (`sqlite3`), WAL mode, `backend/data.db`.
- Single origin: Next rewrites `/api/*` and `/uploads/*` → `127.0.0.1:8601`.

## Features (MVP)
1. **Recipes ("Meri Recipes")** — grid cards with photo/placeholder, search, category chips (Breakfast/Lunch/Dinner/Snacks/Dessert/Beverages). Detail: photo gallery, checkable ingredients, steps. Form: title/category/prep/description, dynamic ingredient rows (qty+unit+name), one big paste-friendly steps textarea, photo upload (multi-file, clipboard paste, by URL), remove photos, first = cover. Delete with confirm.
2. **Weekly Menu Planner ("Aaj Kya Banau?")** — Mon–Sun × Breakfast/Lunch/Evening Snacks/Dinner. Cell = recipe dropdown or free text. Week prev/next nav; today's column highlighted. Keyed by ISO date + slot.
3. **Shopping List ("Bazaar List")** — generate from picked days (aggregates ingredients from recipes in those menu slots, dedup case-insensitive, quantities joined), manual add, check off, clear checked, count badge.

## Design
- Warm cream base (#FFF9F2), tomato primary (#E8543F), turmeric (#F5A623), coriander green (#3E9B57), deep chilli text accents (#7C2D12).
- Bricolage Grotesque display + Inter body. Rounded-2xl/3xl warm cards, soft shadows, Framer Motion micro-animations.
- Lucide icons only. ZERO emojis in UI. Light default + working dark toggle (hybrid Tailwind v4 dark mode).
- Bottom tab bar on mobile / sidebar on desktop: Recipes, Menu, Shopping.

## API (all under /api)
- Recipes CRUD + `?q=&category=` filters; photos multipart upload/delete; server-side fetch-photo-by-URL.
- Menu GET/POST, PUT/DELETE by id (date ISO, slot, recipe_id nullable, custom_text nullable).
- Shopping GET/POST/PATCH(toggle)/DELETE + POST /generate {dates}.
- Static uploads at `/uploads`.
