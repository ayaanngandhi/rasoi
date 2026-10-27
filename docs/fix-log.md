# Fix Log — Aug 22, 2026 fix pass

Working notes per docs/FIX_PROMPT.md. One iteration's findings/fixes per section; newest at bottom.

## Iteration 1

### State on arrival
- Both servers running (:8600 next-server, :8601 uvicorn). Build from Aug 21 intact.
- Real DB rows present (mom's) — snapshot before touching anything (see below).

### Real data snapshot (DO NOT MODIFY)
- recipes: [] · menu: [] · uploads/: empty
- shopping (mom's): id5 "Jau atta" unchecked, id6 "Mustard oil" unchecked, id7 "Eggs" checked

### Findings / fixes
- Task 1 DONE (FE, pending rebuild): `startOfWeek` now Sunday-start (`out.getDay()`), DAY_NAMES reordered Sun-first, `dayName()` simplified to `getDay()`. Added `weekRangeLabel(days)` producing "16–22 Aug" / "30 Aug – 5 Sep" (+year when != current). Menu page heading now reads `This week · 16–22 Aug` (prefix only when viewing current week); stale Monday-indexing `[getDay()===0?6:getDay()-1]` replaced with `dayName(d)` in desktop header + mobile cards. Shopping chips inherit Sun-start via shared helpers.
- Task 2 DONE: backend `now()` -> `datetime.now(ZoneInfo("Asia/Kolkata"))` (+05:30 ISO stamps). Legacy UTC rows parse fine (`2026-08-21T13:39:27+00:00` -> "21 Aug 2026, 07:09 PM" IST). FE grep confirms `created_at` is never rendered in UI (type-only) -> no raw-UTC leakage surface; `todayISO()` uses browser-local time (mom's phone = IST), no midnight-UTC misuse found.
- Task 3 DONE: grep sweep for lorem/ipsum/sample/mock/demo/TODO/FIXME/console.* across frontend/src -> zero hits. Empty states already carry friendly CTAs.
- Task 4 fixes applied:
  - FE: new `ApiError` (carries HTTP status); recipe detail/edit pages detected 404 via `e.message.includes("404")` which NEVER matched (backend sends {"detail": "Recipe not found"}) so broken-link pages showed generic error instead of the friendly not-found state -> fixed to `e instanceof ApiError && e.status === 404`.
  - FE: menu day-editor modal saved/cleared silently on API failure (page-level error hidden behind modal). Modal now owns busy/error state, shows inline error, disables buttons while saving.
  - BE: photo uploads had NO size limit (memory DoS via huge file). `store_photo_bytes` now rejects >20 MB with 413 (covers multipart upload AND fetch-photo-by-URL path).
  - BE: PUT /api/menu/{id} could hit UNIQUE(date,slot) IntegrityError -> raw 500. Now caught -> HTTP 409 with friendly detail.

### Bugs found during Task 4 verification (live curl testing)
- BE BUG (500): POST /api/menu hitting an EXISTING (date,slot) returned "Internal Server Error" — `cursor.lastrowid` is stale after `ON CONFLICT DO UPDATE`, so re-SELECT by id returned None and `menu_dict(None)` blew up. Upsert-twice had never been tested before. FIXED: re-SELECT by `(date, slot)` instead of lastrowid. Verified: upsert returns same row id, exactly one row per (date,slot).
- BE BUG (type spoofing): uploading text garbage as `image/png` returned 200 and stored a corrupt file — `sniff_ext` trusted the client Content-Type first. FIXED: magic-bytes-only sniffing; garbage -> 400 "Unsupported image type". Verified live.
- BE hardening: >20 MB upload now 413 (was unbounded memory read). Verified live.
- FE BUG (404 UX): detail/edit pages tested `e.message.includes("404")`; backend sends {"detail": "Recipe not found"} so the friendly not-found state could never trigger. FIXED via ApiError.status.

### Task 5 verification results (all pass)
- `npm run build` clean (7 routes). `bash start.sh` -> :8600 UP + :8601 UP.
- :8600 -> 200; :8601/api/recipes -> 200 [] ; homepage HTML contains "Rasoi"; /menu /shopping /recipes/new all 200.
- Recipe create (IST stamp `...+05:30`) -> GET via :8600 proxy -> PUT (steps survive edit) -> DELETE cascade removed uploads dir back to 0 files. Missing id -> JSON 404.
- Photos: valid PNG upload OK; bad bytes 400; 21MB 413.
- Menu: POST set dinner->recipe, upsert twice = single row, PUT clash 409, DELETE unset OK; invalid slot 422.
- Shopping generate x3 for today: added 1 then 0 then 0; checked item stayed checked & unduplicated.
- CLEANUP: test recipe/menu/shopping rows deleted; uploads empty; mom's real rows intact (ids 5 Jau atta, 6 Mustard oil, 7 Eggs-checked) with original UTC created_at untouched.

STATUS: ALL FIX_PROMPT TASKS COMPLETE AND VERIFIED.



