import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Required Supabase Table Schema:
 * 
 * Table: candidates
 * Columns:
 * - id: uuid (primary key, default: gen_random_uuid())
 * - name: text (required)
 * - story: text (required)
 * - reason: text (required)
 * - year: int4 (required)
 * - image_url: text (optional)
 * - video_url: text (optional)
 * - created_at: timestamptz (default: now())
 * 
 * Table: topics
 * Columns:
 * - id: uuid (primary key, default: gen_random_uuid())
 * - title: text (required)
 * - description: text (required)
 * - options: jsonb (required, array of strings)
 * - status: text (default: 'open')
 * - winner_index: int4 (optional)
 * - creator_address: text (required)
 * - created_at: timestamptz (default: now())
 * 
 * Table: votes
 * Columns:
 * - id: uuid (primary key, default: gen_random_uuid())
 * - topic_id: uuid (required, references topics.id)
 * - voter_address: text (required)
 * - option_index: int4 (required)
 * - created_at: timestamptz (default: now())
 * 
 * Table: user_points
 * Columns:
 * - wallet_address: text (primary key)
 * - points: int4 (default: 0)
 * - muse_level: int4 (default: 1)
 * - unlocked_skins: jsonb (default: '["default"]')
 * - current_skin: text (default: 'default')
 * - completed_missions: jsonb (default: '[]')
 */
export interface DbCandidate {
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
}

export interface DbTopic {
  id: string;
  title: string;
  description: string;
  options: string[];
  status: 'open' | 'resolved';
  winner_index?: number;
  creator_address: string;
  created_at: string;
}

export interface DbVote {
  id: string;
  topic_id: string;
  voter_address: string;
  option_index: number;
  created_at: string;
}

export interface UserPoints {
  wallet_address: string;
  points: number;
  muse_level: number;
  unlocked_skins: string[];
  current_skin: string;
  completed_missions: string[];
}
