// ============================================================
// iMarket Cuba - Supabase Client
// ============================================================

const SUPABASE_URL = "https://tvlabyorkrelsqxzbjth.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Tby5rC8Eap2YANn859wggg_5yjFLdMZ";

// Crear cliente de Supabase
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// Exponerlo globalmente para los demás archivos JS
window.supabaseClient = supabaseClient;