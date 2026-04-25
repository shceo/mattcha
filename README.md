# mattcha

Minimalist dating app with a 15-message courtship mechanic and partner-venue recommendations.

**Stack:** Next.js 15 (App Router, TS, Tailwind) · FastAPI (async SQLAlchemy 2.0) · MySQL 8 · i18n RU/EN/UZ.

## Quick start (local)

### 1. MySQL
```bash
docker compose up -d
```
Database `mattcha` becomes available on `localhost:3306` (user `mattcha` / pass `mattcha`).

### 2. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
API: http://localhost:8000 · OpenAPI docs: http://localhost:8000/docs

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
App: http://localhost:3000

## Layout
```
mattcha/
├── backend/           FastAPI + SQLAlchemy + Alembic
├── frontend/          Next.js (App Router) + Tailwind + next-intl
└── docker-compose.yml MySQL
```

## Status

Phase 1 — scaffolding:
- [x] MySQL via docker-compose
- [x] FastAPI bootstrap, config, DB session, JWT auth, register/login (email or phone), `/auth/me`
- [x] Next.js shell, dark + matcha-green theme, i18n (ru/en/uz), landing page, language switcher

Phase 2 — anketa & photos:
- [x] `Profile` (gender locked) + `Photo` models + Alembic migration
- [x] `GET/POST/PATCH /profile/me`, `POST /profile/me/photos`, set-primary, delete; `/uploads` static mount
- [x] `/auth/register` + `/auth/login` pages (email-or-phone toggle, password confirm)
- [x] `/profile` page: create/edit anketa, gender radio locked after creation, geolocation helper, photo grid (upload, set-primary, delete)
- [x] `AuthNav` swaps header CTA to “Profile” once a token is present

Phase 3 — discovery feed:
- [x] `GET /discover?limit&offset` — opposite-gender filter, exclude self & banned, distance via haversine, primary-photo subquery
- [x] `/discover` page with elegant cards (cover photo, name+age, occupation, life-goals snippet, distance), pagination, empty / no-profile / loading states
- [x] `Discover` link in header for authed users

Phase 4 — match & chat:
- [x] `Match` (with `initiator_id`/`recipient_id`/`status`/`quota_limit`/`quota_used`/`matched_at`) + `Message` models, migration, `uq_match_pair`
- [x] `POST /matches/with/{user_id}` get-or-create (man only initiates, opposite-gender check)
- [x] `GET /matches` inbox with last-message preview; `GET /matches/{id}` detail; `GET /matches/{id}/messages?after=N`
- [x] `POST /matches/{id}/messages` — quota deduct + auto-flip to `expired` on 15th send
- [x] `POST /matches/{id}/agree` (recipient only, `open` → `matched`)
- [x] `POST /matches/{id}/extend` (recipient only) — `+N` or `unlimited`
- [x] `/chat/[user_id]` page with 3-second polling, sticky composer, quota counter, agree/extend popover, matched/expired banners, friendly “wait for him” UI for women trying to initiate
- [x] `/matches` inbox page with avatars, status badges, last-message timestamp
- [x] Header gets `Lenta`/`Inbox`/`Profile` for authed users

Phase 5 — venues & midpoint recommendation:
- [x] `Venue` + `PromoCode` models, migration, `services/geo.midpoint`
- [x] `GET /matches/{id}/venues` — only after `matched`, computes midpoint and returns top-N active venues by distance with active promos
- [x] `/match/[id]/venues` page with Leaflet map (OpenStreetMap tiles, custom matcha pins, midpoint highlighted) + venue cards (image, distance from midpoint, address, promo chips, "Open in Maps")

Phase 6 — admin panel:
- [x] `/admin/users?q=&limit=&offset=` (with profile join + primary photo), `POST /admin/users/{id}/ban|unban`, `DELETE /admin/users/{id}` (admin can't ban/delete self)
- [x] `/admin/venues` CRUD: `POST/PATCH/DELETE`, includes nested promos in list response
- [x] `POST /admin/venues/{id}/promos`, `PATCH/DELETE /admin/promos/{id}`
- [x] `python -m scripts.make_admin <email_or_phone>` — promote a user to admin
- [x] `/admin` page with tabs Users / Venues, search, ban/unban/delete buttons, inline venue editor with geolocation, nested promo CRUD
- [x] `Admin` link in header appears only for users whose `/auth/me` returns `role=admin`

## Bootstrap an admin

```bash
cd backend
source .venv/bin/activate
python -m scripts.make_admin user@example.com
```
