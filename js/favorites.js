import { supabase } from './supabase.js';
import { showToast } from './app.js';

/**
 * Obtiene los IDs de todas las publicaciones marcadas como favoritas por el usuario.
 */
export async function getUserFavoriteIds() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Error al obtener favoritos:', error);
    return [];
  }

  return data.map(item => item.listing_id);
}

/**
 * Alterna el estado de favorito de una publicación (Agregar / Quitar).
 * 
 * @param {string} listingId - UUID de la publicación
 * @param {HTMLElement} [btnElement] - Botón para actualizar su estilo en vivo
 */
export async function toggleFavorite(listingId, btnElement = null) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    showToast('Debes iniciar sesión para guardar favoritos', 'warning');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return false;
  }

  const userId = session.user.id;

  // Verificar si ya existe en favoritos
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (existing) {
    // Eliminar de favoritos
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', existing.id);

    if (error) {
      showToast('No se pudo quitar de favoritos', 'error');
      return false;
    }

    showToast('Eliminado de tus favoritos', 'info');
    if (btnElement) {
      btnElement.classList.remove('active');
      const icon = btnElement.querySelector('svg');
      if (icon) {
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
      }
    }
    return false;
  } else {
    // Agregar a favoritos
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, listing_id: listingId });

    if (error) {
      showToast('Error al guardar en favoritos', 'error');
      return false;
    }

    showToast('Guardado en tus favoritos', 'success');
    if (btnElement) {
      btnElement.classList.add('active');
      const icon = btnElement.querySelector('svg');
      if (icon) {
        icon.setAttribute('fill', '#e63946');
        icon.setAttribute('stroke', '#e63946');
      }
    }
    return true;
  }
}

/**
 * Delegación global para eventos click en botones de favoritos (.favorite-btn).
 */
export function initFavoriteButtons() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.favorite-btn');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const listingId = btn.dataset.favoriteId;
    if (listingId) {
      await toggleFavorite(listingId, btn);
    }
  });
}
