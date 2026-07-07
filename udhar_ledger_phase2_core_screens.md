# UDHAR LEDGER — Phase 2 of 4: Core Screens

Paste the Shared Reference above this prompt before sending to your AI.
Phase 1 must be complete before starting this phase. All files from Phase 1 are already present.

---

## WHAT TO BUILD IN THIS PHASE

The two main screens: the party list home screen and the individual party detail screen.
No AI scanning yet. Full Supabase integration. Fully functional ledger for manual use.

---

## FILES TO BUILD (in this order)

### 1. `index.html` — Party List (Home Screen)

Layout:
```
┌─────────────────────────────────┐
│  Udhar Ledger          [+ Add]  │  ← Sticky header
├─────────────────────────────────┤
│  [🔍 Search parties...]         │  ← Live filter input
├─────────────────────────────────┤
│  RAMESH TRADERS          ₹4,200 │  ← --color-udhar (they owe us)
│  Last: Udhar · 3 days ago       │
├─────────────────────────────────┤
│  SURESH BHAI            -₹800   │  ← --color-jama (we owe them)
│  Last: Jama · Today             │
├─────────────────────────────────┤
│        [📷 Scan Diary Page]     │  ← Floating bottom bar
└─────────────────────────────────┘
```

Behavior:
- On load: call `getAllParties(db)` → render party cards ordered by last_activity desc
- Live search: filter rendered list by name, case-insensitive, on every keypress
- Balance color: positive → `--color-udhar`, negative → `--color-jama`, zero → `--color-ink-muted`
- Balance label: positive → "(owes us)", negative → "(we owe)", zero → "(settled)"
- Each card click → navigate to `party.html?id={partyId}`
- `[+ Add]` button → open inline modal with: Name (text, required), Phone (text, optional) → on submit call `addParty(db, name, phone)` → close modal → re-render list
- `[📷 Scan Diary Page]` → navigate to `scan.html`
- Real-time: subscribe to parties table changes, re-render list on any change
- Empty state (no parties): "No parties yet. Tap + Add to get started."
- Empty state (search no results): "No match for '[query]'."

### 2. `party.html` — Individual Party Ledger

Layout:
```
┌─────────────────────────────────┐
│  ← Ramesh Traders               │  ← Back link to index.html
├─────────────────────────────────┤
│  Current Balance: ₹4,200        │  ← Large DM Mono, color-coded
│  (They owe us)                  │
│  Total Jama: ₹12,000            │
│  Total Udhar: ₹16,200           │
├─────────────────────────────────┤
│  [Balance Ribbon SVG]           │  ← Signature element
├─────────────────────────────────┤
│  TRANSACTIONS                   │
│  ┌─────────────────────────┐    │
│  │ UDHAR  ₹2,000  15 Jun   │    │  ← sage green left border
│  │ "Cement bags"           │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ JAMA   ₹5,000  12 Jun   │    │  ← dusty blue left border
│  └─────────────────────────┘    │
├─────────────────────────────────┤
│  [+ Add Jama]  [+ Add Udhar]    │
└─────────────────────────────────┘
```

Behavior:
- Read `id` from URL params → call `getParty(db, id)` + `getTransactions(db, id)`
- Show large balance, total jama, total udhar in summary block
- Balance Ribbon: render as inline SVG — horizontal timeline, jama bars rise above center line in `--color-jama`, udhar bars hang below in `--color-udhar`. X-axis = date (oldest left, newest right). Y-axis = amount (proportional). Smooth organic curves connecting bars, not jagged lines.
- Transactions list: newest first, each card shows type badge, amount in DM Mono, date, note if present
- `[+ Add Jama]` → modal: Amount (DM Mono input, required), Date (date picker, default today), Note (optional) → submit calls `addTransaction(db, id, 'jama', amount, date, note, 'manual')`
- `[+ Add Udhar]` → same modal wired to `'udhar'`
- After any transaction: call `recalculateBalance` → re-render summary + ribbon + list
- Empty state (no transactions): "No entries yet. Add one above or scan a diary page."

---

## DEFINITION OF DONE FOR PHASE 2
- [ ] Can add a new party from home screen
- [ ] Party appears in list with correct balance color
- [ ] Clicking party opens detail screen
- [ ] Can add Jama and Udhar transactions manually
- [ ] Balance updates correctly after each entry
- [ ] Balance ribbon renders and reflects transactions
- [ ] Live search filters the party list
- [ ] Works on 390px mobile screen width

---

*When Phase 2 is complete, tell the user: "Phase 2 done. Test adding a party and a few transactions. Confirm balances update. Then start Phase 3."*
