import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { db, AppUser, AppTransaction, AppCategory, AppBudget, AppGoal, AppRecurringPayment } from '../lib/supabase';
import { showToast } from '../components/Toast';

// ============================================
// TYPES
// ============================================

export interface TransactionTemplate {
  id: string;
  name: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  is_shared: boolean;
  is_credit: boolean;
}

interface AppContextType {
  // State
  users: AppUser[];
  transactions: AppTransaction[];
  categories: AppCategory[];
  budgets: AppBudget[];
  goals: AppGoal[];
  recurringPayments: AppRecurringPayment[];
  templates: TransactionTemplate[];
  loading: boolean;
  refreshing: boolean;
  theme: 'light' | 'dark';
  isSetup: boolean | null;

  // Actions
  loadData: () => Promise<void>;
  refreshData: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => void;
  handleSetupComplete: (name1: string, name2: string) => Promise<void>;
  
  // Transaction actions
  addTransaction: (data: Omit<AppTransaction, 'id' | 'created_at' | 'user'>) => Promise<void>;
  updateTransaction: (id: string, data: Omit<AppTransaction, 'id' | 'created_at' | 'user'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Budget actions
  saveBudget: (data: Omit<AppBudget, 'id' | 'created_at' | 'updated_at' | 'spent' | 'remaining' | 'percentage'>, editingId?: string) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  
  // Goal actions
  saveGoal: (data: Omit<AppGoal, 'id' | 'created_at' | 'updated_at' | 'percentage' | 'days_remaining'>, editingId?: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addContribution: (goalId: string, userId: string, amount: number, note?: string) => Promise<void>;
  
  // Recurring payment actions
  saveRecurring: (data: Omit<AppRecurringPayment, 'id' | 'created_at' | 'updated_at'>, editingId?: string) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  toggleRecurring: (id: string, isActive: boolean) => Promise<void>;
  
  // Template actions
  saveTemplate: (template: Omit<TransactionTemplate, 'id'>) => void;
  deleteTemplate: (id: string) => void;
  applyTemplate: (templateId: string) => TransactionTemplate | undefined;
  
  // User actions
  updateUser: (userId: string, name: string) => Promise<void>;
  setUsers: (users: AppUser[]) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [transactions, setTransactions] = useState<AppTransaction[]>([]);
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [budgets, setBudgets] = useState<AppBudget[]>([]);
  const [goals, setGoals] = useState<AppGoal[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<AppRecurringPayment[]>([]);
  const [templates, setTemplates] = useState<TransactionTemplate[]>(() => {
    const saved = localStorage.getItem('transaction-templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');
  const [isSetup, setIsSetup] = useState<boolean | null>(null);

  // Theme effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Save templates to localStorage
  useEffect(() => {
    localStorage.setItem('transaction-templates', JSON.stringify(templates));
  }, [templates]);

  // Calculate budget stats
  const calculateBudgetStats = useCallback((budget: AppBudget, txList: AppTransaction[]) => {
    const startDate = new Date(budget.start_date);
    const endDate = budget.end_date ? new Date(budget.end_date) : new Date();
    const filtered = txList.filter(t => {
      const txDate = new Date(t.date);
      return t.type === 'expense' && 
             (!budget.category || t.category === budget.category) &&
             txDate >= startDate && txDate <= endDate;
    });
    const spent = filtered.reduce((sum, t) => sum + t.amount, 0);
    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount) * 100;
    return { ...budget, spent, remaining, percentage };
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);

    const [loadedUsers, loadedCategories, loadedTransactions, loadedBudgets, loadedGoals, loadedRecurring] = await Promise.all([
      db.users.list(),
      db.categories.list(),
      db.transactions.list(),
      db.budgets.list(),
      db.goals.list(),
      db.recurring.list()
    ]);

    setUsers(loadedUsers);
    setCategories(loadedCategories);
    setTransactions(loadedTransactions);
    
    // Calculate budget stats
    const budgetsWithStats = loadedBudgets.map(budget => calculateBudgetStats(budget, loadedTransactions));
    setBudgets(budgetsWithStats);
    
    // Calculate goal stats
    const goalsWithStats = loadedGoals.map(goal => {
      const percentage = (goal.current_amount / goal.target_amount) * 100;
      const daysRemaining = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : undefined;
      return { ...goal, percentage, days_remaining: daysRemaining };
    });
    setGoals(goalsWithStats);
    
    setRecurringPayments(loadedRecurring);
    setIsSetup(loadedUsers.length >= 2);
    setLoading(false);
  }, [calculateBudgetStats]);

  // Refresh data (for pull-to-refresh)
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Setup
  const handleSetupComplete = async (name1: string, name2: string) => {
    const user1 = await db.users.create(name1, '#007AFF');
    const user2 = await db.users.create(name2, '#34C759');
    
    if (user1 && user2) {
      setUsers([user1, user2]);
      setIsSetup(true);
    }
  };

  // Theme
  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  // Transaction actions
  const addTransaction = async (data: Omit<AppTransaction, 'id' | 'created_at' | 'user'>) => {
    try {
      const newTx = await db.transactions.create(data);
      if (newTx) {
        setTransactions(prev => [newTx, ...prev]);
        // Update budget stats
        setBudgets(prev => prev.map(b => calculateBudgetStats(b, [newTx, ...transactions])));
        showToast('Транзакция добавлена', 'success');
      } else {
        showToast('Ошибка при добавлении', 'error');
      }
    } catch (error) {
      showToast('Ошибка при добавлении', 'error');
      console.error('Add transaction error:', error);
    }
  };

  const updateTransaction = async (id: string, data: Omit<AppTransaction, 'id' | 'created_at' | 'user'>) => {
    try {
      const updated = await db.transactions.update(id, data);
      if (updated) {
        const newTxList = transactions.map(t => t.id === id ? updated : t);
        setTransactions(newTxList);
        setBudgets(prev => prev.map(b => calculateBudgetStats(b, newTxList)));
        showToast('Транзакция обновлена', 'success');
      }
    } catch (error) {
      showToast('Ошибка при обновлении', 'error');
      console.error('Update transaction error:', error);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!window.confirm('Удалить эту транзакцию?')) return;
    
    try {
      await db.transactions.delete(id);
      const newTxList = transactions.filter(t => t.id !== id);
      setTransactions(newTxList);
      setBudgets(prev => prev.map(b => calculateBudgetStats(b, newTxList)));
      showToast('Транзакция удалена', 'info');
    } catch (error) {
      showToast('Ошибка при удалении', 'error');
      console.error('Delete transaction error:', error);
    }
  };

  // Budget actions
  const saveBudget = async (data: Omit<AppBudget, 'id' | 'created_at' | 'updated_at' | 'spent' | 'remaining' | 'percentage'>, editingId?: string) => {
    try {
      const saved = editingId 
        ? await db.budgets.update(editingId, data)
        : await db.budgets.create(data);
      
      if (saved) {
        showToast(editingId ? 'Бюджет обновлён' : 'Бюджет создан', 'success');
        await loadData();
      }
    } catch (error) {
      showToast('Ошибка при сохранении бюджета', 'error');
      console.error('Budget save error:', error);
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      await db.budgets.delete(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
      showToast('Бюджет удалён', 'info');
    } catch (error) {
      showToast('Ошибка при удалении', 'error');
    }
  };

  // Goal actions
  const saveGoal = async (data: Omit<AppGoal, 'id' | 'created_at' | 'updated_at' | 'percentage' | 'days_remaining'>, editingId?: string) => {
    try {
      const saved = editingId
        ? await db.goals.update(editingId, data)
        : await db.goals.create(data);
      
      if (saved) {
        showToast(editingId ? 'Цель обновлена' : 'Цель создана', 'success');
        await loadData();
      }
    } catch (error) {
      showToast('Ошибка при сохранении цели', 'error');
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await db.goals.delete(id);
      setGoals(prev => prev.filter(g => g.id !== id));
      showToast('Цель удалена', 'info');
    } catch (error) {
      showToast('Ошибка при удалении', 'error');
    }
  };

  const addContribution = async (goalId: string, userId: string, amount: number, note?: string) => {
    try {
      const contribution = await db.goals.addContribution(goalId, userId, amount, note);
      if (contribution) {
        showToast('Взнос добавлен', 'success');
        await loadData();
      }
    } catch (error) {
      showToast('Ошибка при добавлении взноса', 'error');
    }
  };

  // Recurring payment actions
  const saveRecurring = async (data: Omit<AppRecurringPayment, 'id' | 'created_at' | 'updated_at'>, editingId?: string) => {
    try {
      const saved = editingId
        ? await db.recurring.update(editingId, data)
        : await db.recurring.create(data);
      
      if (saved) {
        showToast(editingId ? 'Платёж обновлён' : 'Платёж создан', 'success');
        await loadData();
      }
    } catch (error) {
      showToast('Ошибка при сохранении платежа', 'error');
    }
  };

  const deleteRecurring = async (id: string) => {
    try {
      await db.recurring.delete(id);
      setRecurringPayments(prev => prev.filter(p => p.id !== id));
      showToast('Платёж удалён', 'info');
    } catch (error) {
      showToast('Ошибка при удалении', 'error');
    }
  };

  const toggleRecurring = async (id: string, isActive: boolean) => {
    try {
      await db.recurring.update(id, { is_active: isActive });
      setRecurringPayments(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive } : p));
    } catch (error) {
      showToast('Ошибка при обновлении', 'error');
    }
  };

  // Template actions
  const saveTemplate = (template: Omit<TransactionTemplate, 'id'>) => {
    const newTemplate = { ...template, id: crypto.randomUUID() };
    setTemplates(prev => [...prev, newTemplate]);
    showToast('Шаблон сохранён', 'success');
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    showToast('Шаблон удалён', 'info');
  };

  const applyTemplate = (templateId: string) => {
    return templates.find(t => t.id === templateId);
  };

  // User actions
  const updateUser = async (userId: string, name: string) => {
    await db.users.update(userId, { name });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, name } : u));
  };

  const value: AppContextType = {
    users,
    transactions,
    categories,
    budgets,
    goals,
    recurringPayments,
    templates,
    loading,
    refreshing,
    theme,
    isSetup,
    loadData,
    refreshData,
    setTheme,
    handleSetupComplete,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    saveBudget,
    deleteBudget,
    saveGoal,
    deleteGoal,
    addContribution,
    saveRecurring,
    deleteRecurring,
    toggleRecurring,
    saveTemplate,
    deleteTemplate,
    applyTemplate,
    updateUser,
    setUsers
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

