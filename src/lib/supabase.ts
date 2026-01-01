/**
 * Supabase Client
 * Handles both real Supabase connections and demo mode
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || !supabaseUrl;

// Create client only if we have credentials
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

export { supabase, isDemoMode };

// Auth helpers (no-op in demo mode)
export const auth = {
  signIn: async (email: string, password: string) => {
    if (!supabase) return { data: null, error: new Error('Demo mode') };
    return supabase.auth.signInWithPassword({ email, password });
  },
  
  signUp: async (email: string, password: string, displayName: string) => {
    if (!supabase) return { data: null, error: new Error('Demo mode') };
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { display_name: displayName }
      }
    });
    return { data, error };
  },
  
  signInWithGoogle: async () => {
    if (!supabase) return { data: null, error: new Error('Demo mode') };
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  },
  
  signOut: async () => {
    if (!supabase) return { error: null };
    return supabase.auth.signOut();
  },
  
  getSession: async () => {
    if (!supabase) return { data: { session: null }, error: null };
    return supabase.auth.getSession();
  },
  
  getUser: async () => {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
  
  onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Database helpers (return empty results in demo mode)
export const db = {
  // Transactions
  transactions: {
    list: async (familyId: string, filters?: Record<string, unknown>) => {
      if (!supabase) return { data: [], error: null };
      let query = supabase
        .from('transactions')
        .select('*, category:categories(*), account:accounts(*)')
        .eq('family_id', familyId)
        .order('date', { ascending: false });
      
      if (filters?.type) query = query.eq('type', filters.type as string);
      if (filters?.category_id) query = query.eq('category_id', filters.category_id as string);
      if (filters?.user_id) query = query.eq('user_id', filters.user_id as string);
      if (filters?.is_shared !== undefined) query = query.eq('is_shared', filters.is_shared as boolean);
      if (filters?.date_from) query = query.gte('date', filters.date_from as string);
      if (filters?.date_to) query = query.lte('date', filters.date_to as string);
      if (filters?.limit) query = query.limit(filters.limit as number);
      
      return query;
    },
    
    create: async (data: Record<string, unknown>) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('transactions').insert(data).select().single();
    },
    
    update: async (id: string, data: Record<string, unknown>) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('transactions').update(data).eq('id', id).select().single();
    },
    
    delete: async (id: string) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('transactions').delete().eq('id', id);
    }
  },
  
  // Categories
  categories: {
    list: async (familyId: string) => {
      if (!supabase) return { data: [], error: null };
      return supabase
        .from('categories')
        .select('*')
        .eq('family_id', familyId)
        .order('name');
    },
    
    create: async (data: Record<string, unknown>) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('categories').insert(data).select().single();
    },
    
    update: async (id: string, data: Record<string, unknown>) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('categories').update(data).eq('id', id).select().single();
    },
    
    delete: async (id: string) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('categories').delete().eq('id', id);
    }
  },
  
  // Budgets
  budgets: {
    list: async (familyId: string) => {
      if (!supabase) return { data: [], error: null };
      return supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('family_id', familyId)
        .eq('is_active', true)
        .order('name');
    },
    
    create: async (data: Record<string, unknown>) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('budgets').insert(data).select().single();
    },
    
    update: async (id: string, data: Record<string, unknown>) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('budgets').update(data).eq('id', id).select().single();
    },
    
    delete: async (id: string) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('budgets').delete().eq('id', id);
    }
  },
  
  // Goals
  goals: {
    list: async (familyId: string) => {
      if (!supabase) return { data: [], error: null };
      return supabase
        .from('goals')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
    },
    
    create: async (data: Record<string, unknown>) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('goals').insert(data).select().single();
    },
    
    update: async (id: string, data: Record<string, unknown>) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('goals').update(data).eq('id', id).select().single();
    },
    
    delete: async (id: string) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('goals').delete().eq('id', id);
    },
    
    addContribution: async (goalId: string, userId: string, amount: number, note?: string) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('goal_contributions').insert({
        goal_id: goalId,
        user_id: userId,
        amount,
        note
      }).select().single();
    }
  },
  
  // Anomalies
  anomalies: {
    list: async (familyId: string, dismissed = false) => {
      if (!supabase) return { data: [], error: null };
      return supabase
        .from('anomalies')
        .select('*, transaction:transactions(*)')
        .eq('family_id', familyId)
        .eq('is_dismissed', dismissed)
        .order('created_at', { ascending: false });
    },
    
    dismiss: async (id: string, userId: string) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('anomalies').update({
        is_dismissed: true,
        dismissed_by: userId,
        dismissed_at: new Date().toISOString()
      }).eq('id', id);
    }
  },
  
  // Health Snapshots
  health: {
    getLatest: async (familyId: string) => {
      if (!supabase) return { data: null, error: null };
      return supabase
        .from('health_snapshots')
        .select('*')
        .eq('family_id', familyId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();
    },
    
    getHistory: async (familyId: string, days = 30) => {
      if (!supabase) return { data: [], error: null };
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      return supabase
        .from('health_snapshots')
        .select('*')
        .eq('family_id', familyId)
        .gte('snapshot_date', fromDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });
    },
    
    create: async (data: Record<string, unknown>) => {
      if (!supabase) return { data: null, error: new Error('Demo mode') };
      return supabase.from('health_snapshots').upsert(data, {
        onConflict: 'family_id,snapshot_date'
      }).select().single();
    }
  }
};

export default supabase;
