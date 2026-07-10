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

let navDrawerState = {
  trigger: null,
  overlay: null,
  drawer: null,
  firstFocusable: null,
  lastFocusable: null,
  previouslyFocused: null,
};

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

  navDrawerState.overlay.addEventListener('click', (event) => {
    if (event.target === navDrawerState.overlay) {
      closeNavDrawer();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !navDrawerState.overlay.hidden) {
      closeNavDrawer();
    }
    if (event.key === 'Tab' && !navDrawerState.overlay.hidden) {
      trapNavDrawerFocus(event);
    }
  });

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

function trapNavDrawerFocus(event) {
  const focusable = navDrawerState.drawer.querySelectorAll('button, [href], input, select, textarea');
  if (!focusable.length) return;

  const focusableElements = Array.from(focusable).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
  navDrawerState.firstFocusable = focusableElements[0];
  navDrawerState.lastFocusable = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === navDrawerState.firstFocusable) {
    event.preventDefault();
    navDrawerState.lastFocusable.focus();
  } else if (!event.shiftKey && document.activeElement === navDrawerState.lastFocusable) {
    event.preventDefault();
    navDrawerState.firstFocusable.focus();
  }
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
      item.innerHTML = `
        <span class="nav-drawer__party-name">${party.name}</span>
        <span class="nav-drawer__party-balance ${balanceClass}">${formatCurrency(balance)}</span>
      `;
      partyListEl.appendChild(item);
    });
  } catch (err) {
    showError('Failed to load menu parties: ' + err.message);
  }
}

function openNavDrawer() {
  if (!navDrawerState.overlay) return;
  navDrawerState.previouslyFocused = document.activeElement;
  navDrawerState.overlay.hidden = false;
  const focusable = navDrawerState.drawer.querySelectorAll('button, [href], input, select, textarea');
  if (focusable.length) focusable[0].focus();
}

function closeNavDrawer() {
  if (!navDrawerState.overlay) return;
  navDrawerState.overlay.hidden = true;
  if (navDrawerState.previouslyFocused instanceof HTMLElement) {
    navDrawerState.previouslyFocused.focus();
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
