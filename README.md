# Feedback Portal

A feedback portal for Ben's projects — built with Next.js, Tailwind CSS, shadcn/ui, and Supabase.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Postgres, RLS)
- **Deploy**: Vercel

## Features

- 🌐 Browse all approved feedback (public)
- 📝 Multi-step feedback submission (authenticated + verified email required)
- 🛡️ Admin dashboard (approve/reject feedback, manage users)
- 👥 User roles: admin, user, viewer
- 🔍 Site filtering (Hub, Website, Stats, Stocks, Hardware, Software, Railway)

## Setup

### 1. Clone & Install

```bash
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Copy `.env.local.example` to `.env.local` and fill in the values
4. Go to **SQL Editor** in Supabase and run `supabase-setup.sql`
5. Enable **Email** auth in **Authentication > Providers**

### 3. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

```bash
npm run build
vercel --prod
```

Make sure to set the environment variables in Vercel dashboard.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |

## User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access — approve/reject feedback, manage users |
| `user` | Submit feedback, see approved + own pending |
| `viewer` | See approved + pending (if enabled), cannot submit |

## Notes

- Ben's email (`benjamin.job@gwern.co.uk`) is automatically set as admin on first signup
- Email verification is required before submitting feedback
- The admin dashboard is at `/admin` (only accessible to admins)
