import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase configuration is missing. Authentication functionality will not work until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are added to your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
