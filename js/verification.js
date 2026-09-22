import { supabase } from './supabase.js';
import { showToast, toggleGlobalLoader } from './app.js';

/**
 * Sube el documento de identidad del usuario al storage y crea el registro de verificación KYC.
 * 
 * @param {File} docFile - Imagen frontal del carné o pasaporte
 * @param {File} selfieFile - Selfie sosteniendo la identificación
 * @param {string} docType - 'identity_card' | 'passport'
 */
export async function submitKYCVerification(docFile, selfieFile, docType = 'identity_card') {
  toggleGlobalLoader(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast('Sesión no encontrada', 'error');
      return;
    }

    const userId = session.user.id;

    // 1. Subir documento principal
    const docPath = `kyc/${userId}/doc_${Date.now()}.${docFile.name.split('.').pop()}`;
    const { error: uploadDocErr } = await supabase.storage
      .from('verifications')
      .upload(docPath, docFile);

    if (uploadDocErr) throw uploadDocErr;

    // 2. Subir selfie
    const selfiePath = `kyc/${userId}/selfie_${Date.now()}.${selfieFile.name.split('.').pop()}`;
    const { error: uploadSelfieErr } = await supabase.storage
      .from('verifications')
      .upload(selfiePath, selfieFile);

    if (uploadSelfieErr) throw uploadSelfieErr;

    // 3. Crear solicitud en DB
    const { error: dbErr } = await supabase
      .from('verification_requests')
      .insert({
        user_id: userId,
        document_type: docType,
        document_url: docPath,
        selfie_url: selfiePath,
        status: 'pending'
      });

    if (dbErr) throw dbErr;


    showToast('Documentos enviados a revisión correctamente.', 'success');
    return true;
  } catch (err) {
    showToast(err.message || 'Error al subir los documentos de verificación', 'error');
    return false;
  } finally {
    toggleGlobalLoader(false);
  }
}

/**
 * Consulta el estado actual del trámite KYC del usuario.
 */
export async function getKYCStatus() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return 'unverified';

  const { data, error } = await supabase
    .from('profiles')
    .select('verification_status')
    .eq('id', session.user.id)
    .single();

  if (error || !data) return 'unverified';
  return data.verification_status || 'unverified';
}
