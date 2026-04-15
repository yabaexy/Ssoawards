// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경 변수가 없습니다. Vercel에서 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 확인하세요.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);