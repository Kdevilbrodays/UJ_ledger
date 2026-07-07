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
