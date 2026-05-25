# Expense Tracker

A mobile-first personal finance tracker built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, SQLite, and Recharts. It helps you log income and expenses quickly, manage categories, review transaction history, and understand spending trends.

## Features

- Email/password authentication with HTTP-only JWT cookies
- SQLite persistence for users, categories, and transactions
- Quick mobile-first transaction entry with category chips, payment buttons, and Today/Yesterday shortcuts
- Last-used category and payment method remembered in the browser
- Transaction search, filtering, sorting, editing, and deletion
- Custom categories with theme-token colors and protected default categories
- Dashboard totals for expenses, income, and net balance
- Analytics charts for category breakdown, payment methods, and monthly trends
- Light and dark themes
- Profile danger zone for deleting account data or the full account

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui local components in `src/components/ui`
- SQLite via `sqlite` and `sqlite3`
- JWT auth with `jsonwebtoken`
- Password hashing with `bcryptjs`
- Charts with Recharts
- Icons with Lucide React

## Getting Started

```bash
npm install
npm run init-db
npm run dev
```

Open `http://localhost:3000`.

For production-like checks:

```bash
npm run lint
npm exec tsc -- --noEmit
npm run build
```

## Environment

For local development, the app uses a dev-only JWT fallback. In production, set:

```bash
JWT_SECRET="replace-with-a-long-random-secret"
```

SQLite data is stored in `database.sqlite` at the project root. This is suitable for local or self-hosted use. For serverless deployment, move persistence to a hosted database.

## Project Structure

```text
src/
  app/
    api/              API routes for auth, expenses, categories, and debug checks
    layout.tsx        Root layout and metadata
    page.tsx          Auth gate and app entry
  components/         App screens and shadcn UI primitives
  context/            Auth and expense state providers
  lib/                Database, auth, mapping, and validation helpers
  types/              Shared TypeScript types
  utils/              Formatting and analytics helpers
scripts/
  init-db.js          Local SQLite schema initializer
public/
  site.webmanifest    Basic web app manifest
```

## Notes

- `/api/debug/db-check` is available only outside production.
- Security-question answers are hashed for new accounts; legacy plain answers can still verify so existing local users are not locked out.
- Default categories are created per user and cannot be deleted from the UI or API.
- UI color must come from `src/app/globals.css` theme tokens. Do not hardcode hex values or Tailwind palette classes in app screens.
- Category colors are stored as token names such as `chart-1`, not arbitrary color values.

## Good Next Features

- Natural-language quick add, such as `coffee 120 yesterday upi`
- One-tap presets for common transactions
- Recurring entries for salary, rent, subscriptions, and bills
- Monthly category budgets with progress bars
- CSV/XLSX export and import
- Receipt photo attachments, followed later by OCR
- Wallet/account tracking for cash, UPI, bank, and credit cards
- Tags for trips, projects, or shared spending
- Daily reminder prompts and spending insights
