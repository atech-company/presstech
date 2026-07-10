# PressTech — Enterprise AI Automation Platform

Production-grade SaaS platform for building intelligent bots, visual workflows, knowledge bases, and multi-channel integrations.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui → **Vercel** |
| Backend | Laravel 13, PHP 8.3+, Sanctum, Spatie Permission → **Shared hosting** |
| Database | MySQL / MariaDB |
| Cache/Queue | File + database drivers (no Redis required on shared hosting) |
| Storage | Local disk or S3-compatible object storage |

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- PHP 8.3+ with Composer
- MySQL 8+ (Laragon, XAMPP, or similar)

### 1. Frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo login:** `john@presstech.com` / `Password1` (MSW mocks enabled when `NEXT_PUBLIC_USE_MOCKS=true`)

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

API: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)

Swagger docs: [http://localhost:8000/api/documentation](http://localhost:8000/api/documentation)

## Project Structure

```
presstech/
├── src/                    # Next.js frontend (Feature-Driven Architecture)
│   ├── app/                # App Router pages
│   ├── features/           # Feature modules (auth, bots, workflows...)
│   ├── components/ui/      # shadcn/ui primitives
│   ├── hooks/              # Shared React hooks
│   ├── services/api/       # API client layer
│   ├── store/              # Zustand stores
│   └── mocks/              # MSW mock handlers (dev)
├── backend/                # Laravel API
│   ├── app/Modules/        # Domain modules
│   ├── app/Models/         # Eloquent models
│   └── routes/api.php      # API v1 routes
└── docs/DEPLOYMENT.md      # Shared hosting + Vercel guide
```

## Deployment

| App | Platform |
|-----|----------|
| Frontend (`/`) | [Vercel](https://vercel.com) |
| API (`/backend`) | Shared PHP hosting (document root → `backend/public`) |

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for step-by-step instructions, environment variables, cron jobs, and CORS/cookie setup.

## Environment Variables

- Frontend: `.env.example` → copy to `.env.local`
- Backend: `backend/.env.example` → copy to `backend/.env`

## License

Proprietary — PressTech Inc.
