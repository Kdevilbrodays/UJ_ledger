# UDHAR LEDGER — Phase 5: Navigation Menu & Settings

Paste the Shared Reference above this prompt before sending to your AI.
Phases 1–4 must be complete before starting this phase. All files from those phases already exist and must not be redesigned — only extended.

---

## CONTEXT FOR THE AGENT

Right now the app has three pages (`index.html`, `party.html`, `scan.html`) but no shared navigation — each page is a dead end you can only leave via a back-arrow or by editing the URL. This phase adds:

1. A **global navigation drawer** reachable from every page, including a quick way to jump straight into any single person's ledger.
2. A new **`settings.html`** page for data management, with a heavily-guarded **Clear All Data** action plus a few other settings that responsibly round it out (backup export, per-party delete, connection status, about).

Do not introduce a build step, framework, or component system. This is still plain HTML + CSS + vanilla JS with no npm, per the Shared Reference. Because there are no templates/partials, the nav drawer markup must be duplicated (identical) inside every page's `<body>`.

---

## STEP 0 — PRE-FLIGHT: AUDIT UDHAR vs. JAMA SEMANTICS (do this before touching any file)

Before writing or modifying anything in this phase, read every existing project file (`index.html`, `party.html`, `scan.html`, `app.js`, `supabase.js`, `gemini.js`, all files in `styles/`, `supabase-schema.sql`, and every `udhar_ledger_phase*.md` / shared reference doc) and confirm every one of them agrees with this single definition:

- **Udhar** = money someone **borrowed from us** (credit we extended to them). Each udhar entry **increases** how much that party owes us.
- **Jama** = money a party **gives back to us** (a payment received). Each jama entry **decreases** how much that party owes us.
- Therefore: a **positive** `current_balance` means *they owe us* (driven up by udhar), and a **negative** balance means *we owe them / they've overpaid* (driven down by jama). This is the direction already used by the working balance formula in `index.html`, `party.html`, and `supabase.js` (`udhar: +`, `jama: -`) — treat that as the source of truth, not the older prose descriptions in `udhar_ledger_shared_reference.md` or `udhar_ledger_phase1_foundation.md`, which currently state the formula backwards (`jama: +`, `udhar: -`) and should be corrected to match the code, not the other way around.

Specifically check, and fix if wrong, before proceeding:
1. **Balance sign convention** — every place a balance or running total is computed must use `udhar: +amount, jama: -amount`. Flag any file that does the reverse.
2. **Color-token wiring** — `--color-udhar` should visually represent "owed to us" states (positive balances, udhar-type transactions) and `--color-jama` should represent "paid to us" states (negative/reducing balances, jama-type transactions). Check `styles/components.css` in particular: `.party-card__balance--positive` and `--negative` currently point at `--color-jama` and `--color-udhar` respectively — the reverse of what the naming implies and of what `udhar_ledger_phase2_core_screens.md`'s own mockup describes. Reconcile this (and the matching `.txn-card--jama/--udhar` and `.balance-summary__amount--*` rules) so the color a user sees always matches the transaction type or balance direction it's meant to represent.
3. **New Phase 5 code** — anything you add in this phase (Settings page balance/party-count copy, backup JSON structure, any label referencing "owed" or a balance sign) must follow the same convention above. Do not introduce a third, different interpretation.
4. **Report back** — before moving on to Step 1, tell the user in plain language exactly what (if anything) you found inconsistent and what you changed. If you find a discrepancy you're not fully sure how to resolve, stop and ask rather than guessing.

---

## FILES TO BUILD / MODIFY (in this order)

### 1. `styles/base.css` — add two color tokens
Extend the existing `:root` block, do not replace it:
```css
--color-danger:      #c0524a;
--color-danger-dim:  #f6e2df;
```
Keep it in the same warm, muted palette as the rest of the design system — not a jarring pure red.

Add one new keyframe alongside the existing `fadeUp`/`shimmer`:
```css
@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}
```

### 2. `styles/layout.css` — nav drawer + header trigger
- `.nav-trigger`: the ☰ button. 44×44px minimum tap target, transparent background, sits at the **left edge** of every page's header, before the title.
- `.nav-drawer-overlay`: fixed, full-viewport, `background: rgba(20,20,19,0.4)`, hidden by default (`hidden` attribute), fades in like the existing modal overlay.
- `.nav-drawer`: fixed left panel, `width: 85%`, `max-width: 320px`, full height, `background: var(--color-surface)`, `box-shadow` on right edge, `animation: slideInLeft 0.2s ease`.
- `.nav-drawer__header`, `.nav-drawer__close` (✕ button, 44px target).
- `.nav-drawer__section` + `.nav-drawer__section-label` (small caps label like "JUMP TO A LEDGER").
- `.nav-drawer__link`: full-width row, icon + label, 44px min height, hover/focus state using `--color-accent-dim`.
- `.nav-drawer__link[aria-current="page"]`: subtle `--color-accent-dim` background so the current page is visibly disabled/highlighted.
- `.nav-drawer__party-item`: compact row reusing the party-card visual language (name left, small mono balance right) but lighter weight than the full card on `index.html`.
- Must work at 390px width with no horizontal scroll (same audit standard as Phase 4).

### 3. `styles/components.css` — settings & danger zone
- `.settings-section`, `.settings-section__title`, `.settings-row` (label left, control/button right, 1px bottom border between rows).
- `.settings-section--danger`: `3px solid var(--color-danger)` left border, `--color-danger-dim` tinted background, extra top margin so it's visually separated from the rest of the page — this must not sit next to harmless settings by accident.
- `.btn--danger`: `background: var(--color-danger)`, white text, same shape as `.btn--primary`.
- Confirmation modal reuses the existing `.modal-overlay` / `.card.modal` pattern — no new overlay system needed here.
- `.confirm-input`: text input used for the type-to-confirm field, same style as `.form-input`.

### 4. `app.js` — shared nav drawer logic

Add these functions (used by every page):

```javascript
async function initNavDrawer(db, currentPage) {
  // currentPage: 'index' | 'party' | 'scan' | 'settings'
  // Wires: trigger button, close button, backdrop click, Escape key
  // Marks the matching .nav-drawer__link with aria-current="page"
  // Lazily loads the party quick-list into .nav-drawer__party-list on first open
  // Wires the live filter input (#nav-party-search) to re-filter that list on keyup
}

function openNavDrawer() { /* remove hidden, trap focus, animate in */ }
function closeNavDrawer() { /* re-add hidden after animation, return focus to trigger */ }
```

Behavior details:
- Fetch parties for the quick-list with the existing `getAllParties(db)` — do not create a second query path.
- Quick-list shows all parties ordered by `last_activity desc` (same order as home), each row shows name + `formatCurrency(current_balance)` colored the same way `index.html` already colors balances.
- Filtering the quick-list is case-insensitive substring match on name, same logic as the existing home-screen search — reuse it, don't reimplement it differently.
- Clicking a party row navigates to `party.html?id={id}`.
- Clicking "All Parties" navigates to `index.html`.
- Clicking "Scan Diary Page" navigates to `scan.html`.
- Clicking "Add New Party" navigates to `index.html?action=add-party` — `index.html` should check this param on load and auto-open the existing add-party modal.
- Clicking "Settings" navigates to `settings.html`.
- Escape key or backdrop click closes the drawer without navigating.

### 5. Nav drawer markup — paste into every page

Add this identical block immediately after the opening `<body>` tag of `index.html`, `party.html`, `scan.html`, and the new `settings.html`:

```html
<div class="nav-drawer-overlay" id="nav-drawer-overlay" hidden>
  <nav class="nav-drawer" id="nav-drawer" aria-label="Main navigation">
    <div class="nav-drawer__header">
      <span class="app-header__title">Udhar Ledger</span>
      <button class="nav-drawer__close" id="nav-drawer-close" aria-label="Close menu">✕</button>
    </div>

    <div class="nav-drawer__section">
      <a href="index.html" class="nav-drawer__link" data-page="index">🏠 All Parties</a>
      <a href="scan.html" class="nav-drawer__link" data-page="scan">📷 Scan Diary Page</a>
      <a href="index.html?action=add-party" class="nav-drawer__link">➕ Add New Party</a>
    </div>

    <div class="nav-drawer__section">
      <div class="nav-drawer__section-label">Jump to a ledger</div>
      <input type="text" id="nav-party-search" class="form-input" placeholder="🔍 Find a person..." aria-label="Find a party">
      <div id="nav-party-list" class="nav-drawer__party-list"></div>
    </div>

    <div class="nav-drawer__section">
      <a href="settings.html" class="nav-drawer__link" data-page="settings">⚙️ Settings</a>
    </div>
  </nav>
</div>
```

And add a `.nav-trigger` button as the **first element** inside each page's existing header (the `.app-header` on `index.html`, and a new small header added above the `.back-nav` on `party.html` / `scan.html` so the menu is reachable from those pages too):
```html
<button class="nav-trigger" id="nav-trigger" aria-label="Open menu">☰</button>
```

### 6. `settings.html` — new page

Follow the same shell pattern as `party.html` (`.page-shell`, `.back-nav` back to `index.html`, plus the nav-trigger/drawer from step 5). Title: "Settings".

**Section: Data**
- Row — "Export backup": button "Download Backup" → calls `exportAllData(db)`, builds a JSON blob, triggers download named `udhar-ledger-backup-YYYY-MM-DD.json`. Put this above the danger zone and mention it there too (see below) — a working backup path is what makes the delete-all action safe to offer at all.
- Row — "Manage parties": expandable list of all parties, each with a small "Delete" button. Deleting a single party opens a confirm modal ("Delete Ramesh Traders and all N of their transactions? This can't be undone.") with a plain Cancel/Delete choice — no typed confirmation needed here since it's scoped to one person, not the whole database.

**Section: About**
- App name, one-line tech description ("Plain HTML + CSS + vanilla JS · Supabase · Gemini 1.5 Flash"), and a connection-status badge: "Connected to Supabase" or "Demo mode (data stored on this device only)" depending on whether `CONFIG` still has placeholder values (reuse the same check `initSupabase()` already does).

**Section: Danger Zone** (`.settings-section--danger`, placed last, clearly separated)
- Row — "Clear all data": button `.btn--danger` labeled "Clear All Data" opens a confirmation modal, not a `confirm()` popup:
  - Modal copy: "This permanently deletes **all parties and all transactions** from the database. This cannot be undone."
  - Show a live count fetched on open: "This will delete {N} parties and {M} transactions."
  - A reminder line + link back to the Export Backup action above, in case the user hasn't backed up.
  - A text input: "Type DELETE to confirm." The "Confirm Delete" button stays `disabled` until the input value exactly matches `DELETE` (case-sensitive), checked on every keystroke.
  - On confirm: call `clearAllData(db)`, show an inline success banner ("All data cleared."), then redirect to `index.html` after ~1.5s, where the existing "No parties yet" empty state will naturally show.
  - Wrap the call in try/catch and use `showError()` on failure — never `alert()`, consistent with the rest of the app.

### 7. `supabase.js` — new functions

```javascript
async function deleteParty(db, partyId) {
  const { error: txError } = await db.from('transactions').delete().eq('party_id', partyId);
  if (txError) throw txError;
  const { error: partyError } = await db.from('parties').delete().eq('id', partyId);
  if (partyError) throw partyError;
}

async function clearAllData(db) {
  const { error: txError } = await db.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (txError) throw txError;
  const { error: partyError } = await db.from('parties').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (partyError) throw partyError;
}

async function getDataCounts(db) {
  const { data: parties, error: pErr } = await db.from('parties').select('id');
  if (pErr) throw pErr;
  const { data: txns, error: tErr } = await db.from('transactions').select('id');
  if (tErr) throw tErr;
  return { parties: (parties || []).length, transactions: (txns || []).length };
}

async function exportAllData(db) {
  const parties = await getAllParties(db);
  const transactions = [];
  for (const p of parties) {
    const txns = await getTransactions(db, p.id);
    transactions.push(...txns);
  }
  return { exported_at: new Date().toISOString(), parties, transactions };
}
```

**Required fix in the same file:** `createDemoDb()` (the `localStorage` fallback used in demo mode) does not currently implement a `.delete()` chain — only `select`, `insert`, `update`. Add a `delete()` method to the demo table `methods` object that supports `.eq(col, val)` and `.neq(col, val)`, removes matching rows from the stored array, and resolves `{ error: null }`, so `deleteParty` and `clearAllData` work identically in demo mode and against real Supabase. This matters for anyone testing the app before filling in `config.js`.

### 8. Wire-up on each page

- `index.html`: on load, check `getParam('action') === 'add-party'` → auto-open the existing add-party modal.
- `party.html`, `scan.html`, `settings.html`: call `initNavDrawer(db, 'party' | 'scan' | 'settings')` alongside their existing init code.
- `index.html` also calls `initNavDrawer(db, 'index')`.

---

## DEFINITION OF DONE FOR PHASE 5
- [ ] Step 0 audit done: Udhar/Jama balance-sign convention and color-token wiring verified consistent across every file (and the `components.css` positive/negative swap + shared-reference doc wording were reconciled), with findings reported to the user
- [ ] ☰ button visible and reachable on all four pages (index, party, scan, settings)
- [ ] Drawer opens/closes via trigger, ✕, backdrop click, and Escape key
- [ ] Quick-list inside drawer shows all parties, filters live, and jumps straight to that party's ledger
- [ ] "Add New Party" from the drawer opens the add-party modal on the home screen
- [ ] `settings.html` exists with Data, About, and Danger Zone sections
- [ ] Export Backup downloads a valid JSON file containing every party and transaction
- [ ] Deleting a single party removes it and its transactions, with a plain confirm step
- [ ] Clear All Data is blocked behind a typed "DELETE" confirmation and a live row-count warning
- [ ] Clear All Data works in both real Supabase mode and demo/localStorage mode
- [ ] No `alert()` or `confirm()` used anywhere in this phase's code
- [ ] Everything still works with no horizontal scroll at 390px width

---

*When Phase 5 is complete, tell the user: "Phase 5 done. Open the menu from any page and confirm you can jump to a party's ledger. Then visit Settings, download a backup, and test Clear All Data on a test party before trusting it with real data."*
