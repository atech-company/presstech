# PressTech Deployment Guide

Production setup: **Laravel API on shared PHP hosting** + **Next.js frontend on Vercel**.

## Architecture

| Component | Host | Example URL |
|-----------|------|-------------|
| Next.js frontend | Vercel | `https://yourdomain.com` |
| Laravel API | Shared hosting (subdomain) | `https://api.yourdomain.com` |
| MySQL database | Shared hosting | Provided by host |
| File storage | Shared hosting / S3 | `storage/` or object storage |
| Queue | Database driver + cron | No Redis required |
| Cache | File driver | No Redis required |

> **Auth note:** Session cookies require the frontend and API to share the same root domain (e.g. `yourdomain.com` + `api.yourdomain.com`). Point a custom domain at your Vercel project — do not rely on `*.vercel.app` for production login.

---

## 1. Backend — Shared Hosting (Laravel)

### Requirements

- PHP 8.3+
- MySQL 8.0+ or MariaDB 10.6+
- Composer (run locally, upload vendor, or use host SSH)
- Extensions: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`

### Upload layout

Create a subdomain (e.g. `api.yourdomain.com`) and set its **document root** to:

```
/path/to/your-site/backend/public
```

Upload the entire `backend/` folder. The web server must only expose `public/`.

### Install (SSH or local build)

```bash
cd backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

### Production `.env` (shared hosting)

```env
APP_NAME=PressTech
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_db_name
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

CACHE_STORE=file
QUEUE_CONNECTION=database
SESSION_DRIVER=database
SESSION_DOMAIN=.yourdomain.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none

SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com
FRONTEND_URL=https://yourdomain.com

FILESYSTEM_DISK=local
```

### Cron jobs (hPanel → Cron Jobs)

**Scheduler** (every minute):

```cron
* * * * * cd /home/user/api.yourdomain.com/backend && php artisan schedule:run >> /dev/null 2>&1
```

**Queue worker** (every minute — shared hosting has no long-running processes):

```cron
* * * * * cd /home/user/api.yourdomain.com/backend && php artisan queue:work --stop-when-empty --max-time=55 >> /dev/null 2>&1
```

### Permissions

```bash
chmod -R 775 storage bootstrap/cache
```

### SSL

Enable free SSL in your hosting panel for `api.yourdomain.com`.

### Health check

`GET https://api.yourdomain.com/up` should return `200 OK`.

---

## 2. Frontend — Vercel

### Connect repository

1. Import the repo in [Vercel](https://vercel.com).
2. **Root Directory:** leave as repo root (Next.js app is at `/`).
3. **Framework Preset:** Next.js (auto-detected).
4. **Build Command:** `npm run build`
5. **Output:** default (Next.js App Router)

### Environment variables (Vercel → Settings → Environment Variables)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` |

For local MSW mocks during development only:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_USE_MOCKS` | `true` |

Do **not** set `NEXT_PUBLIC_USE_MOCKS` in production.

### Custom domain

1. Vercel → Project → Settings → Domains → add `yourdomain.com`.
2. Point DNS (A/CNAME) as Vercel instructs.
3. Enable SSL (automatic on Vercel).

### Deploy

Push to your connected branch — Vercel builds and deploys automatically.

---

## 3. CORS & cookies checklist

After both sides are live:

1. `NEXT_PUBLIC_API_URL` on Vercel matches `APP_URL` on the API.
2. `SANCTUM_STATEFUL_DOMAINS` includes your Vercel custom domain (no `https://`, no trailing slash).
3. `SESSION_DOMAIN=.yourdomain.com` (leading dot, root domain only).
4. `SESSION_SAME_SITE=none` and `SESSION_SECURE_COOKIE=true` (required for cross-subdomain cookies over HTTPS).
5. `FRONTEND_URL` matches the Vercel custom domain.

Test login from `https://yourdomain.com` — the browser should receive session cookies from `api.yourdomain.com`.

---

## 4. Optional services (add later)

| Feature | Shared-hosting alternative |
|---------|---------------------------|
| Vector search (Qdrant) | [Qdrant Cloud](https://qdrant.tech/cloud/) |
| Object storage | Hostinger Object Storage / AWS S3 |
| Realtime (Reverb) | [Pusher](https://pusher.com) or Ably |
| Email | Hostinger SMTP / Mailgun / Resend |

---

## 5. Local development (no Docker)

Use [Laragon](https://laragon.org) or any local PHP + MySQL stack:

```bash
# Frontend
npm install
cp .env.example .env.local
npm run dev

# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Create a MySQL database in Laragon and set `DB_*` values in `backend/.env`.
