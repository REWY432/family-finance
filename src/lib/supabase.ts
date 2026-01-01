/**
 * Supabase Client - Simplified for Family App
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || !supabaseUrl;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// ============================================
// Types
// ============================================

export interface AppUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  created_at: string;
}

export interface AppTransaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  date: string;
  is_shared: boolean;
  is_credit: boolean;
  created_at: string;
  // Joined
  user?: AppUser;
}

export interface AppCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

// ============================================
// Database API
// ============================================

export const db = {
  // Config
  config: {
    get: async (key: string) => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', key)
        .single();
      return data?.value;
    },
    
    set: async (key: string, value: unknown) => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('app_config')
        .upsert({ key, value }, { onConflict: 'key' })
        .select()
        .single();
      return { data, error };
    }
  },

  // Users
  users: {
    list: async (): Promise<AppUser[]> => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('app_users')
        .select('*')
        .order('created_at');
      return data || [];
    },
    
    create: async (name: string, color: string): Promise<AppUser | null> => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_users')
        .insert({ name, color })
        .select()
        .single();
      return data;
    },
    
    update: async (id: string, updates: Partial<AppUser>) => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return data;
    },
    
    deleteAll: async () => {
      if (!supabase) return;
      await supabase.from('app_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
  },

  // Categories
  categories: {
    list: async (): Promise<AppCategory[]> => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('app_categories')
        .select('*')
        .order('name');
      return data || [];
    }
  },

  // Transactions
  transactions: {
    list: async (limit = 500): Promise<AppTransaction[]> => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('app_transactions')
        .select('*, user:app_users(*)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    },
    
    create: async (tx: Omit<AppTransaction, 'id' | 'created_at' | 'user'>): Promise<AppTransaction | null> => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_transactions')
        .insert(tx)
        .select('*, user:app_users(*)')
        .single();
      return data;
    },
    
    update: async (id: string, updates: Partial<AppTransaction>) => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_transactions')
        .update(updates)
        .eq('id', id)
        .select('*, user:app_users(*)')
        .single();
      return data;
    },
    
    delete: async (id: string) => {
      if (!supabase) return;
      await supabase.from('app_transactions').delete().eq('id', id);
    }
  }
};

export default supabase;
