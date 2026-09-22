import { supabase } from './supabase.js';
import { showToast, toggleGlobalLoader } from './app.js';

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function ensureProfile(user, metadata = {}) {
  if (!user) return { success: false, error: 'Usuario no autenticado.' };

  const payload = {
    id: user.id,
    full_name: metadata.full_name ?? user.user_metadata?.full_name ?? '',
    phone_number: metadata.phone_number ?? user.user_metadata?.phone_number ?? null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function signUpUser(email, password, metadata = {}) {
  try {
    toggleGlobalLoader(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: metadata.full_name || '',
          phone_number: metadata.phone_number || ''
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error('Supabase no devolvió el usuario registrado.');

    let profileResult = null;
    if (data.session) {
      profileResult = await ensureProfile(data.user, metadata);
      if (!profileResult.success) throw new Error(profileResult.error);
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
      requiresEmailConfirmation: !data.session,
      profile: profileResult?.data || null
    };
  } catch (error) {
    console.error('[iMarket] signUpUser:', error);
    return { success: false, error: error.message || 'No se pudo crear la cuenta.' };
  } finally {
    toggleGlobalLoader(false);
  }
}

export async function signInUser(email, password) {
  try {
    toggleGlobalLoader(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) throw error;

    await ensureProfile(data.user);
    return { success: true, user: data.user, session: data.session };
  } catch (error) {
    console.error('[iMarket] signInUser:', error);
    return { success: false, error: error.message || 'No se pudo iniciar sesión.' };
  } finally {
    toggleGlobalLoader(false);
  }
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    showToast(error.message || 'No se pudo cerrar la sesión.', 'error');
    return false;
  }

  const loginUrl = new URL('login.html', window.location.href).href;
  window.location.href = loginUrl;
  return true;
}

export async function sendPasswordReset(email) {
  try {
    const redirectTo = new URL('configuracion.html', window.location.href).href;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'No se pudo enviar el correo.' };
  }
}

export function getFriendlyAuthError(message = '') {
  const text = message.toLowerCase();
  if (text.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.';
  if (text.includes('email not confirmed')) return 'Debes confirmar tu correo antes de iniciar sesión.';
  if (text.includes('user already registered')) return 'Ya existe una cuenta con ese correo.';
  if (text.includes('password should be at least')) return 'La contraseña no cumple los requisitos mínimos.';
  if (text.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  return message || 'Ocurrió un error con Supabase.';
}
