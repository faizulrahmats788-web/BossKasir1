import { createClient } from '@supabase/supabase-js';
// Jika kamu punya file types hasil generate dari Supabase CLI, import di sini:
// import { Database } from './types/supabase'; 

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://skgejbigujzchtudvriv.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_PkiEi5gWtYW6fT7o_00f4g_gpz8FSjB';

// Validasi runtime: Cegah aplikasi jalan jika env variable krusial hilang atau masih berupa placeholder bawaan
if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseUrl === '') {
  throw new Error(
    "VITE_SUPABASE_URL is missing. Please configure VITE_SUPABASE_URL in the Secrets / Settings panel of AI Studio so the app can connect to your Supabase project."
  );
}

if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY' || supabaseAnonKey === '') {
  throw new Error(
    "VITE_SUPABASE_ANON_KEY is missing. Please configure VITE_SUPABASE_ANON_KEY in the Secrets / Settings panel of AI Studio."
  );
}

// Inisialisasi client dengan Type Safety (Opsional tapi sangat direkomendasikan)
// export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);