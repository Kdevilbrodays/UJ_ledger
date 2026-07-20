UDHAR LEDGER — Feature: Party Delete Mode (Home Screen)
Paste the Shared Reference doc above this prompt before sending it to your AI agent.
This feature only touches index.html, app.js, and styles/components.css. It does not
touch party.html, scan.html, settings.html, the nav drawer, or the party-search overlay.
CONTEXT FOR THE AGENT
Right now, deleting a party can only be done one at a time, from inside that party's own
ledger page (party.html → kebab menu → Delete Party → confirm modal). This feature adds a
second, faster way to delete parties directly from the home screen list:
Long-pressing any party card on index.html enters delete mode.
In delete mode, every card grows a 🗑️ button on its right side. Tapping it deletes that
party immediately (optimistic UI + a Snackbar-style "Undo" toast — no blocking confirm
dialog), and the user can keep tapping other cards' trash icons one after another without
leaving the mode.
Delete mode ends when the user presses the browser/system back button or gesture, or
taps an explicit ✕ control in the header.
Reuse, don't rebuild: deleteParty(db, partyId) already exists in supabase.js and
already works in both real Supabase mode and offline/demo (localStorage) mode — Phase 5
added a .delete() chain to the demo DB specifically so this function works everywhere. Call
it as-is. Do not write a second delete path.
House rules that still apply: no alert(), no confirm(), no red modal popups — this
project's error/confirmation language is calm inline banners and toasts (see Shared
Reference → UI Tone). The Undo-toast pattern below is intentionally in that spirit.
STEP 0 — PRE-FLIGHT (do this before writing any code)
Read index.html, app.js, supabase.js, and styles/components.css in full and confirm/report on these three things before proceeding:
The anchor problem. createPartyCard() in index.html currently builds each card as
document.createElement('a') with card.href = 'party.html?id=...'. On real devices,
long-pressing an <a href> triggers the browser's native link context menu (Android
Chrome: "Open in new tab / Copy link / Share"; iOS Safari: the callout menu) before any
custom JS long-press logic gets a clean shot at it. If the card stays an <a>, this
feature will not work reliably on phones. Confirm this, then implement the fix below (§2 in
the file list) rather than trying to layer long-press detection on top of the existing
anchor.
deleteParty(db, partyId) already exists in supabase.js (added in Phase 5) and
already has a working .delete() chain in the demo/localStorage fallback. Confirm it. Do
not duplicate it.
showToast(message, options) in app.js is a plain, text-only, self-dismissing toast
used all over the app (loading/error states, scan flow, etc.). This feature needs an
actionable toast with an "Undo" button. Add a new function for that (showUndoToast,
spec'd below) — do not change showToast()'s existing signature or behavior, since many
other call sites depend on it staying a simple text toast.
Report back what you found before touching any file.
BEHAVIOR SPEC
1. Entering delete mode
Long-press (≈500ms hold, touch or mouse) on any party card, without the finger/cursor
moving more than ~10px, enters delete mode.
A long-press that starts on the 🗑️ button itself does not count (that's a separate, instant
tap action once already in delete mode).
On success: light haptic (navigator.vibrate(15) if available — guard for browsers/devices
that don't support it), and a one-time toast: "Tap 🗑️ to delete a party. Go back to exit."
Critical bug to avoid: the touch/mouse-up that follows a successful long-press must not
also register as a tap on whatever now happens to be under the finger (e.g. the freshly
rendered trash icon). See the reference long-press implementation below — it explicitly
swallows that one "ghost" click.
2. Visual changes while in delete mode
Header: title text changes from "Udhar Ledger" to "Tap 🗑️ to delete a party." The ☰ menu
button, 🔍 search button, and "+ Add" button hide. A new ✕ "exit" icon-button appears in
their place.
The search/balance filter bar and the 📷 scan FAB both hide. (Deliberately simplified scope
— delete mode is a focused, single-purpose mode, not a place to also filter or add data.)
Each party card grows a 🗑️ delete button on its right side, replacing the balance amount
for the duration of delete mode (don't try to fit both in the space at 390px width — see
Shared Reference's 390px no-horizontal-scroll rule).
Tapping the body of a card (not the 🗑️) does nothing while in delete mode — it must not
navigate to party.html.
3. Deleting a party (tap the 🗑️)
This is the part most likely to be implemented too naively — read carefully:
On tap: optimistically hide that card immediately (short fade/collapse, not an abrupt
innerHTML wipe — see CSS spec) and show showUndoToast("Deleted {name}", onUndo).
Do not call deleteParty() yet. Start a ~4.5s grace-period timer instead. The actual
Supabase call only fires when that timer completes, so "Undo" never has to un-delete
anything from the database — it just cancels a timer that hasn't fired yet. This matters
because deleteParty() cascades and removes that party's entire transaction history; a
true "undo after the fact" would require re-inserting transactions we don't keep client-side,
which is a real footgun. Deferred commit avoids that entirely.
If "Undo" is tapped before the timer fires: cancel the timer, restore the card into the list.
No network call was ever made.
If the timer completes: call await deleteParty(db, partyId).
On success: nothing further needed, the card's already gone.
On failure (offline, RLS error, etc.): re-show the card (it was never actually
deleted) and surface it with showError(), e.g. "Failed to delete {name}. It has been
restored." Never leave the UI saying something is gone when the database still has it.
The user can tap 🗑️ on multiple different cards in quick succession — that's the whole
point ("continuously delete parties one after the other"). Each party gets its own
independent pending-delete timer.
Known, accepted trade-off: there is one shared toast element (matching the existing
singleton #app-toast pattern in app.js). If the user deletes B while A's undo toast is
still showing, B's toast replaces A's — only the most recently tapped deletion is visibly
undoable at any given moment. A's timer is completely unaffected and still commits on
schedule in the background; it just loses its visible Undo affordance once superseded. This
is intentional, to avoid building a multi-toast stacking UI for what should be a lightweight
feature. Flag this to the user as a deliberate simplification, not a bug — a stacked-toast
version is a reasonable future enhancement if it turns out to matter in practice.
If every party ends up in the pending-delete set (list would render empty), auto-exit
delete mode and fall through to the existing #empty-no-parties empty state once those
deletes actually commit.
4. Exiting delete mode
Two ways, both must work:
Manual: tap the new ✕ button in the header.
Back button / back gesture: use the History API, not a custom flag. On entering delete
mode, history.pushState({ ujDeleteMode: true }, '', location.href) (same URL, no real
navigation). Listen for popstate; if delete mode is active when it fires, exit delete mode
— don't let the browser think this was a real "leave the page" navigation, because it isn't
(the URL never changed, so nothing unloads). See reference implementation below.
Exiting delete mode does not cancel any deletes that are already pending (i.e., already
tapped and mid-grace-period). Those still commit on schedule even after the user has backed
out of delete mode. Treat "tapped the 🗑️" as the point of commitment; the mode itself is
just what makes the trash icons available, not a container that voids everything inside it
when closed.
5. Interaction with realtime + navigation (important edge cases)
subscribeToParties() already triggers a full loadParties() → renderParties() on any
remote DB change. renderParties() must:
filter out any party ID currently in the pending-delete set (pendingDeleteIds), so a
realtime refresh from another device doesn't resurrect a card the user just tapped delete
on but hasn't committed yet;
stay aware of isDeleteMode so a background refresh doesn't silently drop the user back
into normal-mode cards mid-session.
Navigating away with a pending delete in flight is a real data-integrity risk, because
this is a traditional multi-page app — a full page unload kills any JS setTimeout that
hasn't fired yet, silently cancelling that party's deletion even though the user already
saw it disappear and got a "Deleted" toast. Mitigate this: add a flushPendingDeletes()
helper that immediately fires commitDelete() (skipping the rest of the grace timer) for
every pending ID, and call it at the start of every action that could leave the page:
nav-drawer link clicks, the search trigger, the scan FAB, "+ Add", and normal card-tap
navigation. This is a best-effort mitigation, not a hard guarantee (the fetch may still
be interrupted mid-flight by the unload) — say this plainly rather than implying it's
bulletproof. A fully guaranteed version would need navigator.sendBeacon or a service
worker, which is out of scope here.
6. Accessibility
🗑️ button: real <button>, aria-label="Delete {party name}", 44×44px minimum tap target,
keyboard-focusable, Enter/Space triggers the same handler as click.
The card itself becomes a non-anchor interactive element (see §2 in file list) — give it
role="button", tabindex="0", and a keydown handler for Enter/Space so keyboard
navigation to a party's ledger keeps working exactly as it does today.
Known, honest limitation: long-press has no keyboard equivalent, so keyboard-only users
have no way to enter delete mode from the home screen. That's fine — they can still delete a
single party from party.html's existing kebab menu, which is unaffected by this feature.
Say this out loud rather than silently leaving keyboard users with no path at all.
Entering/exiting delete mode should be announced to screen readers — reusing the existing
showToast() (aria-live="polite") for the mode-entry message from §1 covers this; no
separate live region needed.
FILES TO BUILD / MODIFY
1. styles/components.css — additive only, don't touch existing .toast/.toast--visible
Css
2. index.html — card markup: anchor → non-anchor interactive element
In createPartyCard(party), change:
Js
to:
Js
Navigation now happens through a delegated click/keydown handler on #parties-list instead
of the browser's default anchor behavior (needed anyway once delete mode exists, and it also
fixes the long-press-context-menu problem from Step 0).
When isDeleteMode is true, createPartyCard() must also:
skip creating/append the .party-card__balance element (or hide it) and instead append a
.party-card__delete-btn (🗑️, aria-label="Delete {party.name}", data-party-id).
Skip rendering any party whose id is in pendingDeleteIds.
3. index.html — delete-mode state, long-press detection, history handling
Add near the top of the existing inline <script> block, alongside allParties/db:
Js
Long-press detection (delegated on #parties-list, both touch and mouse for desktop
testing parity):
Js
Enter/exit delete mode, wired to the History API so back button/gesture works:
Js
Add the ✕ button to the header markup (next to the existing icon buttons) and wire its click
to exitDeleteMode(). It starts hidden.
Delete tap → optimistic hide → undo window → deferred commit:
Js
Wire flushPendingDeletes() into the existing nav-drawer trigger, search trigger, scan FAB,
and "+ Add" button click handlers (call it first, before whatever they already do), plus the
card-tap navigation handler above.
renderParties() needs one added line: filter allParties down to
p => !pendingDeleteIds.has(p.id) before rendering, in addition to its existing
search/balance filters. createPartyCard() needs the isDeleteMode-aware branch from §2.
attachLongPress(document.getElementById('parties-list')) should be called once, from
init(), alongside the existing initNavDrawer/initPartySearch/setupEventListeners calls.
4. app.js — new showUndoToast(), additive next to the existing showToast()
Js
Note this leaves showToast() completely untouched — it still resets toast.className back
to plain 'toast' on its next call regardless of which function last used the element, so the
two don't interfere with each other's styling.
EDGE CASES CHECKLIST (confirm each one explicitly, don't just assume)
[ ] Long-press that ends in a drag/scroll (moved >10px) does not enter delete mode.
[ ] The touch/click immediately following a successful long-press does not also fire a
delete or a navigation.
[ ] Tapping a card's body (not the 🗑️) while in delete mode does nothing.
[ ] Undo correctly cancels the pending timer and makes zero network calls.
[ ] A failed deleteParty() call restores the card and shows a clear inline error, never a
silent data mismatch between what's shown and what's in the DB.
[ ] Deleting every party while in delete mode ends in the existing #empty-no-parties empty
state, not a blank #parties-list with no explanation.
[ ] A realtime update from another device/tab while delete mode is active re-renders
correctly (mode-aware cards, pending deletes still hidden).
[ ] Back button/gesture exits delete mode without the page actually navigating away or
reloading (URL never changes — verify with the pushState/popstate approach above, not a
window.location trick).
[ ] Pressing back a second time (after delete mode has already been exited) behaves like
normal browser back — leaves the page as expected. Only the first back press should be
intercepted.
[ ] Works with no horizontal scroll at 390px width, per the existing project standard.
[ ] showToast()'s other existing call sites (loading/error states elsewhere in the app)
are unaffected by adding showUndoToast().
DEFINITION OF DONE
[ ] Step 0 pre-flight read and reported back (anchor problem, existing deleteParty,
existing showToast)
[ ] Long-press (touch + mouse) on a party card enters delete mode; short taps still navigate
normally
[ ] Each card shows a 🗑️ button on the right in delete mode, balance hidden in its place
[ ] Tapping 🗑️ optimistically removes the card, shows an Undo toast, and only calls
deleteParty() after the grace period if not undone
[ ] Multiple parties can be deleted back-to-back without leaving delete mode
[ ] Undo restores the card with no network call made
[ ] A failed delete restores the card and shows an inline error
[ ] Back button / back gesture exits delete mode without navigating away from the page
[ ] An explicit ✕ control in the header also exits delete mode
[ ] flushPendingDeletes() wired into every way to leave index.html while deletes are
still pending
[ ] No alert() / confirm() used anywhere in this feature's code
[ ] Every item in the Edge Cases checklist above verified, not assumed
[ ] No horizontal scroll at 390px width
When this feature is done, tell the user: "Delete mode is live on the home screen. Long-press
any party card to try it — tap a few 🗑️ icons back to back, try Undo on one, and test the back
button/gesture to make sure it exits cleanly without leaving the page."