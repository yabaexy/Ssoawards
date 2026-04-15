import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DbCandidate {
  id: string;
  name: string;
  story: string;
  reason: string;
  year: number;
  image_url?: string;
  video_url?: string;
  created_at: string;
}
