/**
 * Supabase Client - Simplified for Family App
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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

export interface AppBudget {
  id: string;
  name: string;
  category?: string; // Category name for simple schema
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  alert_threshold: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  spent?: number;
  remaining?: number;
  percentage?: number;
}

export interface AppGoal {
  id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Computed
  percentage?: number;
  days_remaining?: number;
}

export interface AppGoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  note?: string;
  created_at: string;
  user?: AppUser;
}

export interface AppRecurringPayment {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  day_of_month?: number;
  day_of_week?: number;
  next_date: string;
  last_processed?: string;
  is_shared: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  },

  // Budgets
  budgets: {
    list: async (): Promise<AppBudget[]> => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('app_budgets')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    
    create: async (budget: Omit<AppBudget, 'id' | 'created_at' | 'updated_at' | 'spent' | 'remaining' | 'percentage'>): Promise<AppBudget | null> => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_budgets')
        .insert(budget)
        .select()
        .single();
      return data;
    },
    
    update: async (id: string, updates: Partial<AppBudget>) => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return data;
    },
    
    delete: async (id: string) => {
      if (!supabase) return;
      await supabase.from('app_budgets').delete().eq('id', id);
    }
  },

  // Goals
  goals: {
    list: async (): Promise<AppGoal[]> => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('app_goals')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    
    create: async (goal: Omit<AppGoal, 'id' | 'created_at' | 'updated_at' | 'percentage' | 'days_remaining'>): Promise<AppGoal | null> => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_goals')
        .insert(goal)
        .select()
        .single();
      return data;
    },
    
    update: async (id: string, updates: Partial<AppGoal>) => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return data;
    },
    
    delete: async (id: string) => {
      if (!supabase) return;
      await supabase.from('app_goals').delete().eq('id', id);
    },
    
    addContribution: async (goalId: string, userId: string, amount: number, note?: string): Promise<AppGoalContribution | null> => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_goal_contributions')
        .insert({ goal_id: goalId, user_id: userId, amount, note })
        .select('*, user:app_users(*)')
        .single();
      return data;
    },
    
    getContributions: async (goalId: string): Promise<AppGoalContribution[]> => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('app_goal_contributions')
        .select('*, user:app_users(*)')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });
      return data || [];
    }
  },

  // Recurring Payments
  recurring: {
    list: async (): Promise<AppRecurringPayment[]> => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('app_recurring_payments')
        .select('*')
        .order('next_date', { ascending: true });
      return data || [];
    },
    
    create: async (payment: Omit<AppRecurringPayment, 'id' | 'created_at' | 'updated_at'>): Promise<AppRecurringPayment | null> => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_recurring_payments')
        .insert(payment)
        .select()
        .single();
      return data;
    },
    
    update: async (id: string, updates: Partial<AppRecurringPayment>) => {
      if (!supabase) return null;
      const { data } = await supabase
        .from('app_recurring_payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return data;
    },
    
    delete: async (id: string) => {
      if (!supabase) return;
      await supabase.from('app_recurring_payments').delete().eq('id', id);
    }
  }
};

export default supabase;
