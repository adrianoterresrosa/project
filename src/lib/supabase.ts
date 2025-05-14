import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Configure client with retry and timeout
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'financial-system'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  }
});

// Function to check auth with retry
export const checkAuth = async (retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return !!session;
    } catch (error) {
      console.warn(`Attempt ${i + 1} of ${retries} failed:`, error);
      if (i === retries - 1) {
        console.error('Auth check failed:', error);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
};

// Function to check Supabase connection with retry
export const checkSupabaseConnection = async (retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase.from('user_settings').select('count').limit(1);
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn(`Attempt ${i + 1} of ${retries} failed:`, error);
      if (i === retries - 1) {
        console.error('Supabase connection failed:', error);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
};

// Function to refresh session with retry
export const refreshSession = async (retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.warn(`Attempt ${i + 1} of ${retries} failed:`, error);
      if (i === retries - 1) {
        console.error('Session refresh failed:', error);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null;
};

// Utility function for making requests with retry
export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`Attempt ${i + 1} of ${retries} failed:`, error.message);
      } else {
        console.warn(`Attempt ${i + 1} of ${retries} failed:`, error);
      }
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retry attempts failed');
};