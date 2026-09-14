import { supabase } from './supabase.js';

/**
 * Renderiza el Header dinámico en el contenedor indicado.
 * Revisa la sesión del usuario para mostrar botones de Login/Registro o Avatar/Perfil.
 * 
 * @param {string} containerId - ID del elemento donde se inyectará el Header (default: 'app-header')
 */
export async function renderHeader(containerId = 'app-header') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  // Consultar avatar si hay sesión
  let avatarUrl = 'assets/images/default-avatar.png';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.avatar_url) {
      avatarUrl = profile.avatar_url;
    }
  }

  container.innerHTML = `
    <header class="main-header">
      <div class="header-container">
        <a href="index.html" class="brand-logo">
          <img src="assets/logo/logo.svg" alt="iMarket Cuba" onerror="this.src='assets/images/logo-placeholder.png'">
          <span>iMarket <strong>Cuba</strong></span>
        </a>

        <nav class="desktop-nav">
          <a href="index.html">Inicio</a>
          <a href="buscar.html">Explorar iPhones</a>
          <a href="como-funciona.html">Cómo Funciona</a>
          <a href="seguridad.html">Seguridad</a>
        </nav>

        <div class="header-actions">
          ${user ? `
            <a href="favoritos.html" class="icon-btn" title="Mis Favoritos">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </a>
            <a href="publicar.html" class="btn btn-primary btn-sm">+ Publicar</a>
            <div class="user-dropdown-wrapper">
              <button class="user-avatar-btn" id="user-menu-toggle">
                <img src="${avatarUrl}" alt="Mi Perfil" class="avatar-img">
              </button>
              <div class="dropdown-menu hidden" id="user-dropdown">
                <a href="perfil.html">Mi Perfil</a>
                <a href="mis-publicaciones.html">Mis Anuncios</a>
                <a href="ventas.html">Mis Ventas / Compras</a>
                <a href="configuracion.html">Ajustes</a>
                <hr>
                <button id="btn-logout" class="dropdown-logout-btn">Cerrar Sesión</button>
              </div>
            </div>
          ` : `
            <a href="login.html" class="btn btn-secondary btn-sm">Iniciar Sesión</a>
            <a href="registro.html" class="btn btn-primary btn-sm">Registrarse</a>
          `}

          <button class="mobile-menu-btn" id="mobile-menu-toggle" aria-label="Abrir menú">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <!-- Menú Móvil Desplegable -->
      <div class="mobile-menu hidden" id="mobile-menu">
        <nav class="mobile-nav">
          <a href="index.html">Inicio</a>
          <a href="buscar.html">Buscar iPhone</a>
          <a href="como-funciona.html">Cómo Funciona</a>
          <a href="seguridad.html">Consejos de Seguridad</a>
          <hr>
          ${user ? `
            <a href="perfil.html">Mi Perfil</a>
            <a href="publicar.html" class="highlight-link">+ Publicar Anuncio</a>
            <a href="mis-publicaciones.html">Mis Anuncios</a>
            <a href="favoritos.html">Mis Favoritos</a>
            <a href="ventas.html">Historial de Ventas</a>
            <a href="configuracion.html">Configuración</a>
            <button id="btn-logout-mobile" class="btn-link-danger">Cerrar Sesión</button>
          ` : `
            <a href="login.html">Iniciar Sesión</a>
            <a href="registro.html">Crear Cuenta</a>
          `}
        </nav>
      </div>
    </header>
  `;

  // Asignar eventos de los menús en el header
  bindHeaderEvents();
}

/**
 * Renderiza el Footer en el contenedor indicado.
 * 
 * @param {string} containerId - ID del elemento contenedor (default: 'app-footer')
 */
export function renderFooter(containerId = 'app-footer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <footer class="main-footer">
      <div class="footer-container">
        <div class="footer-brand">
          <h3>iMarket <span>Cuba</span></h3>
          <p>El marketplace especializado en la compra-venta segura de dispositivos Apple en Cuba.</p>
        </div>
        <div class="footer-links">
          <h4>Navegación</h4>
          <ul>
            <li><a href="buscar.html">Catálogo de iPhones</a></li>
            <li><a href="como-funciona.html">¿Cómo funciona?</a></li>
            <li><a href="seguridad.html">Seguridad y Garantía</a></li>
            <li><a href="terminos.html">Términos y Condiciones</a></li>
          </ul>
        </div>
        <div class="footer-links">
          <h4>Cuenta</h4>
          <ul>
            <li><a href="login.html">Ingresar</a></li>
            <li><a href="registro.html">Registro</a></li>
            <li><a href="verificacion.html">Verificación KYC</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} iMarket Cuba. Todos los derechos reservados.</p>
      </div>
    </footer>
  `;
}

/**
 * Genera el elemento HTML para una tarjeta de iPhone.
 * 
 * @param {Object} item - Objeto de la publicación desde public.listings
 * @param {boolean} isFavorite - Indica si la publicación está marcada como favorita
 * @returns {string} String HTML de la tarjeta
 */
export function createiPhoneCard(item, isFavorite = false) {
  const mainImage = item.listing_images?.[0]?.image_url || 'assets/images/iphone-placeholder.png';
  const priceFormatted = new Intl.NumberFormat('es-CU', { style: 'currency', currency: 'USD' }).format(item.price || 0);

  // Mapeo simple de la condición estética
  const conditionLabels = {
    'new': 'Nuevo / Sellado',
    'like_new': 'Como Nuevo (10/10)',
    'good': 'Buen Estado (8-9/10)',
    'fair': 'Detalles Estéticos'
  };

  const conditionText = conditionLabels[item.aesthetic_condition] || item.aesthetic_condition || 'Usado';

  return `
    <article class="iphone-card" data-id="${item.id}">
      <div class="card-media">
        <img src="${mainImage}" alt="${item.title}" loading="lazy">
        <span class="badge badge-condition">${conditionText}</span>
        <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-favorite-id="${item.id}" aria-label="Favorito">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFavorite ? '#e63946' : 'none'}" stroke="${isFavorite ? '#e63946' : 'currentColor'}" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>
      <div class="card-body">
        <h3 class="card-title"><a href="iphone.html?id=${item.id}">${item.title}</a></h3>
        <p class="card-price">${priceFormatted}</p>
        <div class="card-meta">
          <span>${item.battery_health ? `🔋 Batería: ${item.battery_health}%` : 'Batería N/D'}</span>
          <span>${item.storage_capacity ? `💾 ${item.storage_capacity}GB` : ''}</span>
        </div>
      </div>
      <div class="card-footer">
        <a href="iphone.html?id=${item.id}" class="btn btn-outline btn-block">Ver Detalle</a>
      </div>
    </article>
  `;
}

/**
 * Eventos internos del Header (Menú móvil, dropdown de usuario, logout)
 */
function bindHeaderEvents() {
  const userMenuToggle = document.getElementById('user-menu-toggle');
  const userDropdown = document.getElementById('user-dropdown');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  if (userMenuToggle && userDropdown) {
    userMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target) && !userMenuToggle.contains(e.target)) {
        userDropdown.classList.add('hidden');
      }
    });
  }

  if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // Logout Handlers
  const logoutBtn = document.getElementById('btn-logout');
  const logoutMobileBtn = document.getElementById('btn-logout-mobile');

  const handleLogout = async () => {
    const { signOutUser } = await import('./auth.js');
    await signOutUser();
  };

  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (logoutMobileBtn) logoutMobileBtn.addEventListener('click', handleLogout);
}
