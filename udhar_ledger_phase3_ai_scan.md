# UDHAR LEDGER — Phase 3 of 4: AI Diary Scan

Paste the Shared Reference above this prompt before sending to your AI.
Phases 1 and 2 must be complete before starting this phase.

---

## WHAT TO BUILD IN THIS PHASE

The AI-powered diary scan screen. User photographs a handwritten diary page, the app extracts Jama and Udhar entries using Gemini 1.5 Flash, shows a review panel, and saves confirmed entries to Supabase.

---

## FILES TO BUILD (in this order)

### 1. `gemini.js`

```javascript
async function scanDiaryPage(imageBase64, mimeType)
// Returns: { jama: [{name, amount}], udhar: [{name, amount}], ambiguous: [{name, amount}] }
// Throws on API error or unparseable response
```

API call details:
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`
- Method: POST
- Body: multimodal message with image (base64) + text prompt

Exact prompt text to send:
```
You are reading a photograph of a single handwritten Indian business ledger diary page.

CRITICAL LAYOUT RULE: Both JAMA and UDHAR entries appear on the SAME page, split by a vertical line or implied column boundary down the middle of the page:
- LEFT HALF of the page = JAMA: people/firms who GAVE money to us or made a payment to us.
- RIGHT HALF of the page = UDHAR: people/firms who BORROWED money or goods from us on credit.

There is no separate page for each side. Both columns are visible simultaneously in the same photograph. Use the physical left/right position of each entry on the page to determine whether it is Jama or Udhar — do not guess from context.

Each entry contains a NAME and an AMOUNT in Indian Rupees. Names are written in English.
Amounts may be written as numerals (1000, 1,500), in words ("two thousand"), or abbreviations ("2k", "1.5k"). Convert all to integers.

Return ONLY a valid JSON object. No explanation. No markdown. No code fences. Exactly this structure:
{
  "jama": [{"name": "Name as written", "amount": 1000}],
  "udhar": [{"name": "Name as written", "amount": 2500}]
}

If one half is empty or illegible, return an empty array for that side.
If the image is not a ledger page at all, return {"jama": [], "udhar": [], "error": "Not a ledger page"}.
If an entry's left/right position is ambiguous, include it in both arrays with a flag: {"name": "Name", "amount": 500, "ambiguous": true}.
Convert all amounts to integers. Never invent entries not visible in the image.
```

Response parsing:
```javascript
const raw = response.candidates[0].content.parts[0].text;
const cleaned = raw.replace(/```json|```/g, '').trim();
const parsed = JSON.parse(cleaned);
// Separate ambiguous entries from clean ones
// Validate: name must be non-empty string, amount must be integer > 0
// Silently drop invalid entries
```

### 2. `scan.html` — AI Diary Scan Screen

Layout:
```
┌─────────────────────────────────┐
│  ← Scan Diary Page              │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │  [📷 Take Photo /         │  │
│  │   Choose from Gallery]    │  │
│  └───────────────────────────┘  │
│  [Image preview after select]   │
│  [Scan this page →]             │  ← Only shown after image selected
│  "Reading diary page…" shimmer  │  ← Shown during API call
├─────────────────────────────────┤
│  (Review panel — after scan):   │
│                                 │
│  📅 Recording for: 28 Jun 2026  │  ← Read-only date label
│                                 │
│  JAMA (Left side of diary)      │
│  ┌──────────────────────────┐   │
│  │ [Name input] [₹ Amount] [✕]│  ← Editable rows
│  └──────────────────────────┘   │
│  [+ Add Jama row]               │
│                                 │
│  UDHAR (Right side of diary)    │
│  ┌──────────────────────────┐   │
│  │ [Name input] [₹ Amount] [✕]│  │
│  └──────────────────────────┘   │
│  [+ Add Udhar row]              │
│                                 │
│  ⚠️ UNCLEAR — ASSIGN SIDE:      │  ← Only if ambiguous entries exist
│  ┌──────────────────────────┐   │
│  │ Name  ₹500 [Jama][Udhar] │   │  ← Toggle buttons per row
│  └──────────────────────────┘   │
│                                 │
│       [Save All Entries]        │
└─────────────────────────────────┘
```

Behavior:
- File input: `accept="image/*" capture="environment"` — triggers camera on mobile, file picker on desktop
- After image selected: show preview thumbnail, show "Scan this page →" button
- On scan button click: convert image to base64 → call `scanDiaryPage(base64, mimeType)` → show shimmer loading state
- Date label: `new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })` — read-only, never editable
- Review panel: render jama rows, udhar rows, ambiguous rows
- Each row: editable name input + editable amount input (DM Mono) + delete button
- Ambiguous rows: show [Jama] and [Udhar] toggle buttons — clicking one moves the row to that section
- `[+ Add Jama row]` / `[+ Add Udhar row]`: adds a blank editable row to that section
- `[Save All Entries]`:
  1. Validate all rows: name non-empty, amount > 0 — show inline error if not
  2. For each entry: call `searchPartyByName(db, name)` — if found use existing partyId, if not call `addParty(db, name, '')` to create
  3. Call `addTransaction` for each entry with `source: 'scan'` and `date: today's ISO date string`
  4. Call `recalculateBalance` for each affected party
  5. Navigate to `index.html`
- Error states:
  - Gemini API fails: "Scan failed. Check your connection or try a clearer photo." — keep image on screen
  - Not a ledger page: "This doesn't look like a ledger page. Try again with a clearer photo."
  - No entries found: "Couldn't find any entries in this image. You can add them manually below." — show empty review panel so user can type entries in

---

## DEFINITION OF DONE FOR PHASE 3
- [ ] Image can be selected from gallery or camera on mobile
- [ ] Gemini returns parsed Jama and Udhar entries
- [ ] Review panel shows editable, deletable rows
- [ ] Ambiguous entries show toggle buttons
- [ ] Date label is read-only and shows today's date
- [ ] Save creates transactions and updates balances correctly
- [ ] New party names are auto-created in Supabase
- [ ] Gemini errors show calm inline messages

---

*When Phase 3 is complete, tell the user: "Phase 3 done. Test the scan with a real diary photo. Confirm entries appear in the review panel and save correctly. Then start Phase 4."*
