# Kalamuji

Mobile-first PWA for Indonesian professional voice communication coaching built with **Next.js (App Router)**, **Tailwind CSS**, **Neon (PostgreSQL)**, and **Gemini API**.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```
3. Run the Neon PostgreSQL schema:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables (Vercel & Local)
- `DATABASE_URL` — Neon PostgreSQL connection string
- `GEMINI_API_KEY` — Google Gemini API key
- `GEMINI_VOICE_MODEL` — Cost-efficient voice roleplay model (default: `gemini-2.5-flash`)
- `GEMINI_EVALUATOR_MODEL` — Post-session evaluator model (default: `gemini-2.5-flash`)
- `ADMIN_EMAIL` — Admin login email for `/admin`
- `ADMIN_PASSWORD` — Admin login password for `/admin`
- `ADMIN_SESSION_SECRET` — Random 32+ char secret used to sign `HttpOnly` session cookies
