import { supabase } from './supabase.js';
import { formatCurrency, showToast, toggleGlobalLoader, escapeText } from './app.js';
import { getCurrentUser } from './auth.js';

export async function getActiveListings(filters = {}) {
  let query = supabase
    .from('listings')
    .select(`
      *,
      listing_images (image_url, display_order),
      profiles:seller_id (id, full_name, avatar_url)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters.model) query = query.eq('model', filters.model);
  if (filters.municipality) query = query.eq('municipality', filters.municipality);
  if (filters.condition) query = query.eq('aesthetic_condition', filters.condition);
  if (filters.storage) query = query.eq('storage_capacity', filters.storage);
  if (filters.query) {
    const q = filters.query.replace(/[%_]/g, '');
    query = query.or(`title.ilike.%${q}%,model.ilike.%${q}%,color.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, error } = await query;
  return { data: data || [], error };
}

export async function loadListingDetail(listingId = null) {
  const id = listingId || new URLSearchParams(window.location.search).get('id');
  if (!id) return { data: null, error: new Error('No se indicó la publicación.') };

  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      listing_images (image_url, display_order),
      profiles:seller_id (id, full_name, avatar_url, phone_number)
    `)
    .eq('id', id)
    .maybeSingle();

  return { data, error };
}

export function createListingCard(item, isFavorite = false) {
  const images = [...(item.listing_images || [])].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const image = images[0]?.image_url || 'assets/images/iphone-placeholder.webp';
  const title = item.title || item.model || 'iPhone';
  const battery = item.battery_health ? `🔋 ${item.battery_health}%` : 'Batería N/D';
  const storage = item.storage_capacity ? `${item.storage_capacity} GB` : '';

  return `
    <article class="iphone-card" data-id="${escapeText(item.id)}">
      <a href="iphone.html?id=${encodeURIComponent(item.id)}" class="listing-card-link">
        <div class="card-media">
          <img src="${escapeText(image)}" alt="${escapeText(title)}" loading="lazy">
          <span class="badge badge-condition">${escapeText(item.aesthetic_condition || 'Usado')}</span>
          <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-favorite-id="${escapeText(item.id)}" type="button" aria-label="Guardar favorito">
            ${isFavorite ? '♥' : '♡'}
          </button>
        </div>
        <div class="card-body">
          <h3 class="card-title">${escapeText(title)}</h3>
          <p class="card-price">${formatCurrency(item.price)}</p>
          <div class="card-meta"><span>${battery}</span><span>${escapeText(storage)}</span></div>
          <small>📍 ${escapeText(item.municipality || 'La Habana')}</small>
        </div>
      </a>
    </article>`;
}

export async function createListing(payload, files = []) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Debes iniciar sesión.' };

  toggleGlobalLoader(true);
  try {
    const listingPayload = { ...payload, seller_id: user.id };
    const { data: listing, error } = await supabase
      .from('listings')
      .insert(listingPayload)
      .select()
      .single();

    if (error) throw error;

    const imageRows = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${listing.id}/${crypto.randomUUID()}.${ext}`;

      const upload = await supabase.storage
        .from('listing_images')
        .upload(path, file, { cacheControl: '31536000', upsert: false });

      if (upload.error) throw upload.error;

      const { data: publicData } = supabase.storage.from('listing_images').getPublicUrl(path);
      imageRows.push({ listing_id: listing.id, image_url: publicData.publicUrl, display_order: index });
    }

    if (imageRows.length) {
      const { error: imageError } = await supabase.from('listing_images').insert(imageRows);
      if (imageError) throw imageError;
    }

    return { success: true, data: listing };
  } catch (error) {
    console.error('[iMarket] createListing:', error);
    return { success: false, error: error.message || 'No se pudo crear la publicación.' };
  } finally {
    toggleGlobalLoader(false);
  }
}
