# Kalamuji

Mobile-first PWA for Indonesian professional voice communication coaching built with **Next.js (App Router)**, **Tailwind CSS**, **Neon (PostgreSQL)**, and **Gemini API**.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
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
