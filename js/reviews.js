import { supabase } from './supabase.js';
import { showToast, toggleGlobalLoader } from './app.js';

/**
 * Publica una calificación y reseña hacia otro usuario.
 * 
 * @param {Object} reviewData
 * @param {string} reviewData.reviewedUserId - Usuario que recibe la reseña
 * @param {string} reviewData.listingId - Anuncio involucrado
 * @param {number} reviewData.rating - Puntuación (1-5)
 * @param {string} reviewData.comment - Comentario u opinión
 */
export async function submitReview({ reviewedUserId, listingId, rating, comment }) {
  if (rating < 1 || rating > 5) {
    showToast('La calificación debe estar entre 1 y 5 estrellas', 'warning');
    return;
  }

  toggleGlobalLoader(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast('Debes iniciar sesión para calificar', 'warning');
      return;
    }

    const { error } = await supabase
      .from('reviews')
      .insert({
        reviewer_id: session.user.id,
        reviewed_id: reviewedUserId,
        listing_id: listingId,
        rating: rating,
        comment: comment
      });

    if (error) throw error;

    showToast('¡Reseña publicada con éxito!', 'success');
    return true;
  } catch (err) {
    showToast(err.message || 'Error al enviar la reseña', 'error');
    return false;
  } finally {
    toggleGlobalLoader(false);
  }
}

/**
 * Obtiene la lista de reseñas recibidas por un usuario y calcula el promedio.
 * 
 * @param {string} userId - ID del usuario a consultar
 */
export async function getUserReviews(userId) {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      reviewer:reviewer_id (full_name, avatar_url)
    `)
    .eq('reviewed_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener reseñas:', error);
    return { reviews: [], average: 0, total: 0 };
  }

  const total = data.length;
  const average = total > 0 
    ? (data.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
    : 0;

  return { reviews: data, average: parseFloat(average), total };
}

/**
 * Genera el string HTML para renderizar estrellas fijas o interactivas.
 * 
 * @param {number} rating - Valor numérico (0 a 5)
 * @returns {string} HTML de las estrellas
 */
export function renderStarRating(rating) {
  let starsHtml = '<div class="star-rating">';
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= Math.round(rating);
    starsHtml += `<span class="star ${isFilled ? 'filled' : ''}">${isFilled ? '★' : '☆'}</span>`;
  }
  starsHtml += '</div>';
  return starsHtml;
}
