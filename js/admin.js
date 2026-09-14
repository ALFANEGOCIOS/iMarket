import { supabase } from './supabase.js';
import { showToast, toggleGlobalLoader } from './app.js';

/**
 * Verifica si el usuario actual tiene el rol de administrador.
 */
export async function checkAdminAccess() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '../login.html';
    return false;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'admin') {
    showToast('Acceso denegado: Área restringida a administradores', 'error');
    setTimeout(() => { window.location.href = '../index.html'; }, 1500);
    return false;
  }

  return true;
}

/**
 * Obtiene métricas generales para las KPI Cards del Admin.
 */
export async function fetchAdminMetrics() {
  const [usersCount, listingsCount, pendingKycCount] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('kyc_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  ]);

  return {
    totalUsers: usersCount.count || 0,
    activeListings: listingsCount.count || 0,
    pendingKYC: pendingKycCount.count || 0
  };
}

/**
 * Moderación de publicaciones (Aprobar o Pausar/Rechazar).
 */
export async function moderateListing(listingId, status) {
  toggleGlobalLoader(true);
  try {
    const { error } = await supabase
      .from('listings')
      .update({ status: status })
      .eq('id', listingId);

    if (error) throw error;

    showToast(`Publicación actualizada a: ${status}`, 'success');
  } catch (err) {
    showToast(err.message || 'Error al moderar publicación', 'error');
  } finally {
    toggleGlobalLoader(false);
  }
}

/**
 * Evalúa y aprueba/rechaza una solicitud KYC de un usuario.
 */
export async function reviewKYCRequest(requestId, userId, approve = true) {
  toggleGlobalLoader(true);
  try {
    const newStatus = approve ? 'approved' : 'rejected';

    // 1. Actualizar solicitud KYC
    const { error: kycErr } = await supabase
      .from('kyc_requests')
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .eq('id', requestId);

    if (kycErr) throw kycErr;

    // 2. Actualizar el perfil del usuario
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ kyc_status: newStatus })
      .eq('id', userId);

    if (profileErr) throw profileErr;

    showToast(`Verificación KYC ${approve ? 'Aprobada' : 'Rechazada'}`, approve ? 'success' : 'info');
  } catch (err) {
    showToast(err.message || 'Error al procesar la verificación', 'error');
  } finally {
    toggleGlobalLoader(false);
  }
}
