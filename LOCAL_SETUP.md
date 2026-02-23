# Local Setup Guide

## Prerequisites

- **PHP** 8.2+
- **Composer** 2.x
- **Node.js** 18+ and **npm**
- **Git**

---

## Quick Start (One Command)

```bash
composer setup
```

This single command will:
1. Install PHP dependencies (`composer install`)
2. Copy `.env.example` to `.env`
3. Generate the app key
4. Run database migrations
5. Install Node dependencies (`npm install`)
6. Build frontend assets (`npm run build`)

Then start the dev server:

```bash
composer dev
```

This runs all four dev processes concurrently:
- Laravel dev server (`php artisan serve`)
- Queue worker
- Log watcher
- Vite HMR dev server

Open **http://localhost:8000** in your browser.

---

## Manual Setup (Step by Step)

If you prefer to run each step yourself:

```bash
# 1. Install PHP dependencies
composer install

# 2. Create environment file
cp .env.example .env

# 3. Generate application key
php artisan key:generate

# 4. Run database migrations (uses SQLite by default — no DB setup needed)
php artisan migrate

# 5. Install Node dependencies
npm install

# 6. Start Vite dev server (in a separate terminal)
npm run dev

# 7. Start Laravel server (in another terminal)
php artisan serve
```

---

## Environment Configuration

The default `.env` works out of the box with SQLite. Only configure the extras below if you need them.

### Optional: MySQL / PostgreSQL

Uncomment and fill in the database block in `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel_cms
DB_USERNAME=root
DB_PASSWORD=
```

Then re-run migrations:

```bash
php artisan migrate
```

### Optional: Email / OTP Auth

The app uses [Resend](https://resend.com) for OTP email delivery:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

Leave blank to keep OTP emails logged to `storage/logs/laravel.log` during local dev.

### Optional: AI Features

Add your API keys to enable AI workspace features:

```env
OPENAI_API_KEY=sk-...
# MISTRAL_API_KEY=...
# GEMINI_API_KEY=...
```

---

## Useful Commands

```bash
# Run tests
composer test

# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Rebuild frontend assets
npm run build

# Watch logs in real-time
php artisan pail --timeout=0

# Explore routes
php artisan route:list

# Open interactive shell
php artisan tinker
```

---

## Production Build

When you want to run without the Vite dev server (e.g. staging):

```bash
npm run build
php artisan serve
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `php artisan` not found | Run from project root; ensure PHP is in your PATH |
| Assets not loading | Run `npm run dev` or `npm run build` |
| 500 error on first load | Run `php artisan key:generate` and `php artisan migrate` |
| Database errors | Delete `database/database.sqlite` and re-run `php artisan migrate` |
| Queue jobs not running | Start `php artisan queue:listen` in a separate terminal |
| Slow/no AI responses | Check API keys in `.env` |
