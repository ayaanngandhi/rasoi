# FIX DONE — Rasoi fix pass complete (Aug 22, 2026)

All tasks from docs/FIX_PROMPT.md completed and verified. Details in docs/fix-log.md.

## Bugs found & fixed
1. **Menu upsert 500 (backend)** — POST /api/menu on an existing date+slot crashed: `cursor.lastrowid` is stale after `ON CONFLICT DO UPDATE`, re-SELECT by id got None. Fixed with a deterministic SELECT by `(date, slot)`. Upsert now updates in place, one row per slot.
2. **Photo type spoofing (backend)** — arbitrary bytes uploaded with `Content-Type: image/png` were stored as "images" because the header was trusted first. `sniff_ext` now uses magic bytes only; garbage -> 400.
3. **Unbounded photo uploads (backend)** — no size limit on multipart upload or URL fetch; now >20 MB -> 413.
4. **PUT /api/menu UNIQUE clash -> raw 500** — now HTTP 409 with friendly detail.
5. **Broken 404 detection (frontend)** — recipe detail/edit checked `e.message.includes("404")`; backend never includes "404" in its message, so the friendly not-found state never showed. Added `ApiError` carrying the HTTP status; pages check `e.status === 404`.
6. **Silent menu-editor failures (frontend)** — save/clear errors surfaced only on page-level state hidden behind the open modal. Modal now owns busy/error state and shows inline errors.
7. **Week convention (frontend)** — weeks now start Sunday (Indian convention); headings read "This week · 16–22 Aug" (year shown when not current year); stale Monday-indexing removed; Today ring/pill + jump-to-today verified against new logic.
8. **IST timestamps (backend)** — `now()` stamps Asia/Kolkata (+05:30). Legacy UTC rows still parse; frontend never renders raw timestamps (verified), so no UTC leakage surface.

## Also verified clean
- No lorem/demo/mock/TODO/console.* anywhere in frontend/src.
- Recipe CRUD incl. steps column end-to-end (POST/PUT/GET via :8600 proxy).
- Orphaned uploads cleaned on recipe delete (uploads dir back to empty).
- Shopping generate idempotent (added 1, then 0, then 0), checked-state preserved, dedupe case-insensitive by name.
- Mobile layout: single-column stacks below lg, no fixed-width overflow at 360px; tap targets >= ~36px.
- No `new Date()` UTC misuse; menu keys use browser-local ISO dates.

## Verification results
- `npm run build`: passes (7 routes). `bash start.sh`: :8600 UP, :8601 UP — BOTH LEFT RUNNING.
- :8600 -> 200 (HTML contains "Rasoi"); :8601/api/recipes -> 200; /menu /shopping /recipes/new -> 200.
- Test recipe create -> list -> GET -> PUT(steps intact) -> delete: OK, IST stamp confirmed.
- Photos: valid PNG OK; bad bytes 400; 21 MB 413.
- Menu set/unset + upsert-no-dupe + 409 clash: OK. Invalid slot: 422.
- DB left exactly as found: mom's shopping items untouched (ids 5 Jau atta, 6 Mustard oil unchecked, 7 Eggs checked); all test data removed; uploads empty.
