"""Rasoi backend — FastAPI + SQLite (stdlib). Port 8601."""
import os
import re
import sqlite3
import uuid
import shutil
import urllib.request
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data.db"
UPLOADS = BASE_DIR / "uploads"
UPLOADS.mkdir(exist_ok=True)

DEFAULT_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks", "Dessert", "Beverages"]
SLOTS = {"breakfast", "lunch", "snacks", "dinner"}

app = FastAPI(title="Rasoi API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS)), name="uploads")


@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS recipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                steps TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT 'Lunch',
                prep_time TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS recipe_ingredients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                qty TEXT NOT NULL DEFAULT '',
                unit TEXT NOT NULL DEFAULT '',
                name TEXT NOT NULL,
                sort INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS recipe_photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                filename TEXT NOT NULL,
                sort INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS menu_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                slot TEXT NOT NULL,
                recipe_id INTEGER NULL REFERENCES recipes(id) ON DELETE SET NULL,
                custom_text TEXT NOT NULL DEFAULT '',
                UNIQUE(date, slot)
            );
            CREATE TABLE IF NOT EXISTS shopping_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                detail TEXT NOT NULL DEFAULT '',
                checked INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE COLLATE NOCASE,
                sort INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS recipe_categories (
                recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                PRIMARY KEY (recipe_id, category_id)
            );
            CREATE TABLE IF NOT EXISTS _migrations (
                key TEXT PRIMARY KEY
            );
            """
        )
        # Seed default categories once (idempotent)
        if not conn.execute("SELECT 1 FROM categories LIMIT 1").fetchone():
            for idx, name in enumerate(DEFAULT_CATEGORIES):
                conn.execute(
                    "INSERT INTO categories (name, sort) VALUES (?,?)",
                    (name, idx),
                )
        # One-time backfill: legacy single `category` column -> many-to-many links
        if not conn.execute(
            "SELECT 1 FROM _migrations WHERE key='category_backfill_v1'"
        ).fetchone():
            rows = conn.execute(
                """SELECT r.id, r.category FROM recipes r
                   WHERE r.category != ''
                   AND NOT EXISTS (
                     SELECT 1 FROM recipe_categories rc WHERE rc.recipe_id = r.id
                   )"""
            ).fetchall()
            for row in rows:
                cat = conn.execute(
                    "SELECT id FROM categories WHERE name = ? COLLATE NOCASE",
                    (row["category"],),
                ).fetchone()
                if cat:
                    conn.execute(
                        "INSERT OR IGNORE INTO recipe_categories (recipe_id, category_id) VALUES (?,?)",
                        (row["id"], cat["id"]),
                    )
            conn.execute(
                "INSERT OR IGNORE INTO _migrations (key) VALUES ('category_backfill_v1')"
            )


IST = ZoneInfo("Asia/Kolkata")


def now() -> str:
    return datetime.now(IST).isoformat(timespec="seconds")


def photo_url(row) -> dict:
    return {
        "id": row["id"],
        "filename": row["filename"],
        "url": f"/uploads/{row['filename']}",
        "sort": row["sort"],
    }


def recipe_dict(conn, r) -> dict:
    ing = conn.execute(
        "SELECT * FROM recipe_ingredients WHERE recipe_id=? ORDER BY sort, id",
        (r["id"],),
    ).fetchall()
    ph = conn.execute(
        "SELECT * FROM recipe_photos WHERE recipe_id=? ORDER BY sort, id",
        (r["id"],),
    ).fetchall()
    cats = conn.execute(
        """SELECT c.id, c.name FROM categories c
           JOIN recipe_categories rc ON rc.category_id = c.id
           WHERE rc.recipe_id = ?
           ORDER BY c.sort, c.id""",
        (r["id"],),
    ).fetchall()
    return {
        "id": r["id"],
        "title": r["title"],
        "steps": r["steps"],
        "created_at": r["created_at"],
        "categories": [{"id": c["id"], "name": c["name"]} for c in cats],
        "ingredients": [
            {"qty": i["qty"], "unit": i["unit"], "name": i["name"]} for i in ing
        ],
        "photos": [photo_url(p) for p in ph],
    }


class IngredientIn(BaseModel):
    qty: str = ""
    unit: str = ""
    name: str = ""


class RecipeIn(BaseModel):
    title: str
    steps: str = ""
    category_ids: List[int] = []
    ingredients: List[IngredientIn] = []


def save_recipe_categories(conn, recipe_id: int, category_ids: List[int]):
    conn.execute("DELETE FROM recipe_categories WHERE recipe_id=?", (recipe_id,))
    for cid in dict.fromkeys(category_ids):  # dedupe, keep order
        exists = conn.execute(
            "SELECT 1 FROM categories WHERE id=?", (cid,)
        ).fetchone()
        if exists:
            conn.execute(
                "INSERT INTO recipe_categories (recipe_id, category_id) VALUES (?,?)",
                (recipe_id, cid),
            )


def save_recipe_ingredients(conn, recipe_id: int, ingredients: List[IngredientIn]):
    conn.execute("DELETE FROM recipe_ingredients WHERE recipe_id=?", (recipe_id,))
    for idx, ing in enumerate(ingredients):
        name = (ing.name or "").strip()
        if not name:
            continue
        conn.execute(
            "INSERT INTO recipe_ingredients (recipe_id, qty, unit, name, sort) VALUES (?,?,?,?,?)",
            (recipe_id, ing.qty.strip(), ing.unit.strip(), name, idx),
        )


@app.get("/api/categories")
def list_categories():
    with db() as conn:
        rows = conn.execute(
            """SELECT c.id, c.name, c.sort, COUNT(rc.recipe_id) AS recipe_count
               FROM categories c
               LEFT JOIN recipe_categories rc ON rc.category_id = c.id
               GROUP BY c.id
               ORDER BY c.sort, c.id"""
        ).fetchall()
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "sort": r["sort"],
                "recipe_count": r["recipe_count"],
                "color_index": r["id"] % 6,
            }
            for r in rows
        ]


class CategoryIn(BaseModel):
    name: str


@app.post("/api/categories")
def create_category(payload: CategoryIn):
    name = payload.name.strip()
    if not name:
        raise HTTPException(422, "Category name is required")
    with db() as conn:
        dup = conn.execute(
            "SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE", (name,)
        ).fetchone()
        if dup:
            raise HTTPException(409, f'Category "{name}" already exists')
        nxt = conn.execute("SELECT COALESCE(MAX(sort), -1) + 1 FROM categories").fetchone()[0]
        cur = conn.execute(
            "INSERT INTO categories (name, sort) VALUES (?,?)", (name, nxt)
        )
        row = conn.execute("SELECT * FROM categories WHERE id=?", (cur.lastrowid,)).fetchone()
        return {
            "id": row["id"],
            "name": row["name"],
            "sort": row["sort"],
            "recipe_count": 0,
            "color_index": row["id"] % 6,
        }


@app.put("/api/categories/{category_id}")
def rename_category(category_id: int, payload: CategoryIn):
    name = payload.name.strip()
    if not name:
        raise HTTPException(422, "Category name is required")
    with db() as conn:
        row = conn.execute("SELECT * FROM categories WHERE id=?", (category_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Category not found")
        dup = conn.execute(
            "SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE AND id != ?",
            (name, category_id),
        ).fetchone()
        if dup:
            raise HTTPException(409, f'Category "{name}" already exists')
        conn.execute(
            "UPDATE categories SET name=? WHERE id=?", (name, category_id)
        )
        count = conn.execute(
            "SELECT COUNT(*) FROM recipe_categories WHERE category_id=?", (category_id,)
        ).fetchone()[0]
        return {
            "id": category_id,
            "name": name,
            "sort": row["sort"],
            "recipe_count": count,
            "color_index": category_id % 6,
        }


@app.delete("/api/categories/{category_id}")
def delete_category(category_id: int):
    """Deletes the category; recipes keep existing but lose this tag (links cascade)."""
    with db() as conn:
        row = conn.execute("SELECT * FROM categories WHERE id=?", (category_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Category not found")
        conn.execute("DELETE FROM categories WHERE id=?", (category_id,))
    return {"ok": True}


@app.get("/api/recipes")
def list_recipes(q: Optional[str] = None, category: Optional[str] = None):
    with db() as conn:
        sql = "SELECT DISTINCT r.* FROM recipes r"
        params: list = []
        if q:
            sql += (
                " LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id"
                " WHERE (r.title LIKE ? OR ri.name LIKE ?)"
            )
            like = f"%{q}%"
            params += [like, like]
        if category and category != "All":
            sql += " WHERE" if "WHERE" not in sql else " AND"
            sql += (
                " r.id IN (SELECT rc.recipe_id FROM recipe_categories rc"
                " JOIN categories c ON c.id = rc.category_id WHERE c.name = ? COLLATE NOCASE)"
            )
            params.append(category)
        sql += " ORDER BY r.id DESC"
        rows = conn.execute(sql, params).fetchall()
        return [recipe_dict(conn, r) for r in rows]


@app.post("/api/recipes")
def create_recipe(payload: RecipeIn):
    if not payload.title.strip():
        raise HTTPException(422, "Title is required")
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO recipes (title, steps, created_at) VALUES (?,?,?)",
            (payload.title.strip(), payload.steps, now()),
        )
        rid = cur.lastrowid
        save_recipe_categories(conn, rid, payload.category_ids)
        save_recipe_ingredients(conn, rid, payload.ingredients)
        row = conn.execute("SELECT * FROM recipes WHERE id=?", (rid,)).fetchone()
        return recipe_dict(conn, row)


@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: int):
    with db() as conn:
        row = conn.execute("SELECT * FROM recipes WHERE id=?", (recipe_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Recipe not found")
        return recipe_dict(conn, row)


@app.put("/api/recipes/{recipe_id}")
def update_recipe(recipe_id: int, payload: RecipeIn):
    if not payload.title.strip():
        raise HTTPException(422, "Title is required")
    with db() as conn:
        row = conn.execute("SELECT * FROM recipes WHERE id=?", (recipe_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Recipe not found")
        conn.execute(
            "UPDATE recipes SET title=?, steps=? WHERE id=?",
            (payload.title.strip(), payload.steps, recipe_id),
        )
        save_recipe_categories(conn, recipe_id, payload.category_ids)
        save_recipe_ingredients(conn, recipe_id, payload.ingredients)
        row = conn.execute("SELECT * FROM recipes WHERE id=?", (recipe_id,)).fetchone()
        return recipe_dict(conn, row)


@app.delete("/api/recipes/{recipe_id}")
def delete_recipe(recipe_id: int):
    with db() as conn:
        row = conn.execute("SELECT * FROM recipes WHERE id=?", (recipe_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Recipe not found")
        photos = conn.execute(
            "SELECT filename FROM recipe_photos WHERE recipe_id=?", (recipe_id,)
        ).fetchall()
        conn.execute("DELETE FROM recipes WHERE id=?", (recipe_id,))
    for p in photos:
        try:
            (UPLOADS / p["filename"]).unlink()
        except OSError:
            pass
    return {"ok": True}


def sniff_ext(data: bytes, content_type: str) -> Optional[str]:
    """Derive the image type from magic bytes only — never trust the client's
    Content-Type header (it can claim image/png for arbitrary garbage)."""
    if data[:2] == b"\xff\xd8":
        return ".jpg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return ".gif"
    return None


MAX_PHOTO_BYTES = 20 * 1024 * 1024


def store_photo_bytes(data: bytes, content_type: str) -> str:
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "Image is too large (max 20 MB)")
    ext = sniff_ext(data, content_type)
    if not ext:
        raise HTTPException(400, "Unsupported image type")
    filename = uuid.uuid4().hex + ext
    (UPLOADS / filename).write_bytes(data)
    return filename


def add_photo_row(conn, recipe_id: int, filename: str):
    nxt = conn.execute(
        "SELECT COALESCE(MAX(sort), -1) + 1 FROM recipe_photos WHERE recipe_id=?",
        (recipe_id,),
    ).fetchone()[0]
    conn.execute(
        "INSERT INTO recipe_photos (recipe_id, filename, sort) VALUES (?,?,?)",
        (recipe_id, filename, nxt),
    )


@app.post("/api/recipes/{recipe_id}/photos")
async def upload_photos(recipe_id: int, files: List[UploadFile] = File(...)):
    with db() as conn:
        row = conn.execute("SELECT id FROM recipes WHERE id=?", (recipe_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Recipe not found")
        saved = []
        for f in files:
            data = await f.read()
            filename = store_photo_bytes(data, f.content_type or "")
            add_photo_row(conn, recipe_id, filename)
            saved.append(filename)
        photos = conn.execute(
            "SELECT * FROM recipe_photos WHERE recipe_id=? ORDER BY sort, id", (recipe_id,)
        ).fetchall()
        return [photo_url(p) for p in photos]


@app.delete("/api/photos/{photo_id}")
def delete_photo(photo_id: int):
    with db() as conn:
        row = conn.execute("SELECT * FROM recipe_photos WHERE id=?", (photo_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Photo not found")
        conn.execute("DELETE FROM recipe_photos WHERE id=?", (photo_id,))
    try:
        (UPLOADS / row["filename"]).unlink()
    except OSError:
        pass
    return {"ok": True}


class FetchPhotoIn(BaseModel):
    url: str


class AttachIn(BaseModel):
    filenames: List[str]


@app.post("/api/recipes/{recipe_id}/photos/attach")
def attach_photos(recipe_id: int, payload: AttachIn):
    """Attach already-stored upload files (e.g. fetched by URL) to a recipe."""
    with db() as conn:
        if not conn.execute("SELECT id FROM recipes WHERE id=?", (recipe_id,)).fetchone():
            raise HTTPException(404, "Recipe not found")
        for fn in payload.filenames:
            if not re.fullmatch(r"[0-9a-f]{32}\.(jpg|png|webp|gif)", fn):
                raise HTTPException(422, f"Invalid filename: {fn}")
            if not (UPLOADS / fn).is_file():
                raise HTTPException(404, f"Unknown file: {fn}")
            add_photo_row(conn, recipe_id, fn)
        photos = conn.execute(
            "SELECT * FROM recipe_photos WHERE recipe_id=? ORDER BY sort, id", (recipe_id,)
        ).fetchall()
        return [photo_url(p) for p in photos]


@app.post("/api/fetch-photo")
def fetch_photo(payload: FetchPhotoIn):
    url = payload.url.strip()
    if not url.lower().startswith(("http://", "https://")):
        raise HTTPException(422, "Provide a valid http(s) URL")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Rasoi/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "")
            data = resp.read(20 * 1024 * 1024)
    except Exception:
        raise HTTPException(502, "Could not download image from that URL")
    filename = store_photo_bytes(data, content_type)
    return {"filename": filename, "url": f"/uploads/{filename}"}


class MenuIn(BaseModel):
    date: str
    slot: str
    recipe_id: Optional[int] = None
    custom_text: str = ""


def menu_dict(row) -> dict:
    return {
        "id": row["id"],
        "date": row["date"],
        "slot": row["slot"],
        "recipe_id": row["recipe_id"],
        "custom_text": row["custom_text"],
    }


@app.get("/api/menu")
def get_menu():
    with db() as conn:
        rows = conn.execute("SELECT * FROM menu_entries ORDER BY date, slot").fetchall()
        return [menu_dict(r) for r in rows]


@app.post("/api/menu")
def create_menu(payload: MenuIn):
    if payload.slot not in SLOTS:
        raise HTTPException(422, f"Slot must be one of {sorted(SLOTS)}")
    if payload.recipe_id is None and not payload.custom_text.strip():
        raise HTTPException(422, "Pick a recipe or type something")
    with db() as conn:
        conn.execute(
            """INSERT INTO menu_entries (date, slot, recipe_id, custom_text) VALUES (?,?,?,?)
               ON CONFLICT(date, slot) DO UPDATE SET
                 recipe_id=excluded.recipe_id, custom_text=excluded.custom_text""",
            (payload.date, payload.slot, payload.recipe_id, payload.custom_text.strip()),
        )
        # lastrowid is unreliable after ON CONFLICT DO UPDATE -> select by key
        row = conn.execute(
            "SELECT * FROM menu_entries WHERE date=? AND slot=?",
            (payload.date, payload.slot),
        ).fetchone()
        return menu_dict(row)


@app.put("/api/menu/{entry_id}")
def update_menu(entry_id: int, payload: MenuIn):
    if payload.slot not in SLOTS:
        raise HTTPException(422, f"Slot must be one of {sorted(SLOTS)}")
    with db() as conn:
        try:
            cur = conn.execute(
                "UPDATE menu_entries SET date=?, slot=?, recipe_id=?, custom_text=? WHERE id=?",
                (payload.date, payload.slot, payload.recipe_id, payload.custom_text.strip(), entry_id),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(409, "That day and meal already has an entry")
        if cur.rowcount == 0:
            raise HTTPException(404, "Menu entry not found")
        row = conn.execute("SELECT * FROM menu_entries WHERE id=?", (entry_id,)).fetchone()
        return menu_dict(row)


@app.delete("/api/menu/{entry_id}")
def delete_menu(entry_id: int):
    with db() as conn:
        cur = conn.execute("DELETE FROM menu_entries WHERE id=?", (entry_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Menu entry not found")
    return {"ok": True}


@app.get("/api/shopping")
def get_shopping():
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM shopping_items ORDER BY checked, id DESC"
        ).fetchall()
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "detail": r["detail"],
                "checked": bool(r["checked"]),
                "created_at": r["created_at"],
            }
            for r in rows
        ]


class ShoppingIn(BaseModel):
    name: str
    detail: str = ""


@app.post("/api/shopping")
def add_shopping(payload: ShoppingIn):
    if not payload.name.strip():
        raise HTTPException(422, "Item name is required")
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO shopping_items (name, detail, checked, created_at) VALUES (?,?,0,?)",
            (payload.name.strip(), payload.detail.strip(), now()),
        )
        row = conn.execute("SELECT * FROM shopping_items WHERE id=?", (cur.lastrowid,)).fetchone()
        return {
            "id": row["id"],
            "name": row["name"],
            "detail": row["detail"],
            "checked": bool(row["checked"]),
            "created_at": row["created_at"],
        }


@app.patch("/api/shopping/{item_id}")
def toggle_shopping(item_id: int, payload: Optional[dict] = Body(default=None)):
    with db() as conn:
        row = conn.execute("SELECT * FROM shopping_items WHERE id=?", (item_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Item not found")
        new_val = int(payload["checked"]) if payload and "checked" in payload else 0 if row["checked"] else 1
        conn.execute("UPDATE shopping_items SET checked=? WHERE id=?", (new_val, item_id))
        return {"id": item_id, "checked": bool(new_val)}


@app.delete("/api/shopping/{item_id}")
def delete_shopping(item_id: int):
    with db() as conn:
        cur = conn.execute("DELETE FROM shopping_items WHERE id=?", (item_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Item not found")
    return {"ok": True}


init_db()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8601)
