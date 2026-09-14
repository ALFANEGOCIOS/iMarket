import { supabase } from './supabase.js';
import { getCurrentUser } from './auth.js';

/**
 * Obtiene los datos completos del perfil del usuario (públicos y privados).
 * 
 * @param {string} [userId] - ID opcional. Si no se provee, consulta el usuario autenticado.
 */
export async function getUserProfile(userId = null) {
  try {
    let targetId = userId;

    if (!targetId) {
      const currentUser = await getCurrentUser();
      if (!currentUser) throw new Error('Usuario no autenticado.');
      targetId = currentUser.id;
    }

    // 1. Consultar perfil público
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .single();

    if (profileError) throw profileError;

    // 2. Consultar perfil privado solo si es el propio usuario
    let privateProfile = null;
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.id === targetId) {
      const { data: pPrivate, error: privateError } = await supabase
        .from('profile_private')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (!privateError) {
        privateProfile = pPrivate;
      }
    }

    return {
      success: true,
      data: {
        ...profile,
        private: privateProfile
      }
    };
  } catch (error) {
    console.error('Error al obtener perfil:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Actualiza los datos públicos del perfil (public.profiles).
 * 
 * @param {Object} updates - Objeto con campos a actualizar (full_name, phone_number, etc.)
 */
export async function updatePublicProfile(updates) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado.');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error al actualizar perfil público:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Actualiza o inserta los datos privados/sensibles del perfil (public.profile_private).
 * 
 * @param {Object} privateData - Objeto con campos privados (identity_document, address, etc.)
 */
export async function updatePrivateProfile(privateData) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado.');

    const { data, error } = await supabase
      .from('profile_private')
      .upsert({
        id: user.id,
        ...privateData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error al actualizar perfil privado:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Sube o reemplaza el avatar del usuario en Supabase Storage
 * y actualiza la URL en la tabla public.profiles.
 * 
 * @param {File} fileObject - Archivo de imagen seleccionado desde un <input type="file">
 */
export async function uploadAvatar(fileObject) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado.');

    const fileExt = fileObject.name.split('.').pop();
    const filePath = `avatars/${user.id}-${Math.random()}.${fileExt}`;

    // 1. Subir imagen al Bucket 'avatars'
    const { error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(filePath, fileObject, { upsert: true });

    if (uploadError) throw uploadError;

    // 2. Obtener URL pública
    const { data: { publicUrl } } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(filePath);

    // 3. Guardar URL pública en public.profiles
    const updateResult = await updatePublicProfile({ avatar_url: publicUrl });
    if (!updateResult.success) throw new Error(updateResult.error);

    return { success: true, avatarUrl: publicUrl };
  } catch (error) {
    console.error('Error al subir avatar:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Envía una solicitud de verificación KYC creando un registro en la tabla
 * public.verification_requests.
 * 
 * @param {File} idDocumentFile - Fotografía del documento de identidad
 * @param {string} documentType - Tipo de documento (ej. 'carnet_identidad', 'pasaporte')
 */
export async function submitKYCVerification(idDocumentFile, documentType = 'carnet_identidad') {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado.');

    // 1. Subir imagen del documento a un bucket privado 'verifications'
    const fileExt = idDocumentFile.name.split('.').pop();
    const filePath = `kyc/${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase
      .storage
      .from('verifications')
      .upload(filePath, idDocumentFile, { upsert: true });

    if (uploadError) throw uploadError;

    // 2. Obtener la ruta o URL pública/firmada según políticas de privacidad
    const { data: { publicUrl } } = supabase
      .storage
      .from('verifications')
      .getPublicUrl(filePath);

    // 3. Crear solicitud de verificación en la base de datos
    const { data, error: kycError } = await supabase
      .from('verification_requests')
      .insert({
        user_id: user.id,
        document_type: documentType,
        document_url: publicUrl,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (kycError) throw kycError;

    return { success: true, data };
  } catch (error) {
    console.error('Error al enviar verificación KYC:', error.message);
    return { success: false, error: error.message };
  }
}
