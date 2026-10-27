# Rasoi Fix Pass (Aug 22, 2026)

You are fixing Rasoi — a LIVE kitchen app used daily by Kavita (Ayaan's mom) at rasoi.mac.
Stack: Next.js App Router FE (:8600, `frontend/`), FastAPI BE (:8601, `backend/main.py`), SQLite (`backend/data.db`).
Read this whole file before touching anything.

## Context / why
- User saw "Aug 17" on the app when today was Aug 20 → week labels use Monday-start (`startOfWeek` in `src/lib/kitchen.ts`). Confusing + wrong convention for India. Nothing else is stale; DB data is REAL (3 shopping items added by mom — DO NOT delete/modify DB rows).
- Backend stamps `created_at` via `datetime.now(timezone.utc)` — raw UTC, 5.5h behind IST.

## Tasks (do ALL, in order)

### 1. Week logic — Sunday-start (menu + shopping pages)
- Change `startOfWeek` so weeks run Sun→Sat (Indian calendar convention). Keep Mon-start helper only if something else needs it.
- Week heading must read clearly, e.g. "This week · 16–22 Aug" — never a bare "Aug 17" that looks like stale data.
- Highlight TODAY's column/chip in the menu grid (visible pill/border), and make sure the "Today" jump button still works after the Sunday switch.

### 2. Timezone — IST everywhere
- Backend: `now()` → IST (+05:30) ISO timestamps (`zoneinfo.ZoneInfo("Asia/Kolkata")`). Existing rows keep working (they're parseable ISO).
- Frontend: anywhere a timestamp/date renders from `created_at` etc., format in Asia/Kolkata — no raw UTC leakage.

### 3. Placeholder sweep
- Grep frontend for demo/sample/mock/lorem content and remove. Every empty state gets a friendly CTA (e.g. "No recipes yet — add your first one!"). No lorem, no TODO text, no console.logs left.

### 4. Full bug hunt (BE + FE) — fix what you find, log everything
Check at minimum:
- Recipe CRUD incl. the steps column end-to-end (schema ↔ POST ↔ PUT ↔ GET consistency)
- Photo upload edge cases (bad content-type, huge file, orphaned uploads on recipe delete)
- Menu slot validation ('breakfast'/'lunch'/'snacks'/'dinner' lowercase), duplicate-slot conflicts
- Shopping generate: aggregation correctness, no dupes when generated twice, checked-state preserved
- API error handling → UI shows a toast/message, never silent failure or white screen
- 404s for missing recipe ids; JSON body edge cases
- Mobile layout: no horizontal overflow at 360px; tap targets sane
- Any `new Date()` misuse that could show yesterday/tomorrow around midnight IST

### 5. Rebuild + restart + verify
- `cd frontend && npm run build` then restart both via `/home/mac/projects/rasoi/start.sh`
- Verify: :8600 returns 200, :8601 /api/recipes returns 200, create→list→delete a test recipe works, menu entry set/unset works, shopping generate works. Clean up ALL test data afterwards (leave DB exactly as you found it).

## Rules
- Do NOT touch existing DB rows (mom's real shopping items).
- No emojis in the UI. Keep lucide-react icons consistent with the existing build.
- Don't rename routes/ports or change the visual theme beyond what's asked.
- Work in small verifiable steps; you may get cut off mid-run (a supervisor resumes you with --continue).

## DONE marker
When EVERYTHING above is done and verified, write `docs/FIX_DONE.md` containing your final summary: every bug found, every fix applied, verification results. That file's existence = job complete.
