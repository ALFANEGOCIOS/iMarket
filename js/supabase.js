// ============================================================
// iMarket Cuba - Supabase Client
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://tvlabyorkrelsqxzbjth.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Tby5rC8Eap2YANn859wggg_5yjFLdMZ';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export async function checkSupabaseConnection() {
  try {
    const { error } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;
    return { connected: true, error: null };
  } catch (error) {
    console.error('[iMarket] Supabase connection error:', error);
    return { connected: false, error };
  }
}

export function getProjectBaseUrl() {
  return new URL('.', window.location.href).href;
}
