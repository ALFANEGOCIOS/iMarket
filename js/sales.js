import { supabase } from './supabase.js';
import { showToast, toggleGlobalLoader } from './app.js';

export async function markAsSold(listingId, soldPriceUsd, buyerId = null, saleSource = 'external') {
  toggleGlobalLoader(true);
  try {
    const { data, error } = await supabase.rpc('mark_listing_sold', {
      p_listing_id: listingId,
      p_sold_price_usd: Number(soldPriceUsd),
      p_buyer_id: buyerId,
      p_sale_source: saleSource
    });
    if (error) throw error;
    showToast('La publicación fue marcada como vendida.', 'success');
    return { success: true, data };
  } catch (error) {
    console.error('[iMarket] markAsSold:', error);
    showToast(error.message || 'No se pudo registrar la venta.', 'error');
    return { success: false, error: error.message };
  } finally {
    toggleGlobalLoader(false);
  }
}

export async function confirmSale(saleId) {
  const { data, error } = await supabase.rpc('confirm_sale', { p_sale_id: saleId });
  if (error) throw error;
  return data;
}

export async function getUserSalesHistory(role = 'seller') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: new Error('No autenticado') };

  const column = role === 'buyer' ? 'buyer_id' : 'seller_id';
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      listings (id, title, model, price, listing_images (image_url)),
      buyer:buyer_id (id, full_name, avatar_url),
      seller:seller_id (id, full_name, avatar_url)
    `)
    .eq(column, user.id)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}
