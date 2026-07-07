# UDHAR LEDGER — Shared Reference (Read Before Every Phase)

> This project is a cross-platform personal family business ledger web app.
> Stack: Plain HTML + CSS + Vanilla JS. No npm. No frameworks. No build tools.
> Database: Supabase (CDN). AI Scan: Gemini 1.5 Flash API. Hosting: GitHub Pages.
> All API keys live in `config.js` which is gitignored — never hardcode them.

---

## TECHNICAL CONSTRAINTS (apply to all phases)

- No build tools. No npm. No React. No bundlers.
- Plain HTML + CSS + Vanilla JS only. Files openable directly via `file://` in Chrome.
- Supabase JS v2 via CDN: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>`
- All keys from `config.js`:
```javascript
const CONFIG = {
  GEMINI_API_KEY: "your-gemini-api-key-here",
  SUPABASE_URL: "https://your-project-id.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key-here"
};
```
- `.gitignore` must contain `config.js`
- UI fully responsive: works at 390px (phone) and 1280px (desktop)

---

## DESIGN SYSTEM (apply to all phases)

### Colors (CSS custom properties in base.css)
```css
:root {
  --color-bg:         #faf9f5;
  --color-surface:    #ffffff;
  --color-ink:        #141413;
  --color-ink-muted:  #6b6b68;
  --color-border:     #e8e5de;
  --color-accent:     #d97757;
  --color-accent-dim: #f0e0d8;
  --color-jama:       #6a9bcc;
  --color-jama-dim:   #ddeaf7;
  --color-udhar:      #788c5d;
  --color-udhar-dim:  #e4ebda;
}
```

### Fonts (Google Fonts CDN)
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Serif+Text:ital@0;1&family=DM+Sans:wght@400;500;600&family=DM+Mono&display=swap" rel="stylesheet">
```
- Display/names: `DM Serif Display`
- Body/notes: `DM Serif Text`
- UI/buttons: `DM Sans`
- All ₹ amounts: `DM Mono`

### Motion
- Page fade-in: `fadeUp` 0.3s ease
- Modal entrance: `fadeUp` 0.2s ease
- Loading shimmer: `shimmer` 1.4s ease infinite
- Global transitions: 0.15s ease on bg, color, box-shadow

### Components
- Cards: white surface, `border-radius: 10px`, `1px solid var(--color-border)`, `box-shadow: 0 1px 3px rgba(20,20,19,0.06)`
- Jama card left border: `3px solid var(--color-jama)`
- Udhar card left border: `3px solid var(--color-udhar)`
- Primary button: `background: var(--color-accent)`, white text, `DM Sans`, `border-radius: 8px`
- Secondary button: transparent, `--color-ink` text, `1px solid var(--color-border)`
- Inputs: `background: var(--color-bg)`, `1px solid var(--color-border)`, focus `1px solid var(--color-accent)`
- Amount inputs: `DM Mono` font
- Background texture: SVG topographic contour pattern at low opacity over `--color-bg`

### UI Tone
- Plain English labels. No jargon.
- Empty states: "No entries yet. Add one above or scan a diary page."
- Errors: calm inline banners, never `alert()`, never red modal popups.

---

## SUPABASE DATA MODEL

```sql
create table parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  current_balance numeric default 0,
  created_at timestamptz default now(),
  last_activity timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references parties(id) on delete cascade,
  amount numeric not null check (amount > 0),
  type text not null check (type in ('jama','udhar')),
  date date not null,
  note text,
  source text default 'manual' check (source in ('manual','scan')),
  created_at timestamptz default now()
);

alter table parties enable row level security;
alter table transactions enable row level security;
create policy "allow all" on parties for all using (true);
create policy "allow all" on transactions for all using (true);
alter publication supabase_realtime add table parties;
alter publication supabase_realtime add table transactions;
```

**Balance rule:** jama → `balance += amount`, udhar → `balance -= amount`. Always recalculate by summing all transactions, never increment manually.

**Date rule for scans:** `new Date().toISOString().split('T')[0]` — never from image content, never from user input.

---

## NAVIGATION MODEL
- `index.html` — home (party list)
- `party.html?id=PARTY_ID` — party detail
- `scan.html` — AI scan
- Each page reads params via `new URLSearchParams(window.location.search)`

---

## ERROR HANDLING (all phases)
- Supabase: check `{ data, error }` — show inline banner on error
- Gemini: try/catch — show calm message, keep image on screen
- Offline: `navigator.onLine` check — show banner, disable Save
- Never use `alert()`

---
