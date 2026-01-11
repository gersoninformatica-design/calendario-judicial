
import { createClient } from '@supabase/supabase-js';

// Extraemos las variables del shim global definido en index.html
const supabaseUrl = (window as any).process?.env?.SUPABASE_URL || '';
const supabaseAnonKey = (window as any).process?.env?.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("TribunalSync: Credenciales de Supabase no encontradas. Verifica index.html.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
