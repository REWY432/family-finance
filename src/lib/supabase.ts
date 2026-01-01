/**
 * Supabase Client
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Auth helpers
export const auth = {
  signIn: async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  },
  
  signUp: async (email: string, password: string, displayName: string) => {
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
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  },
  
  signOut: async () => {
    return supabase.auth.signOut();
  },
  
  getSession: async () => {
    return supabase.auth.getSession();
  },
  
  getUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
  
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Database helpers
export const db = {
  // Transactions
  transactions: {
    list: async (familyId: string, filters?: Record<string, any>) => {
      let query = supabase
        .from('transactions')
        .select('*, category:categories(*), account:accounts(*)')
        .eq('family_id', familyId)
        .order('date', { ascending: false });
      
      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.category_id) query = query.eq('category_id', filters.category_id);
      if (filters?.user_id) query = query.eq('user_id', filters.user_id);
      if (filters?.is_shared !== undefined) query = query.eq('is_shared', filters.is_shared);
      if (filters?.date_from) query = query.gte('date', filters.date_from);
      if (filters?.date_to) query = query.lte('date', filters.date_to);
      if (filters?.limit) query = query.limit(filters.limit);
      
      return query;
    },
    
    create: async (data: any) => {
      return supabase.from('transactions').insert(data).select().single();
    },
    
    update: async (id: string, data: any) => {
      return supabase.from('transactions').update(data).eq('id', id).select().single();
    },
    
    delete: async (id: string) => {
      return supabase.from('transactions').delete().eq('id', id);
    }
  },
  
  // Categories
  categories: {
    list: async (familyId: string) => {
      return supabase
        .from('categories')
        .select('*')
        .eq('family_id', familyId)
        .order('name');
    },
    
    create: async (data: any) => {
      return supabase.from('categories').insert(data).select().single();
    },
    
    update: async (id: string, data: any) => {
      return supabase.from('categories').update(data).eq('id', id).select().single();
    },
    
    delete: async (id: string) => {
      return supabase.from('categories').delete().eq('id', id);
    }
  },
  
  // Budgets
  budgets: {
    list: async (familyId: string) => {
      return supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('family_id', familyId)
        .eq('is_active', true)
        .order('name');
    },
    
    create: async (data: any) => {
      return supabase.from('budgets').insert(data).select().single();
    },
    
    update: async (id: string, data: any) => {
      return supabase.from('budgets').update(data).eq('id', id).select().single();
    },
    
    delete: async (id: string) => {
      return supabase.from('budgets').delete().eq('id', id);
    }
  },
  
  // Goals
  goals: {
    list: async (familyId: string) => {
      return supabase
        .from('goals')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
    },
    
    create: async (data: any) => {
      return supabase.from('goals').insert(data).select().single();
    },
    
    update: async (id: string, data: any) => {
      return supabase.from('goals').update(data).eq('id', id).select().single();
    },
    
    delete: async (id: string) => {
      return supabase.from('goals').delete().eq('id', id);
    },
    
    addContribution: async (goalId: string, userId: string, amount: number, note?: string) => {
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
      return supabase
        .from('anomalies')
        .select('*, transaction:transactions(*)')
        .eq('family_id', familyId)
        .eq('is_dismissed', dismissed)
        .order('created_at', { ascending: false });
    },
    
    dismiss: async (id: string, userId: string) => {
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
      return supabase
        .from('health_snapshots')
        .select('*')
        .eq('family_id', familyId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();
    },
    
    getHistory: async (familyId: string, days = 30) => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      return supabase
        .from('health_snapshots')
        .select('*')
        .eq('family_id', familyId)
        .gte('snapshot_date', fromDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });
    },
    
    create: async (data: any) => {
      return supabase.from('health_snapshots').upsert(data, {
        onConflict: 'family_id,snapshot_date'
      }).select().single();
    }
  }
};

export default supabase;
