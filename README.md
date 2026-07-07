# Udhar Ledger

Personal family business ledger app. Tracks Jama (money received) and Udhar (credit given) across multiple parties. Includes AI-powered diary scan using Gemini 1.5 Flash.

## Setup

1. Clone this repo
2. Create `config.js` in the root (see `config.example.js` for structure)
3. Fill in your Supabase URL, Supabase anon key, and Gemini API key
4. Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor
5. Open `index.html` in Chrome

## Deploy

Push to GitHub → enable GitHub Pages from repo Settings → Pages → main branch root.

## Tech

Plain HTML + CSS + Vanilla JS. No build step. No npm.
