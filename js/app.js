import { checkSupabaseConnection } from './supabase.js';
import { renderHeader, renderFooter } from './components.js';

let toastContainer;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function initToastContainer() {
  if (!document.getElementById('toast-container')) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  } else {
    toastContainer = document.getElementById('toast-container');
  }
}

export function showToast(message, type = 'info', duration = 3500) {
  initToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  window.setTimeout(() => {
    toast.classList.remove('show');
    window.setTimeout(() => toast.remove(), 250);
  }, duration);
}

export function toggleGlobalLoader(show = true) {
  let loader = document.getElementById('global-loader');

  if (show) {
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.className = 'global-loader-overlay';
      loader.innerHTML = '<div class="spinner" aria-label="Cargando"></div>';
      document.body.appendChild(loader);
    }
    loader.classList.remove('hidden');
  } else if (loader) {
    loader.classList.add('hidden');
  }
}

export function showConnectionError(error) {
  let banner = document.getElementById('supabase-connection-error');

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'supabase-connection-error';
    banner.className = 'supabase-connection-error';
    banner.setAttribute('role', 'alert');
    document.body.prepend(banner);
  }

  banner.innerHTML = `
    <strong>No se pudo conectar con Supabase.</strong>
    <span>Los datos de la aplicación no están disponibles en este momento.</span>
    <button type="button" aria-label="Cerrar aviso">×</button>
  `;

  banner.querySelector('button').addEventListener('click', () => banner.remove(), { once: true });
  console.error('[iMarket] Supabase unavailable:', error);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CU', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

export function escapeText(value) {
  return escapeHtml(value);
}

export async function initApp({ header = false, footer = false } = {}) {
  initToastContainer();

  const connection = await checkSupabaseConnection();
  document.documentElement.dataset.supabase = connection.connected ? 'connected' : 'error';

  if (!connection.connected) showConnectionError(connection.error);

  if (header) await renderHeader();
  if (footer) renderFooter();

  return connection;
}
