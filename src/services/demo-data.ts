/**
 * Demo Data Service
 * Provides mock data for demo mode (GitHub Pages without Supabase)
 */

import type { 
  Transaction, 
  Category, 
  Budget, 
  Goal, 
  Profile,
  FamilyMember 
} from '../types';

// ============================================
// DEMO MODE CHECK
// ============================================

export const isDemoMode = (): boolean => {
  return import.meta.env.VITE_DEMO_MODE === 'true' || 
         !import.meta.env.VITE_SUPABASE_URL;
};

// ============================================
// DEMO PROFILES
// ============================================

export const demoProfiles: Profile[] = [
  {
    id: 'user-1',
    display_name: 'Алексей',
    avatar_url: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-2',
    display_name: 'Мария',
    avatar_url: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export const demoFamilyMembers: FamilyMember[] = [
  {
    id: 'member-1',
    family_id: 'family-1',
    user_id: 'user-1',
    role: 'owner',
    nickname: 'Алексей',
    joined_at: '2024-01-01T00:00:00Z',
    profile: demoProfiles[0]
  },
  {
    id: 'member-2',
    family_id: 'family-1',
    user_id: 'user-2',
    role: 'member',
    nickname: 'Мария',
    joined_at: '2024-01-01T00:00:00Z',
    profile: demoProfiles[1]
  }
];

// ============================================
// DEMO CATEGORIES
// ============================================

export const demoCategories: Category[] = [
  // Expense categories
  { id: 'cat-1', family_id: 'family-1', name: 'Продукты', type: 'expense', icon: '🛒', color: '#4CAF50', keywords: ['магнит', 'пятёрочка'], is_system: true, created_at: '2024-01-01' },
  { id: 'cat-2', family_id: 'family-1', name: 'Транспорт', type: 'expense', icon: '🚗', color: '#2196F3', keywords: ['такси', 'бензин'], is_system: true, created_at: '2024-01-01' },
  { id: 'cat-3', family_id: 'family-1', name: 'Рестораны', type: 'expense', icon: '🍽️', color: '#FF9800', keywords: ['кафе', 'ресторан'], is_system: true, created_at: '2024-01-01' },
  { id: 'cat-4', family_id: 'family-1', name: 'Развлечения', type: 'expense', icon: '🎬', color: '#9C27B0', keywords: ['кино', 'netflix'], is_system: true, created_at: '2024-01-01' },
  { id: 'cat-5', family_id: 'family-1', name: 'Коммуналка', type: 'expense', icon: '🏠', color: '#607D8B', keywords: ['жкх', 'электричество'], is_system: true, created_at: '2024-01-01' },
  { id: 'cat-6', family_id: 'family-1', name: 'Здоровье', type: 'expense', icon: '💊', color: '#E91E63', keywords: ['аптека', 'врач'], is_system: true, created_at: '2024-01-01' },
  { id: 'cat-7', family_id: 'family-1', name: 'Одежда', type: 'expense', icon: '👕', color: '#00BCD4', keywords: ['zara', 'одежда'], is_system: false, created_at: '2024-01-01' },
  // Income categories
  { id: 'cat-8', family_id: 'family-1', name: 'Зарплата', type: 'income', icon: '💰', color: '#4CAF50', keywords: ['зарплата'], is_system: true, created_at: '2024-01-01' },
  { id: 'cat-9', family_id: 'family-1', name: 'Фриланс', type: 'income', icon: '💻', color: '#2196F3', keywords: ['фриланс'], is_system: false, created_at: '2024-01-01' },
];

// ============================================
// DEMO TRANSACTIONS GENERATOR
// ============================================

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDemoTransactions(): Transaction[] {
  const transactions: Transaction[] = [];
  const now = new Date();
  
  // Generate 6 months of data
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    
    // Monthly salaries
    transactions.push({
      id: `tx-salary-1-${monthOffset}`,
      family_id: 'family-1',
      user_id: 'user-1',
      type: 'income',
      amount: randomBetween(95000, 105000),
      currency: 'RUB',
      category_id: 'cat-8',
      description: 'Зарплата',
      date: new Date(month.getFullYear(), month.getMonth(), 5).toISOString(),
      is_shared: false,
      is_recurring: true,
      is_credit: false,
      tags: [],
      created_at: month.toISOString(),
      updated_at: month.toISOString(),
      category: demoCategories.find(c => c.id === 'cat-8')
    });
    
    transactions.push({
      id: `tx-salary-2-${monthOffset}`,
      family_id: 'family-1',
      user_id: 'user-2',
      type: 'income',
      amount: randomBetween(75000, 85000),
      currency: 'RUB',
      category_id: 'cat-8',
      description: 'Зарплата',
      date: new Date(month.getFullYear(), month.getMonth(), 10).toISOString(),
      is_shared: false,
      is_recurring: true,
      is_credit: false,
      tags: [],
      created_at: month.toISOString(),
      updated_at: month.toISOString(),
      category: demoCategories.find(c => c.id === 'cat-8')
    });
    
    // Generate 30-50 expense transactions per month
    const expenseCount = randomBetween(30, 50);
    const expenseCategories = demoCategories.filter(c => c.type === 'expense');
    
    for (let i = 0; i < expenseCount; i++) {
      const day = randomBetween(1, 28);
      const category = randomFromArray(expenseCategories);
      const user = randomFromArray(['user-1', 'user-2']);
      const isShared = Math.random() > 0.4; // 60% shared
      
      let amount: number;
      switch (category.id) {
        case 'cat-1': amount = randomBetween(500, 5000); break; // Продукты
        case 'cat-2': amount = randomBetween(200, 2000); break; // Транспорт
        case 'cat-3': amount = randomBetween(1000, 5000); break; // Рестораны
        case 'cat-4': amount = randomBetween(500, 3000); break; // Развлечения
        case 'cat-5': amount = randomBetween(5000, 15000); break; // Коммуналка
        case 'cat-6': amount = randomBetween(500, 10000); break; // Здоровье
        case 'cat-7': amount = randomBetween(2000, 15000); break; // Одежда
        default: amount = randomBetween(500, 3000);
      }
      
      transactions.push({
        id: `tx-exp-${monthOffset}-${i}`,
        family_id: 'family-1',
        user_id: user,
        type: 'expense',
        amount,
        currency: 'RUB',
        category_id: category.id,
        description: `${category.name}`,
        date: new Date(month.getFullYear(), month.getMonth(), day, randomBetween(8, 22)).toISOString(),
        is_shared: isShared,
        is_recurring: false,
        is_credit: Math.random() > 0.85, // 15% credit
        tags: [],
        created_at: month.toISOString(),
        updated_at: month.toISOString(),
        category
      });
    }
  }
  
  // Sort by date descending
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const demoTransactions: Transaction[] = generateDemoTransactions();

// ============================================
// DEMO BUDGETS
// ============================================

export const demoBudgets: Budget[] = [
  {
    id: 'budget-1',
    family_id: 'family-1',
    category_id: 'cat-1',
    name: 'Продукты',
    amount: 40000,
    period: 'monthly',
    alert_threshold: 80,
    start_date: '2024-01-01',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    category: demoCategories.find(c => c.id === 'cat-1')
  },
  {
    id: 'budget-2',
    family_id: 'family-1',
    category_id: 'cat-3',
    name: 'Рестораны',
    amount: 15000,
    period: 'monthly',
    alert_threshold: 75,
    start_date: '2024-01-01',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    category: demoCategories.find(c => c.id === 'cat-3')
  },
  {
    id: 'budget-3',
    family_id: 'family-1',
    category_id: 'cat-4',
    name: 'Развлечения',
    amount: 10000,
    period: 'monthly',
    alert_threshold: 80,
    start_date: '2024-01-01',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    category: demoCategories.find(c => c.id === 'cat-4')
  }
];

// ============================================
// DEMO GOALS
// ============================================

export const demoGoals: Goal[] = [
  {
    id: 'goal-1',
    family_id: 'family-1',
    name: 'Отпуск в Турции',
    icon: '🏖️',
    target_amount: 200000,
    current_amount: 145000,
    deadline: new Date(new Date().getFullYear(), new Date().getMonth() + 3, 1).toISOString(),
    is_completed: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 'goal-2',
    family_id: 'family-1',
    name: 'Новый MacBook',
    icon: '💻',
    target_amount: 180000,
    current_amount: 60000,
    deadline: new Date(new Date().getFullYear(), new Date().getMonth() + 6, 1).toISOString(),
    is_completed: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 'goal-3',
    family_id: 'family-1',
    name: 'Подушка безопасности',
    icon: '🛡️',
    target_amount: 500000,
    current_amount: 320000,
    is_completed: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

// ============================================
// DEMO DATA API
// ============================================

export const DemoData = {
  profiles: demoProfiles,
  familyMembers: demoFamilyMembers,
  categories: demoCategories,
  transactions: demoTransactions,
  budgets: demoBudgets,
  goals: demoGoals,
  
  // Simulated API methods
  getTransactions: (filters?: any) => {
    let result = [...demoTransactions];
    
    if (filters?.type) {
      result = result.filter(t => t.type === filters.type);
    }
    if (filters?.user_id) {
      result = result.filter(t => t.user_id === filters.user_id);
    }
    if (filters?.is_shared !== undefined) {
      result = result.filter(t => t.is_shared === filters.is_shared);
    }
    if (filters?.limit) {
      result = result.slice(0, filters.limit);
    }
    
    return Promise.resolve({ data: result, error: null });
  },
  
  addTransaction: (data: Partial<Transaction>) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      family_id: 'family-1',
      user_id: data.user_id || 'user-1',
      type: data.type || 'expense',
      amount: data.amount || 0,
      currency: 'RUB',
      category_id: data.category_id,
      description: data.description,
      date: data.date || new Date().toISOString(),
      is_shared: data.is_shared || false,
      is_recurring: false,
      is_credit: data.is_credit || false,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: demoCategories.find(c => c.id === data.category_id)
    };
    
    demoTransactions.unshift(newTx);
    return Promise.resolve({ data: newTx, error: null });
  }
};

export default DemoData;
