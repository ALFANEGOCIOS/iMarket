import { supabase } from './supabase.js';
import { initApp, showToast, showConnectionError, toggleGlobalLoader, formatCurrency, escapeText } from './app.js';
import { signInUser, signUpUser, sendPasswordReset, getFriendlyAuthError, signOutUser, getCurrentUser, ensureProfile } from './auth.js';
import { requireAuth } from './guards.js';
import { getActiveListings, createListing, createListingCard, loadListingDetail } from './listings.js';
import { getUserFavoriteIds, toggleFavorite, initFavoriteButtons } from './favorites.js';
import { getUserSalesHistory, confirmSale } from './sales.js';
import { fetchAdminMetrics } from './admin.js';

const protectedPages = new Set([
  'favoritos.html', 'perfil.html', 'publicar.html', 'editar-publicacion.html',
  'mis-publicaciones.html', 'mensajes.html', 'ventas.html', 'configuracion.html', 'verificacion.html'
]);

function pageName() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

function redirect(file) {
  window.location.href = new URL(file, window.location.href).href;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const errorBox = document.getElementById('loginError');
  const successBox = document.getElementById('loginSuccess');
  const submit = document.getElementById('loginSubmit');
  const forgot = document.getElementById('forgotPassword');

  const showError = message => { if (errorBox) { errorBox.textContent = message; errorBox.hidden = false; } if (successBox) successBox.hidden = true; };
  const showSuccess = message => { if (successBox) { successBox.textContent = message; successBox.hidden = false; } if (errorBox) errorBox.hidden = true; };

  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect('perfil.html');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const result = await signInUser(email.value, password.value);
    if (!result.success) {
      showError(getFriendlyAuthError(result.error));
      return;
    }
    showSuccess('Sesión iniciada. Redirigiendo...');
    redirect('perfil.html');
  });

  forgot?.addEventListener('click', async event => {
    event.preventDefault();
    const value = email.value.trim();
    if (!value) return showError('Escribe primero tu correo electrónico.');
    const result = await sendPasswordReset(value);
    result.success ? showSuccess('Revisa tu correo para restablecer la contraseña.') : showError(getFriendlyAuthError(result.error));
  });

  submit?.addEventListener('click', () => {
    if (!email.value.trim() || !password.value) showError('Completa tu correo y contraseña.');
  });
}

async function initRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const name = document.getElementById('fullName');
  const email = document.getElementById('email');
  const phone = document.getElementById('phone');
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirmPassword');
  const terms = document.getElementById('acceptTerms');
  const errorBox = document.getElementById('registerError');
  const successBox = document.getElementById('registerSuccess');
  const successText = document.getElementById('registerSuccessText');

  const showError = message => { if (errorBox) { errorBox.textContent = message; errorBox.hidden = false; } if (successBox) successBox.hidden = true; };
  const showSuccess = message => { if (successText) successText.textContent = message; if (successBox) successBox.hidden = false; if (errorBox) errorBox.hidden = true; };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (name.value.trim().length < 2) return showError('Introduce un nombre válido.');
    if (!email.value.trim()) return showError('Introduce tu correo electrónico.');
    if (password.value.length < 8) return showError('La contraseña debe tener al menos 8 caracteres.');
    if (password.value !== confirm.value) return showError('Las contraseñas no coinciden.');
    if (!terms.checked) return showError('Debes aceptar los términos y condiciones.');

    const result = await signUpUser(email.value, password.value, {
      full_name: name.value.trim(),
      phone_number: phone?.value.trim() || null
    });

    if (!result.success) return showError(getFriendlyAuthError(result.error));

    if (result.requiresEmailConfirmation) {
      showSuccess('Cuenta creada. Revisa tu correo para confirmar la cuenta y después inicia sesión.');
      form.reset();
    } else {
      showSuccess('Cuenta creada correctamente. Redirigiendo...');
      redirect('perfil.html');
    }
  });
}

async function initIndex() {
  const grid = document.querySelector('.listings-grid');
  if (!grid) return;
  const result = await getActiveListings();
  if (result.error) return;

  if (!result.data.length) {
    grid.innerHTML = '<div class="empty-state">Todavía no hay publicaciones activas.</div>';
    return;
  }

  let favoriteIds = [];
  try { favoriteIds = await getUserFavoriteIds(); } catch {}
  grid.innerHTML = result.data.slice(0, 8).map(item => createListingCard(item, favoriteIds.includes(item.id))).join('');
  initFavoriteButtons();
}

async function initSearch() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  const search = document.getElementById('search');
  const model = document.getElementById('model');
  if (search && params.get('q')) search.value = params.get('q');
  if (model && params.get('modelo')) model.value = params.get('modelo');

  async function render() {
    const result = await getActiveListings({
      query: search?.value.trim(),
      model: model?.value,
      condition: document.getElementById('condition')?.value,
      storage: document.getElementById('storage')?.value,
      municipality: document.getElementById('municipality')?.value
    });

    if (result.error) return;
    let data = [...result.data];
    const sort = document.getElementById('sort')?.value || '';
    if (sort.includes('menor')) data.sort((a,b) => Number(a.price) - Number(b.price));
    if (sort.includes('mayor')) data.sort((a,b) => Number(b.price) - Number(a.price));

    let favorites = [];
    try { favorites = await getUserFavoriteIds(); } catch {}
    grid.innerHTML = data.length ? data.map(item => createListingCard(item, favorites.includes(item.id))).join('') : '<div class="empty">No encontramos publicaciones con esos filtros.</div>';
    setText('count', `${data.length} publicación${data.length === 1 ? '' : 'es'}`);
  }

  document.getElementById('searchBtn')?.addEventListener('click', render);
  ['search','model','condition','storage','municipality','sort'].forEach(id => document.getElementById(id)?.addEventListener('change', render));
  search?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); render(); } });
  await render();
  initFavoriteButtons();
}

async function initIphone() {
  const result = await loadListingDetail();
  if (result.error || !result.data) return;
  const listing = result.data;
  const title = document.querySelector('[data-listing-title]') || document.querySelector('h1');
  const price = document.querySelector('[data-listing-price]');
  const image = document.querySelector('[data-listing-image]') || document.querySelector('.product-image img');
  const favoriteButton = document.querySelector('.favorite-btn');
  if (title) title.textContent = listing.title || listing.model || 'iPhone';
  if (price) price.textContent = formatCurrency(listing.price);
  if (image && listing.listing_images?.[0]?.image_url) image.src = listing.listing_images[0].image_url;
  if (favoriteButton) favoriteButton.dataset.favoriteId = listing.id;
  if (favoriteButton) { try { const ids = await getUserFavoriteIds(); if (ids.includes(listing.id)) { favoriteButton.classList.add('active'); favoriteButton.textContent = '♥ Guardado'; } } catch {} }
  initFavoriteButtons();
  document.querySelectorAll('[data-listing-field]').forEach(el => {
    const field = el.dataset.listingField;
    el.textContent = listing[field] ?? 'N/D';
  });
}

async function initPublish() {
  const form = document.getElementById('listingForm');
  if (!form) return;
  const user = await requireAuth();
  if (!user) return;

  const files = () => Array.from(form.querySelectorAll('input[type="file"]')).flatMap(input => Array.from(input.files || []));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const fd = new FormData(form);
    const get = name => fd.get(name);
    const battery = get('battery');
    const title = `${get('model') || 'iPhone'} ${get('storage') || ''}`.trim();

    if (!get('color')) return showToast('Selecciona el color del iPhone.', 'warning');
    if (!get('price')) return showToast('Introduce el precio.', 'warning');

    const payload = {
      title,
      model: get('model'),
      price: Number(get('price')),
      status: 'pending',
      storage_capacity: get('storage'),
      aesthetic_condition: get('condition'),
      color: get('color'),
      battery_health: battery ? Number(battery) : null,
      battery_type: get('battery_type') || null,
      factory_unlocked: fd.has('unlocked'),
      face_id: fd.has('face_id'),
      true_tone: fd.has('true_tone'),
      warranty_days: get('warranty_days') ? Number(get('warranty_days')) : 0,
      cable: fd.has('cable'),
      charger: fd.has('charger'),
      municipality: get('municipality'),
      address: get('address'),
      description: get('description')
    };

    const result = await createListing(payload, files().slice(0, 5));
    if (!result.success) return showToast(result.error, 'error', 6000);
    showToast('Publicación enviada para revisión.', 'success');
    setTimeout(() => redirect('mis-publicaciones.html'), 800);
  });
}

async function initFavoritesPage() {
  const grid = document.getElementById('favoritesGrid');
  if (!grid) return;
  const user = await requireAuth();
  if (!user) return;
  const ids = await getUserFavoriteIds();
  if (!ids.length) {
    grid.innerHTML = '<div class="empty-state" id="emptyState">Todavía no tienes favoritos.</div>';
    setText('favoritesCount', '0');
    return;
  }

  const { data, error } = await supabase.from('listings').select(`*, listing_images(image_url, display_order)`).in('id', ids).eq('status', 'active');
  if (error) throw error;
  grid.innerHTML = (data || []).map(item => createListingCard(item, true)).join('');
  setText('favoritesCount', String(data?.length || 0));
  initFavoriteButtons();
}

async function initProfile() {
  const user = await requireAuth();
  if (!user) return;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) return;
  if (!data) return;
  setText('profileName', data.full_name || 'Usuario');
  setText('profileEmail', user.email || '');
  setText('profileLocation', data.municipality || 'La Habana');
  const avatar = document.getElementById('profileAvatar');
  if (avatar && data.avatar_url) avatar.src = data.avatar_url;
}

async function initMyListings() {
  const list = document.getElementById('listingsList');
  if (!list) return;
  const user = await requireAuth();
  if (!user) return;
  const { data, error } = await supabase.from('listings').select(`*, listing_images(image_url, display_order)`).eq('seller_id', user.id).order('created_at', { ascending: false });
  if (error) return;
  if (!data?.length) {
    list.innerHTML = '<div class="empty-state">Todavía no has publicado ningún iPhone.</div>';
    return;
  }
  list.innerHTML = data.map(item => createListingCard(item, false)).join('');
}

async function initSales() {
  const list = document.getElementById('salesList');
  if (!list) return;
  const user = await requireAuth();
  if (!user) return;
  const result = await getUserSalesHistory('seller');
  if (result.error) {
    showToast('No se pudieron cargar las ventas.', 'error');
    return;
  }
  const sales = result.data || [];
  if (!sales.length) {
    list.innerHTML = '<div class="empty-state">Todavía no tienes ventas registradas.</div>';
    return;
  }
  list.innerHTML = sales.map(sale => {
    const listing = sale.listings || {};
    const image = listing.listing_images?.[0]?.image_url || 'assets/images/iphone-placeholder.webp';
    const status = sale.status || 'reported';
    return `<article class="sale-card" data-status="${escapeText(status)}" data-sale-id="${escapeText(sale.id)}">
      <div class="sale-main"><div class="sale-image"><img src="${escapeText(image)}" alt="${escapeText(listing.title || listing.model || 'iPhone')}"></div>
      <div class="sale-info"><h2>${escapeText(listing.title || listing.model || 'iPhone')}</h2><div class="sale-details">${escapeText(status)}</div></div></div>
      <div class="sale-side"><div class="sale-price"><strong>${formatCurrency(sale.sold_price_usd ?? listing.price)}</strong></div>
      ${status !== 'confirmed' ? `<button class="btn-confirm" data-sale="${escapeText(sale.id)}">Confirmar venta</button>` : '<span class="sale-confirmed">✓ Venta confirmada</span>'}</div></article>`;
  }).join('');

  list.addEventListener('click', async event => {
    const button = event.target.closest('.btn-confirm');
    if (!button) return;
    try {
      await confirmSale(button.dataset.sale);
      button.outerHTML = '<span class="sale-confirmed">✓ Venta confirmada</span>';
    } catch (error) {
      showToast(error.message || 'No se pudo confirmar la venta.', 'error');
    }
  });
}

async function initMessages() {
  const list = document.getElementById('conversationList');
  const messages = document.getElementById('chatMessages');
  if (!list || !messages) return;
  const user = await requireAuth();
  if (!user) return;

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`id, participant_a, participant_b, listing_id, updated_at`)
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (error) {
    showToast('La mensajería no está disponible. Ejecuta supabase/migration_messages.sql.', 'error', 7000);
    return;
  }

  if (!conversations?.length) {
    list.innerHTML = '<div class="conversation-empty"><p>No tienes conversaciones todavía.</p></div>';
    return;
  }

  for (const conversation of conversations) {
    const otherId = conversation.participant_a === user.id ? conversation.participant_b : conversation.participant_a;
    const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', otherId).maybeSingle();
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'conversation';
    row.dataset.conversationId = conversation.id;
    row.dataset.name = profile?.full_name || 'Usuario';
    row.innerHTML = `<div class="conversation-content"><div class="conversation-top"><strong>${escapeText(profile?.full_name || 'Usuario')}</strong></div><div class="conversation-bottom"><span>Conversación</span></div></div>`;
    list.appendChild(row);
  }

  list.addEventListener('click', async event => {
    const row = event.target.closest('.conversation');
    if (!row) return;
    document.querySelectorAll('.conversation').forEach(x => x.classList.remove('active'));
    row.classList.add('active');
    setText('chatUserName', row.dataset.name);
    const { data: rows, error: messageError } = await supabase.from('messages').select('id, sender_id, body, created_at, read_at').eq('conversation_id', row.dataset.conversationId).order('created_at');
    if (messageError) return showToast(messageError.message, 'error');
    messages.innerHTML = (rows || []).map(msg => `<div class="message-row ${msg.sender_id === user.id ? 'sent' : 'received'}"><div class="message-bubble-wrapper"><div class="message-bubble">${escapeText(msg.body)}</div><time>${new Date(msg.created_at).toLocaleTimeString('es-CU',{hour:'2-digit',minute:'2-digit'})}</time></div></div>`).join('');
    messages.scrollTop = messages.scrollHeight;
    document.getElementById('messagesApp')?.classList.add('conversation-open');

    const composer = document.getElementById('messageComposer');
    composer?.addEventListener('submit', async e => {
      e.preventDefault();
      const input = document.getElementById('messageInput');
      const body = input?.value.trim();
      if (!body) return;
      const { error: sendError } = await supabase.from('messages').insert({ conversation_id: row.dataset.conversationId, sender_id: user.id, body });
      if (sendError) return showToast(sendError.message, 'error');
      input.value = '';
      row.click();
    }, { once: true });
  });
}




async function initSeller() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id || id.startsWith('demo')) return;
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error || !profile) return showToast('No se pudo cargar el vendedor.', 'error');
  const { data: listings } = await supabase.from('listings').select(`*, listing_images(image_url, display_order)`).eq('seller_id', id).eq('status','active').order('created_at',{ascending:false});
  const name = profile.full_name || 'Vendedor';
  const h1 = document.querySelector('.seller-info h1'); if (h1) h1.textContent = name;
  const location = document.querySelector('.seller-location'); if (location) location.textContent = `⌖ ${profile.municipality || 'La Habana'}`;
  const heading = document.querySelector('.listings-header h2'); if (heading) heading.textContent = `Publicaciones de ${name}`;
  const count = document.querySelector('.listing-count'); if (count) count.textContent = `${listings?.length || 0} publicaciones`;
  const grid = document.querySelector('.listing-grid');
  if (grid) grid.innerHTML = (listings || []).map(item => createListingCard(item, false)).join('') || '<p>No hay publicaciones activas.</p>';
}

async function initEditListing() {
  const form = document.getElementById('editListingForm');
  if (!form) return;
  const user = await requireAuth();
  if (!user) return;
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) return showToast('No se indicó la publicación que quieres editar.', 'error');

  const { data: listing, error } = await supabase.from('listings').select('*').eq('id', id).eq('seller_id', user.id).maybeSingle();
  if (error || !listing) return showToast('No se pudo cargar tu publicación.', 'error');

  const set = (name, value) => { const el = form.elements[name]; if (!el) return; if (el.type === 'checkbox') el.checked = Boolean(value); else el.value = value ?? ''; };
  set('model', listing.model); set('storage', listing.storage_capacity); set('color', listing.color); set('condition', listing.aesthetic_condition); set('price', listing.price);
  set('factoryUnlocked', listing.factory_unlocked); set('battery', listing.battery_health); set('batteryOriginal', listing.battery_type === 'original'); set('faceId', listing.face_id); set('trueTone', listing.true_tone); set('warranty', Number(listing.warranty_days) > 0); set('hasCable', listing.cable); set('hasCharger', listing.charger);
  set('municipality', listing.municipality); set('address', listing.address); set('description', listing.description); set('issues', listing.issues);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const fd = new FormData(form);
    const updates = {
      model: fd.get('model'), storage_capacity: fd.get('storage'), color: fd.get('color'), aesthetic_condition: fd.get('condition'),
      price: Number(fd.get('price')), factory_unlocked: fd.has('factoryUnlocked'), battery_health: fd.get('battery') ? Number(fd.get('battery')) : null,
      battery_type: fd.has('batteryOriginal') ? 'original' : (listing.battery_type || null), face_id: fd.has('faceId'), true_tone: fd.has('trueTone'),
      warranty_days: fd.get('warranty') ? Number(fd.get('warranty_days') || 0) : 0, cable: fd.has('hasCable'), charger: fd.has('hasCharger'),
      municipality: fd.get('municipality'), address: fd.get('address'), description: fd.get('description'), issues: fd.get('issues'), updated_at: new Date().toISOString()
    };
    toggleGlobalLoader(true);
    try {
      const { error: updateError } = await supabase.from('listings').update(updates).eq('id', id).eq('seller_id', user.id);
      if (updateError) throw updateError;
      showToast('Publicación actualizada correctamente.', 'success');
    } catch (error) { showToast(error.message || 'No se pudo actualizar la publicación.', 'error', 7000); } finally { toggleGlobalLoader(false); }
  });
}

async function initAccountControls() {
  const logout = document.getElementById('logoutButton');
  if (logout) {
    logout.addEventListener('click', async event => {
      event.preventDefault();
      await signOutUser();
    });
  }

  const user = await getCurrentUser();
  if (!user) return;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile) return;

  if (document.getElementById('accountName')) setText('accountName', profile.full_name || 'Usuario');
  if (document.getElementById('accountEmail')) setText('accountEmail', user.email || '');
  if (document.getElementById('accountPhone')) setText('accountPhone', profile.phone_number || 'No indicado');
}

async function initVerification() {
  const form = document.getElementById('verificationForm');
  if (!form) return;
  const user = await requireAuth();
  if (!user) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const documentFile = document.getElementById('documentFile')?.files?.[0];
    const selfieFile = document.getElementById('selfieFile')?.files?.[0];
    if (!documentFile || !selfieFile) return showToast('Debes seleccionar el documento y la selfie.', 'warning');

    toggleGlobalLoader(true);
    try {
      const upload = async file => {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('verifications').upload(path, file, { upsert: false });
        if (error) throw error;
        return path;
      };
      const documentPath = await upload(documentFile);
      const selfiePath = await upload(selfieFile);
      const { error } = await supabase.from('verification_requests').insert({
        user_id: user.id,
        document_type: document.getElementById('documentType')?.value || 'identity_card',
        document_url: documentPath,
        selfie_url: selfiePath,
        status: 'pending'
      });
      if (error) throw error;
      showToast('Solicitud de verificación enviada.', 'success');
      form.reset();
    } catch (error) {
      showToast(error.message || 'No se pudo enviar la verificación.', 'error', 7000);
    } finally {
      toggleGlobalLoader(false);
    }
  });
}

async function main() {
  const page = pageName();
  const isAdminPage = window.location.pathname.includes('/admin/');
  const connection = await initApp();

  if (isAdminPage) {
    const user = await requireAuth();
    if (!user) return;
    if (!connection.connected) return;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!['admin', 'moderator'].includes(profile?.role)) { redirect('../index.html'); return; }
    const metrics = await fetchAdminMetrics();
    document.getElementById('kpi-users')?.replaceChildren(document.createTextNode(String(metrics.totalUsers)));
    document.getElementById('kpi-listings')?.replaceChildren(document.createTextNode(String(metrics.activeListings)));
    document.getElementById('kpi-kyc')?.replaceChildren(document.createTextNode(String(metrics.pendingVerification)));
    return;
  }

  if (protectedPages.has(page)) {
    const user = await requireAuth();
    if (!user) return;
  }

  if (!connection.connected) return;

  try {
    switch (page) {
      case 'index.html': await initIndex(); break;
      case 'login.html': await initLogin(); break;
      case 'registro.html': await initRegister(); break;
      case 'buscar.html': await initSearch(); break;
      case 'iphone.html': await initIphone(); break;
      case 'publicar.html': await initPublish(); break;
      case 'favoritos.html': await initFavoritesPage(); break;
      case 'perfil.html': await initProfile(); await initAccountControls(); break;
      case 'mis-publicaciones.html': await initMyListings(); break;
      case 'editar-publicacion.html': await initEditListing(); break;
      case 'ventas.html': await initSales(); break;
      case 'mensajes.html': await initMessages(); break;
      case 'verificacion.html': await initVerification(); break;
      case 'vendedor.html': await initSeller(); break;
      case 'configuracion.html': await initAccountControls(); break;
    }
  } catch (error) {
    console.error('[iMarket] Page initialization error:', error);
    showConnectionError(error);
    showToast(error.message || 'No se pudo cargar esta sección.', 'error', 7000);
  }
}

document.addEventListener('DOMContentLoaded', main, { once: true });
