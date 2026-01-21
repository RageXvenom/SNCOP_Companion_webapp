import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/* ---------------------------------------------------
   ✅ FIXED: Allow session persistence for logged-in users
   - Remove localStorage clearing on init
   - Enable persistSession so users stay logged in
   - Keep autoRefreshToken enabled for seamless experience
---------------------------------------------------- */

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,      // ✅ Enable automatic token refresh
    persistSession: true,         // ✅ Enable session persistence across refreshes
    detectSessionInUrl: true,     // Keep for recovery flows
    storageKey: 'supabase.auth.token', // Use consistent storage key
  }
});

/* ---------------------------------------------------
   Types
---------------------------------------------------- */
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  avatar_url?: string | null;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments: Array<{
    name: string;
    type: string;
    size: number;
    url?: string;
  }>;
  created_at: string;
}
