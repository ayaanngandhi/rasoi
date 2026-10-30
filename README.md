# Rasoi

**A kitchen app for one household — recipes, a weekly menu, and a shopping list that builds itself.**

Rasoi (रसोई, *kitchen*) was built for my mom. She keeps her recipes in it, plans
the week's meals in it, and generates the shopping list from the plan instead of
writing one out by hand. There are no accounts, no sign-ups, no cloud: it runs on
a machine in the house and the family opens it on their phones.

![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs)
![FastAPI](https://img.shields.io/badge/FastAPI-uvicorn-009688?logo=fastapi)
![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?logo=sqlite)

---

## What it does

**Recipes.** Photo cards with search and category chips. A recipe holds a photo
gallery, checkable ingredients, and steps. Photos can be uploaded, pasted from
the clipboard, or pulled in from a URL — the first one becomes the cover.

**Weekly menu.** Monday to Sunday across four slots — breakfast, lunch, evening
snacks, dinner. Any cell takes a recipe from the library or free text ("leftover
dal"). Today's column is highlighted; weeks page backwards and forwards.

**Shopping list.** Pick the days you are shopping for, press generate, and it
collects the ingredients of everything on the menu for those days — deduplicated
case-insensitively, matching quantities combined. Then add the things that never
appear in a recipe, check items off while you shop, and clear what you bought.

---

## How it is built

```
        :8600                              :8601
┌────────────────────┐             ┌────────────────────┐
│ Next.js (App Router│  rewrites   │ FastAPI + uvicorn  │
│ Tailwind v4        │────────────▶│ stdlib sqlite3     │
│ Framer Motion      │  /api/*     │ WAL mode           │
│ lucide-react       │  /uploads/* │                    │
└────────────────────┘             └─────────┬──────────┘
                                             │
                                  backend/data.db + backend/uploads/
```

The frontend proxies `/api/*` and `/uploads/*` to the backend, so the browser
only ever talks to one origin. That is what lets the whole thing be one URL with
no CORS configuration and no separate API host.

- **Frontend** — Next.js App Router, Tailwind CSS v4, Framer Motion, lucide-react.
  Production build only; `next dev` is not what gets served.
- **Backend** — a single `main.py`. FastAPI, plain `sqlite3` from the standard
  library, no ORM. Uploaded photos live on disk under `backend/uploads/`.
- **Data** — one SQLite file in WAL mode. `docs/data.md` is the authoritative
  schema; `docs/requirements.md` is the original spec.

---

## Running it

```bash
git clone https://github.com/ayaanngandhi/rasoi.git
cd rasoi
bash start.sh
```

`start.sh` starts both processes, waits for each port to actually accept
connections, and reports `UP` per port. It kills whatever held the port first, by
PID. Then open **http://127.0.0.1:8600**.

Prerequisites: Node 20+, Python 3.11+ with `fastapi`, `uvicorn` and
`python-multipart` (`backend/requirements.txt`), and a `npm install` in
`frontend/` the first time.

| Path | Port | What |
| --- | --- | --- |
| `frontend/` | 8600 | Next.js, production build |
| `backend/` | 8601 | FastAPI, API + `/uploads` |
| `backend/data.db` | — | the database |
| `backend/uploads/` | — | recipe photos |

Stop it with `bash stop.sh`.

> **`start.sh` pins `/usr/bin/python3.12` deliberately.** A bare `python3` can
> resolve to a different interpreter with no `uvicorn` installed, and then the
> backend dies instantly while the frontend serves 500s from a failed proxy. If
> you see 500s, check the backend first — it is almost never the frontend.

---

## Hosting it on the LAN

This is the setup it actually runs in, on a home server at `192.168.68.129`.
The same six steps work for any app on this machine; ports and names change.

### 1. Give it two ports

Frontend on a base port, backend on base+1. Here that is `8600` and `8601`.
Check they are free before you commit to them:

```bash
ss -tln | grep -E ':8600|:8601' || echo "both free"
```

### 2. Start it with a systemd user unit, not a cron job

A `@reboot` cron entry can silently never fire, and then the app is down until
someone notices. A user unit is observable and restartable.

```ini
# ~/.config/systemd/user/rasoi.service
[Unit]
Description=Rasoi kitchen app FE+BE (rasoi.mac :8600/:8601)
After=network.target

[Service]
Type=oneshot
ExecStart=/home/mac/projects/rasoi/start.sh
RemainAfterExit=yes

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now rasoi.service
loginctl enable-linger "$USER"        # required: user units die at logout without it
systemctl --user status rasoi.service
```

`Type=oneshot` with `RemainAfterExit=yes` suits an app that launches two
processes. Because systemd no longer supervises those children, a crashed child
stays crashed — that is what a keepalive is for, or restart the unit.

### 3. Put a name on it, in Pi-hole

Give the house a URL instead of an IP and port. Pi-hole v6 keeps local DNS
records in `/etc/pihole/pihole.toml`, under `[dns]`:

```toml
hosts = [ "192.168.68.129 rasoi.mac" ]
```

```bash
docker restart pihole
dig +short @192.168.68.129 rasoi.mac     # must print 192.168.68.129
```

Notes that cost time if you skip them: the live file is the one bind-mounted
into the container, **not** a stale copy in a home directory; `hosts = []` appears
twice in that file and the DHCP-lease one is the wrong one; and the server itself
does not query Pi-hole, so test with `dig @192.168.68.129` rather than trusting
local resolution.

### 4. Make port 80 the front door

Port 80 is owned by **Atrium** ([atrium](https://github.com/ayaanngandhi/atrium)),
a small router that sends `/<service>` to the port that service runs on. So
instead of a vhost on 80, Rasoi gets one line:

```json
{ "slug": "rasoi", "port": 8600, "name": "Rasoi", "note": "Mom's recipes" }
```

in `~/atrium/config.json`. Atrium re-reads the file on save — no restart.

### 5. Keep the named vhost too

`rasoi.mac` is routed by nginx, which now listens on a private port behind
Atrium. The vhost is unchanged apart from the listen line:

```nginx
# /etc/nginx/sites-available/rasoi.conf
server {
    listen 8081;                                  # Atrium owns :80
    server_name rasoi.mac rasoi.ayaanngandhi.in;
    client_max_body_size 25M;                     # recipe photo uploads

    location / {
        proxy_pass http://127.0.0.1:8600;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/rasoi.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6. Verify every layer, in order

```bash
curl -s http://127.0.0.1:8601/api/recipes | head -c 120     # backend
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8600/        # frontend
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: rasoi.mac' http://127.0.0.1:8081/   # nginx
dig +short @192.168.68.129 rasoi.mac                        # DNS
curl -sL http://192.168.68.129/rasoi | grep -o '<title>[^<]*'          # through Atrium
curl -sL http://rasoi.mac/ | grep -o '<title>[^<]*'                    # through the name
```

All six answering means the whole stack is real. A 200 from the port alone is
not proof — that can be a stale dev server from an earlier session.

### Where it ends up

| URL | Route |
| --- | --- |
| `http://rasoi.mac/` | Pi-hole → nginx :8081 → Next.js :8600 |
| `http://192.168.68.129/rasoi` | Atrium :80 → redirect to :8600 |
| `http://192.168.68.129:8600` | straight to the frontend |

### Updating a running copy

Source edits change nothing until you rebuild:

```bash
cd frontend && npm run build     # then restart
bash /home/mac/projects/rasoi/start.sh
```

---

## Layout

```
rasoi/
├── backend/
│   ├── main.py              FastAPI app, all routes
│   ├── data.db              SQLite database (WAL)
│   └── uploads/             recipe photos
├── frontend/
│   ├── next.config.ts       /api and /uploads rewrites to :8601
│   └── src/
│       ├── app/             recipes · recipes/[id] · menu · shopping
│       ├── components/      nav · recipe-card · recipe-form · ui
│       └── lib/             api · kitchen · cn
├── docs/
│   ├── requirements.md      the original brief
│   ├── data.md              authoritative schema
│   └── mom-guide.md         how to use it, written for mom
├── start.sh / stop.sh
```

## License

Not yet licensed. Everything here is my own work.
