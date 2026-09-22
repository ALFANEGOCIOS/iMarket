import { supabase } from './supabase.js';
import { showToast, toggleGlobalLoader } from './app.js';
import { requireAdmin } from './guards.js';

export async function checkAdminAccess() {
  return await requireAdmin();
}

export async function fetchAdminMetrics() {
  const [users, listings, verifications, sales] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('verification_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('sales').select('id', { count: 'exact', head: true })
  ]);

  return {
    totalUsers: users.count || 0,
    activeListings: listings.count || 0,
    pendingVerification: verifications.count || 0,
    totalSales: sales.count || 0,
    errors: [users, listings, verifications, sales].filter(r => r.error).map(r => r.error)
  };
}

export async function moderateListing(listingId, status) {
  toggleGlobalLoader(true);
  try {
    const { error } = await supabase.from('listings').update({ status }).eq('id', listingId);
    if (error) throw error;
    showToast('Publicación actualizada.', 'success');
    return true;
  } catch (error) {
    showToast(error.message || 'No se pudo actualizar la publicación.', 'error');
    return false;
  } finally {
    toggleGlobalLoader(false);
  }
}

export async function reviewVerification(requestId, userId, approve = true) {
  toggleGlobalLoader(true);
  try {
    const status = approve ? 'approved' : 'rejected';
    const { error: requestError } = await supabase
      .from('verification_requests')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', requestId);
    if (requestError) throw requestError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ verification_status: status, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (profileError) throw profileError;

    showToast(approve ? 'Verificación aprobada.' : 'Verificación rechazada.', 'success');
    return true;
  } catch (error) {
    showToast(error.message || 'No se pudo procesar la verificación.', 'error');
    return false;
  } finally {
    toggleGlobalLoader(false);
  }
}
