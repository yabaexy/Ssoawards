import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DbCandidate = {
  id: string;
  name: string;
  story: string;
  reason: string;
  year: number;
  image_url?: string;
  video_url?: string;
  is_published: boolean;
  archived: boolean;
  created_at: string;
};

export type DbTopic = {
  id: string;
  title: string;
  description: string;
  options: string[];
  status: "open" | "resolved";
  winner_index?: number | null;
  creator_address: string;
  created_at: string;
  votes?: any[];
};

export type UserPoints = {
  wallet_address: string;
  points: number;
  muse_level: number;
  unlocked_skins: string[];
  current_skin: string;
  completed_missions: string[];
};