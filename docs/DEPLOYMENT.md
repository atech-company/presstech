# PressTech Deployment Guide

Production URLs:

| Component | URL |
|-----------|-----|
| **Frontend** | https://presstech.vercel.app |
| **Backend API** | https://presstech.atechleb.com |

---

## Architecture

| Component | Host | URL |
|-----------|------|-----|
| Next.js frontend | Vercel | `https://presstech.vercel.app` |
| Laravel API | Shared PHP hosting (atechleb.com) | `https://presstech.atechleb.com` |
| MySQL | Shared hosting | Provided by host |
| Queue | Database driver + cron | No Redis required |

> **Auth note:** Frontend and API are on different domains (`vercel.app` vs `atechleb.com`). Session cookies use `SameSite=None; Secure`. Both domains must use HTTPS.

---

## 1. Backend — presstech.atechleb.com

### Requirements

- PHP 8.3+
- MySQL 8.0+ or MariaDB 10.6+
- Composer
- Extensions: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`

### Hostinger / cPanel setup

1. Create subdomain **`presstech`** → `presstech.atechleb.com`
2. Set **document root** to the `backend/public` folder inside your upload:
   ```
   /home/user/domains/atechleb.com/public_html/presstech/backend/public
   ```
3. Enable **Free SSL** for `presstech.atechleb.com`
4. Create a MySQL database and user in the hosting panel

### Upload

Upload the entire `backend/` folder (via FTP, File Manager, or Git). Do **not** expose anything outside `public/`.

### Install (SSH or local, then upload vendor)

```bash
cd backend
composer install --no-dev --optimize-autoloader
cp .env.production.example .env
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

### Production `.env`

Use `backend/.env.production.example` as the template. Key values:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://presstech.atechleb.com

FRONTEND_URL=https://presstech.vercel.app
CORS_ALLOWED_ORIGINS=https://presstech.vercel.app

SESSION_DOMAIN=presstech.atechleb.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none

SANCTUM_STATEFUL_DOMAINS=presstech.vercel.app

DB_DATABASE=your_db_name
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

QUEUE_CONNECTION=database
```

Add your AI keys (`DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, etc.).

### Cron jobs (required for knowledge indexing + queues)

In hPanel → **Cron Jobs**, add both (adjust path):

```cron
* * * * * cd /home/user/.../backend && php artisan schedule:run >> /dev/null 2>&1
* * * * * cd /home/user/.../backend && php artisan queue:work --stop-when-empty --max-time=55 >> /dev/null 2>&1
```

### Permissions

```bash
chmod -R 775 storage bootstrap/cache
```

### Health check

```bash
curl https://presstech.atechleb.com/up
```

Should return `200 OK`.

### WhatsApp AI chatbot (Wasender)

PressTech links any WhatsApp number via Wasender (Linked Devices / QR), not Meta Cloud API.

**Register a number (dashboard):**

1. Create or open a WhatsApp integration and pick the **bot** that should reply.
2. Paste your **Wasender Personal Access Token** (Wasender → Settings).
3. Enter the **phone number** in international digits only (e.g. `96170123456`).
4. Click **Register number & Show QR** — PressTech creates the Wasender session (or reuses one for that phone), sets the webhook, and returns a QR.
5. On that phone open WhatsApp → **Linked Devices** → scan the QR.
6. Wait until status shows connected + webhook configured + API key saved.
7. Message that number from another phone — the linked bot replies via AI.

Webhook URL (set automatically on setup; `APP_URL` must be public HTTPS):
```
https://presstech.atechleb.com/api/v1/webhooks/{integration-id}
```

**Notes:**
- Requires a Wasender account with available session quota.
- Session limits depend on your Wasender plan.
- This is a linked-device model, not official WhatsApp Business Cloud API.

---

## 2. Frontend — presstech.vercel.app

### Connect repository

1. Import [atech-company/presstech](https://github.com/atech-company/presstech) in [Vercel](https://vercel.com)
2. **Root Directory:** repo root (`/`)
3. **Framework:** Next.js (auto-detected)

### Environment variables

Set in Vercel → Project → Settings → Environment Variables:

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_API_URL` | `https://presstech.atechleb.com` |

`vercel.json` already sets this as a default — confirm it in the Vercel dashboard.

Do **not** set `NEXT_PUBLIC_USE_MOCKS` in production.

### Deploy

Push to `master` — Vercel builds automatically. Your app will be at:

**https://presstech.vercel.app**

### Optional custom domain

To use your own domain later (e.g. `app.atechleb.com`):

1. Add domain in Vercel → Settings → Domains
2. Update backend `.env`:
   - `FRONTEND_URL=https://app.atechleb.com`
   - `CORS_ALLOWED_ORIGINS=https://app.atechleb.com`
   - `SANCTUM_STATEFUL_DOMAINS=app.atechleb.com`
3. Run `php artisan config:cache` on the server

---

## 3. Post-deploy checklist

- [ ] `https://presstech.atechleb.com/up` returns 200
- [ ] `https://presstech.vercel.app` loads the login page
- [ ] Login works (demo: `john@presstech.com` / `Password1` if seeded)
- [ ] Cron jobs running (knowledge sources index, not stuck on `pending`)
- [ ] AI replies work in bot chat (DeepSeek/OpenRouter keys set)
- [ ] WhatsApp: register phone → scan QR → inbound message gets AI reply (webhook on `presstech.atechleb.com`)

### CORS & cookies

| Setting | Value |
|---------|-------|
| `NEXT_PUBLIC_API_URL` | `https://presstech.atechleb.com` |
| `APP_URL` | `https://presstech.atechleb.com` |
| `FRONTEND_URL` | `https://presstech.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | `https://presstech.vercel.app` |
| `SANCTUM_STATEFUL_DOMAINS` | `presstech.vercel.app` |
| `SESSION_DOMAIN` | `presstech.atechleb.com` |
| `SESSION_SAME_SITE` | `none` |
| `SESSION_SECURE_COOKIE` | `true` |

---

## 4. Local development

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
php artisan db:seed
php artisan serve

# Queue (for knowledge crawl)
php artisan queue:work
```

Local URLs: frontend `http://localhost:3000`, API `http://localhost:8000`

---

## 5. Troubleshooting

| Issue | Fix |
|-------|-----|
| Login works locally but not on Vercel | Check `SANCTUM_STATEFUL_DOMAINS`, CORS, and cookie settings above |
| Knowledge stuck on `pending` | Start cron / `php artisan queue:work` |
| 500 on API | Check `storage/logs/laravel.log`, permissions on `storage/` |
| CORS error in browser | Frontend proxies via Vercel `/api/v1` — redeploy frontend; or set `CORS_ALLOWED_ORIGINS` on backend |
| `PailServiceProvider not found` | Delete `bootstrap/cache/packages.php` and `bootstrap/cache/services.php` on server |
| WhatsApp no replies | Webhook must be public HTTPS; check Wasender session + bot link |
