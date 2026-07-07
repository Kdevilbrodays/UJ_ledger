# UDHAR LEDGER — Phase 4 of 4: Deploy & Handoff

Paste the Shared Reference above this prompt before sending to your AI.
Phases 1, 2, and 3 must be complete before starting this phase.

---

## WHAT TO BUILD IN THIS PHASE

Final polish, cross-device testing fixes, and GitHub Pages deployment preparation.
No new features — just making everything production-ready.

---

## TASKS (in this order)

### 1. Audit all files for these issues and fix any found:
- Any `alert()` calls → replace with inline error banner using `showError()`
- Any hardcoded color values → replace with CSS custom property references
- Any hardcoded font families → replace with CSS variable references
- Any `console.log` left in production code → remove
- Any missing `try/catch` around Supabase or Gemini calls → add
- Any input that allows amount ≤ 0 → add validation with inline error message
- Any input that allows empty party name → add validation

### 2. Responsive audit — fix any layout issues at 390px width:
- All buttons must be tappable (minimum 44px height)
- No horizontal scroll at 390px
- Modal must be full-width on mobile with 16px padding
- Balance ribbon SVG must scale correctly on narrow screens (use `viewBox` and `preserveAspectRatio`)
- Table/grid layouts must collapse to single column on mobile

### 3. Offline handling — verify and fix:
- `navigator.onLine` check on page load and on `window.addEventListener('online'/'offline')`
- Offline banner appears and Save buttons are disabled when offline
- Banner dismisses automatically when connection restored

### 4. Create `README.md` with exactly this content:

```markdown
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
```

### 5. Create `config.example.js`:
```javascript
// Copy this file to config.js and fill in your actual keys
// config.js is gitignored — never commit your real keys
const CONFIG = {
  GEMINI_API_KEY: "your-gemini-api-key-here",
  SUPABASE_URL: "https://your-project-id.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key-here"
};
```

### 6. Create `supabase-schema.sql`:
Extract the full SQL block from the SUPABASE DATA MODEL section of the Shared Reference and save it as a standalone file. This makes it easy for the user to run it in Supabase.

---

## FINAL OUTPUT — SETUP CHECKLIST

After all tasks above are complete, print this exact checklist for the user:

---

✅ Your App Is Ready — Here's What To Do Next

Everything is built. Do these steps once, in order.

**STEP 1 — Create your Supabase project**
1. Go to https://supabase.com → sign up with Google (free, no card needed)
2. Click "New Project" → name it "udhar-ledger" → set any database password → wait ~2 min
3. Go to: Project Settings → API
4. Copy your Project URL (e.g. https://abcxyz.supabase.co)
5. Copy your anon public key (starts with "eyJ...")

**STEP 2 — Set up database tables**
1. In Supabase dashboard → SQL Editor → New Query
2. Open `supabase-schema.sql` from your project folder → copy all contents → paste → click Run
3. You should see: "Success. No rows returned"

**STEP 3 — Get your Gemini API key**
1. Go to https://aistudio.google.com → sign in with Google
2. Click "Get API Key" → "Create API key"
3. Copy the key (starts with "AIza...")

**STEP 4 — Fill in config.js**
1. Copy `config.example.js` → rename the copy to `config.js`
2. Open `config.js` and fill in your three keys from Steps 1 and 3
3. Save the file

**STEP 5 — Test locally**
1. Double-click `index.html` → opens in Chrome
2. Add a party → if it saves and appears, Supabase works ✓
3. Go to Scan → pick any photo → if entries appear, Gemini works ✓
4. Send the `index.html` file to your phone via WhatsApp or USB → open in Chrome → confirm layout works

**STEP 6 — Push to GitHub**
1. Create a new public repo on github.com named `udhar-ledger`
2. Open terminal / Git Bash in your project folder and run:
```
git init
git add .
git commit -m "Initial build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/udhar-ledger.git
git push -u origin main
```

**STEP 7 — Enable GitHub Pages**
1. Go to your repo on GitHub → Settings → Pages
2. Source: "Deploy from branch" → Branch: main → Folder: / (root) → Save
3. Wait 2 minutes → your app is live at: https://YOUR_USERNAME.github.io/udhar-ledger/

**STEP 8 — Share**
Send the GitHub Pages URL to family members. Works in any browser, any device. No install needed.

⚠️ config.js is gitignored — your API keys stay private on your PC and are never on GitHub.

---
Setup complete. The app is live.

---

## DEFINITION OF DONE FOR PHASE 4
- [ ] No `alert()` calls anywhere
- [ ] No horizontal scroll at 390px
- [ ] All buttons at least 44px tall
- [ ] Offline banner works
- [ ] `README.md`, `config.example.js`, and `supabase-schema.sql` exist
- [ ] Setup checklist printed for user
