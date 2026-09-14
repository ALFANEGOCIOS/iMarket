import { supabase } from './supabase.js';

/**
 * Registra un nuevo usuario en Supabase Auth y crea automáticamente
 * las entradas iniciales en 'profiles' y 'profile_private'.
 * 
 * @param {string} email 
 * @param {string} password 
 * @param {Object} metadata - Datos adicionales ({ full_name, phone_number, identity_document })
 */
export async function signUpUser(email, password, metadata = {}) {
  try {
    const { full_name, phone_number, identity_document } = metadata;

    // 1. Registro en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: full_name || ''
        }
      }
    });

    if (authError) throw authError;

    const user = authData.user;
    if (!user) throw new Error('No se pudo obtener la información del usuario registrado.');

    // 2. Insertar/Actualizar perfil público (public.profiles)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: full_name || '',
        phone_number: phone_number || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) throw profileError;

    // 3. Insertar/Actualizar datos privados (public.profile_private)
    if (identity_document) {
      const { error: privateError } = await supabase
        .from('profile_private')
        .upsert({
          id: user.id,
          identity_document: identity_document,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (privateError) throw privateError;
    }

    return { success: true, user: authData.user, session: authData.session };
  } catch (error) {
    console.error('Error en signUpUser:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Inicia sesión con correo y contraseña.
 * 
 * @param {string} email 
 * @param {string} password 
 */
export async function signInUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) throw error;

    return { success: true, user: data.user, session: data.session };
  } catch (error) {
    console.error('Error en signInUser:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Cierra la sesión activa del usuario y redirige a la página principal.
 */
export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    window.location.href = '/login.html';
  } catch (error) {
    console.error('Error al cerrar sesión:', error.message);
  }
}

/**
 * Envía un correo electrónico para restablecer la contraseña.
 * 
 * @param {string} email 
 */
export async function sendPasswordReset(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/configuracion.html`
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error en sendPasswordReset:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene el usuario autenticado actualmente en el navegador.
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (error) {
    console.error('Error en getCurrentUser:', error.message);
    return null;
  }
}
