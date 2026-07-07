# UDHAR LEDGER — Phase 1 of 4: Foundation

Paste the Shared Reference above this prompt before sending to your AI.

---

## WHAT TO BUILD IN THIS PHASE

The complete project scaffold: folder structure, config, all CSS, and the shared JS utilities.
No screens yet. Just the foundation everything else will sit on.

---

## FILES TO BUILD (in this order)

### 1. `config.js`
```javascript
const CONFIG = {
  GEMINI_API_KEY: "your-gemini-api-key-here",
  SUPABASE_URL: "https://your-project-id.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key-here"
};
```

### 2. `.gitignore`
```
config.js
```

### 3. `styles/base.css`
- CSS custom properties for all colors, fonts, spacing scale (use design system from Shared Reference)
- CSS reset (box-sizing, margin 0, padding 0)
- Body background: `--color-bg` with SVG topographic texture pattern
- Font-face declarations pointing to Google Fonts CDN
- All `@keyframes`: `fadeUp`, `shimmer`
- Global transition rule

### 4. `styles/layout.css`
- Sticky header: app name "Udhar Ledger" left, slot for action button right
- Page shell: max-width 640px, centered, horizontal padding 16px
- Responsive: full-width on mobile, centered column on desktop
- Bottom floating action bar (for scan button)
- Back navigation row (← Party Name)

### 5. `styles/components.css`
- Party list card (name, balance, last activity)
- Transaction card with colored left border
- Balance summary block (large mono amount + label)
- Balance ribbon container (SVG strip placeholder — actual SVG drawn in JS)
- Modal overlay + modal card
- Form inputs (text, number, date)
- Primary + secondary buttons
- Inline error banner
- Offline banner
- Loading shimmer skeleton
- Empty state block

### 6. `supabase.js`
Full Supabase helper module. Load Supabase via CDN UMD build. Implement and export:
```javascript
function initSupabase()           // returns supabase client
async function getAllParties(db)   // ordered by last_activity desc
async function getParty(db, id)
async function getTransactions(db, partyId)  // ordered by date desc
async function addParty(db, name, phone)     // returns new party id
async function addTransaction(db, partyId, type, amount, date, note, source)
async function recalculateBalance(db, partyId)
async function searchPartyByName(db, name)   // ilike, returns Party | null
```
recalculateBalance implementation:
```javascript
async function recalculateBalance(db, partyId) {
  const { data: txns } = await db.from('transactions').select('type, amount').eq('party_id', partyId);
  const balance = txns.reduce((acc, t) => t.type === 'jama' ? acc + t.amount : acc - t.amount, 0);
  await db.from('parties').update({ current_balance: balance, last_activity: new Date().toISOString() }).eq('id', partyId);
  return balance;
}
```
Real-time subscription helper:
```javascript
function subscribeToParties(db, callback)  // calls callback on any parties table change
```

### 7. `app.js`
Shared utilities used by all pages:
```javascript
function formatCurrency(amount)     // "₹1,200" using DM Mono via CSS class
function formatDate(dateStr)        // "15 Jun 2026"
function formatRelativeDate(dateStr) // "Today", "Yesterday", "3 days ago"
function showError(message)         // renders inline error banner
function hideError()
function showLoading(message)       // renders shimmer + message
function hideLoading()
function getParam(key)              // URLSearchParams helper
```

---

## DEFINITION OF DONE FOR PHASE 1
- [ ] All 7 files exist with no syntax errors
- [ ] Opening `index.html` (even if empty) in Chrome shows the warm off-white background with faint topographic pattern
- [ ] No console errors on load
- [ ] `config.js` is in `.gitignore`

---

*When Phase 1 is complete, tell the user: "Phase 1 done. Open index.html in Chrome and confirm you see the warm off-white background. Then start Phase 2."*
