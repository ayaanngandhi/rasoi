# Data Model — SQLite (backend/data.db, WAL mode)

```sql
recipes(id INTEGER PK AUTOINCREMENT,
        title TEXT NOT NULL,
        steps TEXT DEFAULT '',            -- paste-friendly steps textarea
        created_at TEXT DEFAULT now)
-- LEGACY COLUMNS still present but unused since Aug 23, 2026: description, category, prep_time

categories(id INTEGER PK AUTOINCREMENT,
           name TEXT UNIQUE COLLATE NOCASE,
           sort INT DEFAULT 0)          -- seeded w/ Breakfast..Beverages; fully user-editable, unlimited

recipe_categories(recipe_id INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                  PRIMARY KEY(recipe_id, category_id))   -- many-to-many; a recipe can be in many categories

recipe_ingredients(id INTEGER PK, recipe_id INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                   qty TEXT DEFAULT '', unit TEXT DEFAULT '', name TEXT NOT NULL, sort INT DEFAULT 0)

recipe_photos(id INTEGER PK, recipe_id INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
              filename TEXT NOT NULL, sort INT DEFAULT 0)
-- file lives at backend/uploads/<filename>; served at /uploads/<filename>

menu_entries(id INTEGER PK,
             date TEXT NOT NULL,          -- ISO YYYY-MM-DD
             slot TEXT NOT NULL,          -- breakfast | lunch | snacks | dinner
             recipe_id INT NULL REFERENCES recipes(id) ON DELETE SET NULL,
             custom_text TEXT DEFAULT '')

shopping_items(id INTEGER PK,
               name TEXT NOT NULL,
               detail TEXT DEFAULT '',    -- joined "2 cup + 1 tbsp" etc.
               checked INTEGER DEFAULT 0,
               created_at TEXT DEFAULT now)
```

## Notes
- Categories: Breakfast, Lunch, Dinner, Snacks, Dessert, Beverages.
- Slots: breakfast, lunch, snacks, dinner.
- Recipe JSON embeds `ingredients[]` and `photos[]` (photo objects carry `url` = `/uploads/<filename>`).
- Shopping generate: for each requested date+slot with a recipe, collect its ingredients; dedupe on lower(name); detail joins distinct non-empty qty(+unit) values with " + ".
