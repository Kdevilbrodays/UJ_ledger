function formatCurrency(amount) {
  const value = Number(amount) || 0;
  const formatted = Math.abs(value).toLocaleString('en-IN', {
    maximumFractionDigits: 0
  });
  const prefix = value < 0 ? '-₹' : '₹';
  return prefix + formatted;
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatRelativeDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return diffDays + ' days ago';
  return formatDate(dateStr);
}

function showError(message) {
  let banner = document.getElementById('error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'error-banner';
    banner.className = 'banner banner--error';
    banner.setAttribute('role', 'alert');
    const shell = document.querySelector('.page-shell') || document.body;
    shell.insertBefore(banner, shell.firstChild);
  }
  banner.textContent = message;
  banner.hidden = false;
}

function hideError() {
  const banner = document.getElementById('error-banner');
  if (banner) banner.hidden = true;
}

function showLoading(message) {
  let block = document.getElementById('loading-block');
  if (!block) {
    block = document.createElement('div');
    block.id = 'loading-block';
    block.className = 'loading-block';
    block.innerHTML =
      '<div class="shimmer shimmer--tall"></div>' +
      '<p class="loading-block__message"></p>';
    const shell = document.querySelector('.page-content') || document.querySelector('.page-shell') || document.body;
    shell.appendChild(block);
  }
  block.querySelector('.loading-block__message').textContent = message || 'Loading…';
  block.hidden = false;
}

function hideLoading() {
  const block = document.getElementById('loading-block');
  if (block) block.hidden = true;
}

function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// --- Toast (Android-style) --------------------------------------------------
// A brief, self-dismissing message pinned near the bottom of the screen.
// Used for background events worth noticing but not acting on — e.g. an
// automatic AI model switch during a scan. Unlike showError/showLoading,
// a toast never blocks interaction and clears itself.

let toastHideTimeout = null;

function showToast(message, options = {}) {
  const duration = options.duration || 3500;

  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  clearTimeout(toastHideTimeout);
  toast.textContent = message;

  // Restart the fade-in even if a toast is already showing (re-triggering
  // quickly should refresh the timer, not just extend the old one).
  toast.classList.remove('toast--visible');
  void toast.offsetWidth; // force reflow so the transition replays
  toast.classList.add('toast--visible');

  toastHideTimeout = setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, duration);
}

// --- Shared modal helpers -------------------------------------------------
// Used by the nav drawer and by every task modal (Add Party, Add Jama, Add
// Udhar, Delete confirmations, etc). One implementation of focus trapping,
// Escape-to-close, and (optionally) click-outside-to-close, instead of a
// separate copy per modal. See Phase 6 audit 2.4/2.5.

const openModals = new Map(); // overlayEl -> { closeOnOverlayClick, previouslyFocused }

function getFocusableElements(container) {
  const focusable = container.querySelectorAll('button, [href], input, select, textarea');
  return Array.from(focusable).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
}

function openModal(overlayEl, options = {}) {
  if (!overlayEl) return;

  openModals.set(overlayEl, {
    closeOnOverlayClick: options.closeOnOverlayClick !== false, // default true
    previouslyFocused: document.activeElement,
  });

  overlayEl.hidden = false;

  const focusable = getFocusableElements(overlayEl);
  if (focusable.length) focusable[0].focus();

  // Wire click-outside-to-close once per overlay, lazily.
  if (!overlayEl.dataset.modalWired) {
    overlayEl.dataset.modalWired = 'true';
    overlayEl.addEventListener('click', (event) => {
      const state = openModals.get(overlayEl);
      if (event.target === overlayEl && state && state.closeOnOverlayClick) {
        closeModal(overlayEl);
      }
    });
  }
}

function closeModal(overlayEl) {
  if (!overlayEl || overlayEl.hidden) return;
  const state = openModals.get(overlayEl);
  overlayEl.hidden = true;
  openModals.delete(overlayEl);
  if (state && state.previouslyFocused instanceof HTMLElement) {
    state.previouslyFocused.focus();
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' && event.key !== 'Tab') return;
  if (openModals.size === 0) return;

  // Only the most-recently-opened modal should respond (in practice this
  // app never stacks more than one, but this keeps behavior sane if it ever does).
  const overlayEl = Array.from(openModals.keys()).pop();

  if (event.key === 'Escape') {
    closeModal(overlayEl);
  } else if (event.key === 'Tab') {
    trapModalFocus(overlayEl, event);
  }
});

function trapModalFocus(overlayEl, event) {
  const focusableElements = getFocusableElements(overlayEl);
  if (!focusableElements.length) return;

  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// --- Nav drawer ------------------------------------------------------------

let navDrawerState = {
  trigger: null,
  overlay: null,
  drawer: null,
};

function openNavDrawer() {
  openModal(navDrawerState.overlay, { closeOnOverlayClick: true });
}

function closeNavDrawer() {
  closeModal(navDrawerState.overlay);
}

function initNavDrawer(db, currentPage) {
  navDrawerState.trigger = document.getElementById('nav-trigger');
  navDrawerState.overlay = document.getElementById('nav-drawer-overlay');
  navDrawerState.drawer = document.getElementById('nav-drawer');

  if (!navDrawerState.trigger || !navDrawerState.overlay || !navDrawerState.drawer) return;

  navDrawerState.trigger.addEventListener('click', (event) => {
    event.preventDefault();
    openNavDrawer();
  });

  const closeButton = document.getElementById('nav-drawer-close');
  closeButton?.addEventListener('click', closeNavDrawer);

  navDrawerState.drawer.querySelectorAll('.nav-drawer__link').forEach((link) => {
    if (link.dataset.page === currentPage) {
      link.setAttribute('aria-current', 'page');
    }

    if (link.textContent.trim().startsWith('➕')) {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        closeNavDrawer();
        window.location.href = 'index.html?action=add-party';
      });
    } else {
      link.addEventListener('click', () => {
        closeNavDrawer();
      });
    }
  });
}

// --- Party Search (global) --------------------------------------------------
// A dedicated overlay reachable from a 🔍 icon in the header on every page,
// with real fuzzy matching via Fuse.js. Replaces the old "Jump to a ledger"
// section that used to live inside the nav-drawer. See Phase 7.

let partySearchState = { fuse: null, parties: [] };

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function launchPartySearch(db) {
  partySearchState.parties = await getAllParties(db);
  partySearchState.fuse = new Fuse(partySearchState.parties, {
    keys: ['name'],
    threshold: 0.35,
    ignoreLocation: true,
    includeMatches: true,
    minMatchCharLength: 1,
  });
  document.getElementById('party-search-input').value = '';
  renderPartySearchResults('');
  openModal(document.getElementById('party-search-overlay'));
}

function initPartySearch(db) {
  document.getElementById('search-trigger')?.addEventListener('click', () => launchPartySearch(db));
  document.getElementById('nav-drawer-search-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeNavDrawer();
    launchPartySearch(db);
  });
  document.getElementById('party-search-close')?.addEventListener('click', () => {
    closeModal(document.getElementById('party-search-overlay'));
  });
  document.getElementById('party-search-input')?.addEventListener('input', (e) => {
    renderPartySearchResults(e.target.value);
  });
  document.getElementById('party-search-results')?.addEventListener('click', (event) => {
    const row = event.target.closest('[data-party-id]');
    if (row) window.location.href = `party.html?id=${row.dataset.partyId}`;
  });
}

function renderPartySearchResults(query) {
  const listEl = document.getElementById('party-search-results');
  const emptyEl = document.getElementById('party-search-empty');
  const trimmed = query.trim();

  const results = trimmed
    ? partySearchState.fuse.search(trimmed)
    : [...partySearchState.parties]
        .sort((a, b) => new Date(b.last_activity || 0) - new Date(a.last_activity || 0))
        .map((party) => ({ item: party, matches: [] }));

  listEl.innerHTML = '';
  emptyEl.hidden = results.length > 0;
  if (!results.length) emptyEl.querySelector('p').textContent = `No match for '${trimmed}'.`;

  results.forEach(({ item: party, matches }) => listEl.appendChild(createPartySearchRow(party, matches)));
}

function createPartySearchRow(party, matches) {
  const row = document.createElement('a');
  row.href = `party.html?id=${party.id}`;
  row.dataset.partyId = party.id;
  row.className = 'party-search__result';

  const nameMatch = (matches || []).find((m) => m.key === 'name');
  const nameEl = document.createElement('span');
  nameEl.className = 'party-search__result-name';
  nameEl.innerHTML = nameMatch ? highlightIndices(party.name, nameMatch.indices) : escapeHtml(party.name);

  const balance = party.current_balance || 0;
  const balanceClass = balance > 0 ? 'party-card__balance--positive' : balance < 0 ? 'party-card__balance--negative' : 'party-card__balance--zero';
  const balanceEl = document.createElement('span');
  balanceEl.className = `party-search__result-balance ${balanceClass}`;
  balanceEl.textContent = formatCurrency(balance);

  row.append(nameEl, balanceEl);
  return row;
}

function highlightIndices(name, indices) {
  let out = '';
  let cursor = 0;
  indices.forEach(([start, end]) => {
    out += escapeHtml(name.slice(cursor, start));
    out += `<span class="fuzzy-highlight">${escapeHtml(name.slice(start, end + 1))}</span>`;
    cursor = end + 1;
  });
  out += escapeHtml(name.slice(cursor));
  return out;
}

// Offline handling
function initOfflineDetection() {
  const updateStatus = () => {
    const isOnline = navigator.onLine;
    let banner = document.getElementById('offline-banner');
    
    if (!isOnline) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.className = 'banner banner--offline';
        banner.setAttribute('role', 'alert');
        const shell = document.querySelector('.page-shell') || document.body;
        shell.insertBefore(banner, shell.firstChild);
      }
      banner.textContent = '📡 You are offline. Changes will be saved when online.';
      banner.hidden = false;
      
      // Disable all save buttons
      document.querySelectorAll('button[type="submit"], .btn--primary').forEach(btn => {
        if (btn.textContent.includes('Add') || btn.textContent.includes('Save')) {
          btn.disabled = true;
        }
      });
    } else {
      if (banner) banner.hidden = true;
      
      // Re-enable all save buttons
      document.querySelectorAll('button[type="submit"], .btn--primary').forEach(btn => {
        btn.disabled = false;
      });
    }
  };
  
  // Check on page load
  updateStatus();
  
  // Listen for online/offline events
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
}

// Initialize offline detection when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOfflineDetection);
} else {
  initOfflineDetection();
}
