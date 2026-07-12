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

  const searchInput = document.getElementById('nav-party-search');
  searchInput?.addEventListener('keyup', () => renderNavPartyList(db));

  navDrawerState.drawer.querySelector('#nav-party-list')?.addEventListener('click', (event) => {
    const item = event.target.closest('[data-party-id]');
    if (item) {
      const partyId = item.dataset.partyId;
      window.location.href = `party.html?id=${partyId}`;
    }
  });

  renderNavPartyList(db);
}

async function renderNavPartyList(db) {
  const partyListEl = document.getElementById('nav-party-list');
  const searchValue = document.getElementById('nav-party-search')?.value.trim().toLowerCase() || '';
  if (!partyListEl) return;

  try {
    const parties = await getAllParties(db);
    const filtered = parties.filter((party) => party.name.toLowerCase().includes(searchValue));

    partyListEl.innerHTML = '';
    filtered.forEach((party) => {
      const balance = party.current_balance || 0;
      const balanceClass = balance > 0 ? 'party-card__balance--positive' : balance < 0 ? 'party-card__balance--negative' : '';
      const item = document.createElement('a');
      item.href = `party.html?id=${party.id}`;
      item.dataset.partyId = party.id;
      item.className = 'nav-drawer__party-item';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'nav-drawer__party-name';
      nameSpan.textContent = party.name;

      const balanceSpan = document.createElement('span');
      balanceSpan.className = `nav-drawer__party-balance ${balanceClass}`;
      balanceSpan.textContent = formatCurrency(balance);

      item.append(nameSpan, balanceSpan);
      partyListEl.appendChild(item);
    });
  } catch (err) {
    showError('Failed to load menu parties: ' + err.message);
  }
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
