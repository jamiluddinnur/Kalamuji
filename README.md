# Kalamuji

Mobile-first PWA for Indonesian professional **real-time voice communication coaching** built with **Next.js (App Router)**, **Tailwind CSS**, **Neon (PostgreSQL)**, and **Gemini Live API** (native audio over WebSocket — no third-party TTS/STT).

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
3. Initialize Neon PostgreSQL tables (run `db/schema.sql` in Neon SQL Editor or via `psql`).
4. Start development server:
   ```bash
   npm run dev
   ```

## Vercel Environment Variables
- `DATABASE_URL` — Neon PostgreSQL connection string
- `GEMINI_API_KEY` — Google Gemini API key
- `GEMINI_LIVE_MODEL` — Native audio model for real-time voice (default: `gemini-2.5-flash-native-audio-preview-12-2025`)
- `GEMINI_VOICE_MODEL` — Fallback turn model (default: `gemini-2.5-flash`)
- `GEMINI_EVALUATOR_MODEL` — Post-session 4-indicator evaluator (default: `gemini-2.5-flash`)
- `ADMIN_EMAIL` — Admin login email for `/admin`
- `ADMIN_PASSWORD` — Admin login password for `/admin`
