import { supabase } from './supabase.js';

function redirectTo(file) {
  window.location.href = new URL(file, window.location.href).href;
}

export async function requireAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    redirectTo('login.html');
    return null;
  }
  return data.session.user;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return { data, error };
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !['admin', 'moderator'].includes(profile?.role)) {
    redirectTo('index.html');
    return null;
  }

  return user;
}
