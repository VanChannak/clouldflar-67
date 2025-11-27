import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eoidzprqsvimgtwegowv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvaWR6cHJxc3ZpbWd0d2Vnb3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwODM1NzYsImV4cCI6MjA2MTY1OTU3Nn0.YPcdyKJqBs46rtdEPqGfYWvSegK6dL3i3onbA8LA9Vc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Type definitions for database tables
export interface Content {
  id: string;
  title: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  type?: 'movie' | 'series';
  created_at?: string;
}

export interface Episode {
  id: string;
  show_id: string;
  title: string;
  episode_number: number;
  season_number?: number;
  overview?: string;
  still_path?: string;
  air_date?: string;
  duration?: string;
  description?: string;
  thumbnail?: string;
  created_at?: string;
  access_type?: 'free' | 'membership' | 'purchase';
}

export interface VideoSource {
  id: string;
  episode_id?: string;
  content_id?: string;
  url: string;
  source_type: string;
  quality?: string;
  quality_urls?: Record<string, string>;
  is_default?: boolean;
  name?: string;
  server_name?: string;
  version?: string;
  language?: string;
  created_at?: string;
}
