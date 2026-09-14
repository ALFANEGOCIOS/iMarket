import { supabase } from './supabase.js';

export async function loadListingDetail() {
  const params = new URLSearchParams(window.location.search);
  const listingId = params.get('id');

  if (!listingId) {
    window.location.href = '/buscar.html';
    return;
  }

  // Obtener publicación, imágenes y datos del vendedor
  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      listing_images ( image_url, display_order ),
      profiles:seller_id ( id, full_name, avatar_url, phone_number )
    `)
    .eq('id', listingId)
    .single();

  if (error || !listing) {
    console.error('Error al cargar la publicación:', error);
    return;
  }

  renderListingPage(listing);
}
