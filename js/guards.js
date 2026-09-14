import { supabase } from './supabase.js';

// Guard para páginas de usuarios autenticados (perfil.html, publicar.html, etc.)
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/login.html';
    return null;
  }
  return session.user;
}

// Guard para el panel de administración (/admin/*)
export async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return;

  // Consultar el rol en la tabla user_roles
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'moderator')[cite: 5];

  if (error || !isAdmin) {
    window.location.href = '/index.html';
  }
}
