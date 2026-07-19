# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Udhar Ledger is a personal/family business ledger app tracking **Jama** (money received) and **Udhar** (credit given) to multiple parties. Features AI-powered diary page scanning using Gemini 1.5 Flash.

**Tech Stack**: Plain HTML + CSS + Vanilla JavaScript, no build step, no npm.

## Development Setup

1. **Configure**: Copy `config.example.js` to `config.js` and fill in Supabase URL/anon key and Gemini API key. The file is gitignored.
2. **Database**: Run `supabase-schema.sql` in your Supabase SQL Editor to create tables and enable RLS.
3. **Run**: Open `index.html` directly in Chrome (no local server required for development).
4. **Deploy**: Push to GitHub and enable GitHub Pages from repo Settings → Pages → main branch root.

## Key Files

- **config.js**: API keys (gitignored). Uses placeholder defaults that trigger demo mode.
- **supabase.js**: Database operations with demo mode fallback when keys are placeholders. Key functions: `initSupabase()`, `getAllParties()`, `getParty()`, `addParty()`, `addTransaction()`, `recalculateBalance()`, `subscribeToParties()`.
- **gemini.js**: AI scanning logic for handwritten diary pages. Handles automatic fallback from `gemini-3.5-flash` to `gemini-2.5-pro` during high demand. Timeout at 45s.
- **app.js**: Shared utilities across all pages. Functions: `formatCurrency()`, `formatDate()`, `formatRelativeDate()`, `showError()`, `showLoading()`, `showToast()`, modal helpers, nav drawer, party search with Fuse.js, offline detection.
- **styles/base.css**, **layout.css**, **components.css**: Linked directly, no build step. DM Serif fonts for headings, DM Sans for body, DM Mono for currency.

## Architecture

- **Pages**:
  - `index.html`: List all parties, view balances, add new parties
  - `party.html`: Individual party details, Jama/Udhar entries, transaction history
  - `scan.html`: AI-powered diary page scanner using Gemini (scans Jama/Udhar split across page)
  - `settings.html`: Data export/import, Clear All, demo mode toggles

- **Data Model**:
  - `parties`: id, name, phone, current_balance, created_at, last_activity
  - `transactions`: id, party_id, type ('jama'|'udhar'), amount, date, note, source ('manual'|'scan'), created_at
  - Balance is calculated on every transaction (balance = sum of udhar - sum of jama)
  - Real-time subscriptions via Supabase Realtime for live updates

- **Party Search**: Global fuzzy search using Fuse.js, triggered from header search icon or nav drawer. Results show name with highlighted matches and current balance.

## Common Patterns

- **Demo Mode**: If `config.js` contains placeholder values (e.g., "your-project-id"), `initSupabase()` returns a localStorage-backed mock client. This allows development without a live Supabase instance.
- **Model Fallback**: In `scan.html`, if Gemini API returns a 503 "high demand" error, automatically switch to `gemini-2.5-pro` for ~1 hour and notify via toast.
- **Offline Detection**: `initOfflineDetection()` disables save buttons when offline and shows an offline banner.
- **Modal System**: `openModal()` and `closeModal()` handle focus trapping, Escape-to-close, and click-outside-to-close. Uses a shared registry for all open modals.
- **Date Handling**: All dates stored as ISO strings. Display functions use locale-aware formatting (en-IN style: "15 Jun 2026").
- **Currency**: `formatCurrency()` uses `toLocaleString('en-IN')` for Indian formatting, prefixed with ₹.

## Database Operations

All Supabase calls return `{ data, error }` objects. Pattern:
```javascript
const { data, error } = await db.from('table').select('*').eq('id', id);
if (error) throw error;
```

Transaction flow when adding a Jama/Udhar:
1. Insert transaction record
2. Call `recalculateBalance(partyId)` which:
   - Fetches all transactions for party
   - Sums udhar (+) and jama (-)
   - Updates party's `current_balance`
   - Updates `last_activity`
   - Returns new balance
