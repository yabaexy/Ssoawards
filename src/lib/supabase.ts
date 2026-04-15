import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

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
 */
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
}
