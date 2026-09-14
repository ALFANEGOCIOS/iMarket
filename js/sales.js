import { supabase } from './supabase.js';
import { showToast, toggleGlobalLoader } from './app.js';

/**
 * Registra una intención de compra o solicitud sobre un anuncio.
 */
export async function createPurchaseOffer(listingId, offerPrice, message = '') {
  toggleGlobalLoader(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast('Debes iniciar sesión para realizar una oferta', 'warning');
      return;
    }

    const { data, error } = await supabase
      .from('offers')
      .insert({
        listing_id: listingId,
        buyer_id: session.user.id,
        offered_price: offerPrice,
        message: message,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    showToast('¡Oferta enviada al vendedor exitosamente!', 'success');
    return data;
  } catch (err) {
    showToast(err.message || 'Error al enviar la oferta', 'error');
  } finally {
    toggleGlobalLoader(false);
  }
}

/**
 * Marca una publicación como vendida e invoca el RPC para cerrar el trato.
 * 
 * @param {string} listingId - ID de la publicación
 * @param {string} buyerId - ID del comprador seleccionado
 */
export async function markAsSold(listingId, buyerId) {
  toggleGlobalLoader(true);
  try {
    const { data, error } = await supabase.rpc('process_sale_transaction', {
      p_listing_id: listingId,
      p_buyer_id: buyerId
    });

    if (error) throw error;

    showToast('¡Venta completada! Se ha habilitado la opción de reseña.', 'success');
    return data;
  } catch (err) {
    showToast(err.message || 'Error al procesar la venta', 'error');
  } finally {
    toggleGlobalLoader(false);
  }
}

/**
 * Obtiene el historial de compras o ventas del usuario autenticado.
 * 
 * @param {'seller'|'buyer'} role - Rol a consultar
 */
export async function getUserSalesHistory(role = 'seller') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const columnFilter = role === 'seller' ? 'seller_id' : 'buyer_id';

  const { data, error } = await supabase
    .from('sales_history')
    .select(`
      *,
      listings (title, price, listing_images (image_url)),
      profiles:buyer_id (full_name, avatar_url)
    `)
    .eq(columnFilter, session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al consultar historial:', error);
    return [];
  }

  return data;
}
