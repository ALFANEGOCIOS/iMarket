import { supabase } from './supabase.js';
import { showToast } from './app.js';

export async function getUserFavoriteIds() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('favorites').select('listing_id').eq('user_id', user.id);
  if (error) throw error;
  return (data || []).map(row => row.listing_id);
}

export async function toggleFavorite(listingId, button = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    showToast('Debes iniciar sesión para guardar favoritos.', 'warning');
    window.location.href = new URL('login.html', window.location.href).href;
    return false;
  }

  const { data: existing, error: lookupError } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    const { error } = await supabase.from('favorites').delete().eq('id', existing.id);
    if (error) throw error;
    button?.classList.remove('active');
    if (button) button.textContent = '♡';
    showToast('Eliminado de favoritos.', 'info');
    return false;
  }

  const { error } = await supabase.from('favorites').insert({ user_id: user.id, listing_id: listingId });
  if (error) throw error;
  button?.classList.add('active');
  if (button) button.textContent = '♥';
  showToast('Guardado en favoritos.', 'success');
  return true;
}

export function initFavoriteButtons() {
  document.addEventListener('click', async event => {
    const button = event.target.closest('.favorite-btn');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();

    try {
      await toggleFavorite(button.dataset.favoriteId, button);
    } catch (error) {
      console.error(error);
      showToast('No se pudo actualizar favoritos.', 'error');
    }
  });
}
