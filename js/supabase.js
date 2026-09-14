import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Tu URL del proyecto (Project URL)
const SUPABASE_URL = 'https://jlolyhglduixwjjngcuk.supabase.co'; 

// Tu clave pública cliente (Publishable Key / Anon Key)
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Tby5rC8Eap2YANn859wggg_5yjFLdMZ'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
