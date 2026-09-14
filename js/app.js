import { renderHeader, renderFooter } from './components.js';

/**
 * Inicializador global del sistema. Se ejecuta automáticamente cuando el DOM está listo.
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Renderizar estructura global
  await renderHeader();
  renderFooter();

  // 2. Crear el contenedor de notificaciones Toast si no existe
  initToastContainer();
});

/**
 * Inicializa el contenedor flotante para los mensajes Toast.
 */
function initToastContainer() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

/**
 * Muestra una notificación emergente (Toast) en pantalla.
 * 
 * @param {string} message - Texto del mensaje
 * @param {'success'|'error'|'info'|'warning'} type - Tipo de notificación (color/icono)
 * @param {number} duration - Tiempo de visibilidad en milisegundos (default: 3500ms)
 */
export function showToast(message, type = 'info', duration = 3500) {
  initToastContainer();
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Animación de entrada
  setTimeout(() => toast.classList.add('show'), 10);

  // Remoción automática
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}

/**
 * Muestra o oculta un indicador de carga global en la pantalla.
 * 
 * @param {boolean} show - true para mostrar, false para ocultar
 */
export function toggleGlobalLoader(show = true) {
  let loader = document.getElementById('global-loader');

  if (show) {
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.className = 'global-loader-overlay';
      loader.innerHTML = `
        <div class="spinner"></div>
      `;
      document.body.appendChild(loader);
    }
    loader.classList.remove('hidden');
  } else if (loader) {
    loader.classList.add('hidden');
  }
}

/**
 * Helper para formatear precios en dólares USD.
 * 
 * @param {number} amount 
 * @returns {string} Precio formateado
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CU', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount || 0);
}
