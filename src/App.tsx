import { useState, useEffect, useMemo } from 'react';
import { db, AppUser, AppTransaction, AppCategory, AppBudget, AppGoal, AppRecurringPayment } from './lib/supabase';
import { AutoCategoryService } from './services/autocategory';
import { HealthService } from './services/health';
import { ML } from './services/ml';
import { AnomalyService } from './services/anomaly';
import { appCategoryToCategory, appTransactionToTransaction, findCategoryIdByName } from './utils/typeAdapters';
import { ToastContainer, showToast } from './components/Toast';
import { DashboardSkeleton } from './components/Skeleton';
import { formatMoney, formatDate } from './utils/formatters';
import { BudgetForm } from './components/budgets/BudgetForm';
import { GoalForm } from './components/goals/GoalForm';
import { ContributionForm } from './components/goals/ContributionForm';
import { RecurringPaymentForm } from './components/recurring/RecurringPaymentForm';
import { Modal } from './components/Modal';
import { BudgetsTab } from './components/tabs/BudgetsTab';
import { GoalsTab } from './components/tabs/GoalsTab';
import { RecurringTab } from './components/tabs/RecurringTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';
import './lib/chartConfig';

// ============================================
// TYPES
// ============================================

type Tab = 'dashboard' | 'history' | 'finance' | 'analytics' | 'settings';

// Confirm dialog helper
function confirmDelete(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    resolve(window.confirm(message));
  });
}

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [transactions, setTransactions] = useState<AppTransaction[]>([]);
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [budgets, setBudgets] = useState<AppBudget[]>([]);
  const [goals, setGoals] = useState<AppGoal[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<AppRecurringPayment[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<AppBudget | null>(null);
  const [editingGoal, setEditingGoal] = useState<AppGoal | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<AppRecurringPayment | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<AppTransaction | null>(null);
  const [contributionGoalId, setContributionGoalId] = useState<string | null>(null);
  const [financeSubTab, setFinanceSubTab] = useState<'budgets' | 'goals' | 'recurring'>('budgets');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Theme effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Load from Supabase
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
    const budgetsWithStats = loadedBudgets.map(budget => {
      const startDate = new Date(budget.start_date);
      const endDate = budget.end_date ? new Date(budget.end_date) : new Date();
      const filtered = loadedTransactions.filter(t => {
        const txDate = new Date(t.date);
        return t.type === 'expense' && 
               (!budget.category || t.category === budget.category) &&
               txDate >= startDate && txDate <= endDate;
      });
      const spent = filtered.reduce((sum, t) => sum + t.amount, 0);
      const remaining = budget.amount - spent;
      const percentage = (spent / budget.amount) * 100;
      return { ...budget, spent, remaining, percentage };
    });
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
  };

  const handleSetupComplete = async (name1: string, name2: string) => {
    // Save to Supabase
    const user1 = await db.users.create(name1, '#007AFF');
    const user2 = await db.users.create(name2, '#34C759');
    
    if (user1 && user2) {
      setUsers([user1, user2]);
      setIsSetup(true);
    }
  };

  const handleAddTransaction = async (data: {
    user_id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description?: string;
    date: string;
    is_shared: boolean;
    is_credit: boolean;
  }) => {
    try {
      const newTx = await db.transactions.create(data);
      if (newTx) {
        // Reload budgets to update stats
        const updatedBudgets = await db.budgets.list();
        const budgetsWithStats = updatedBudgets.map(budget => {
          const startDate = new Date(budget.start_date);
          const endDate = budget.end_date ? new Date(budget.end_date) : new Date();
          const filtered = [...transactions, newTx].filter(t => {
            const txDate = new Date(t.date);
            return t.type === 'expense' && 
                   (!budget.category || t.category === budget.category) &&
                   txDate >= startDate && txDate <= endDate;
          });
          const spent = filtered.reduce((sum, t) => sum + t.amount, 0);
          const remaining = budget.amount - spent;
          const percentage = (spent / budget.amount) * 100;
          return { ...budget, spent, remaining, percentage };
        });
        setBudgets(budgetsWithStats);
        setTransactions(prev => [newTx, ...prev]);
        showToast('Транзакция добавлена', 'success');
      } else {
        showToast('Ошибка при добавлении транзакции', 'error');
      }
      setShowAddForm(false);
    } catch (error) {
      showToast('Ошибка при добавлении транзакции', 'error');
      console.error('Add transaction error:', error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const confirmed = await confirmDelete('Удалить эту транзакцию?');
    if (!confirmed) return;
    
    try {
      await db.transactions.delete(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast('Транзакция удалена', 'info');
      // Reload budgets
      await loadData();
    } catch (error) {
      showToast('Ошибка при удалении транзакции', 'error');
      console.error('Delete transaction error:', error);
    }
  };

  const handleUpdateTransaction = async (id: string, data: {
    user_id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description?: string;
    date: string;
    is_shared: boolean;
    is_credit: boolean;
  }) => {
    try {
      const updated = await db.transactions.update(id, data);
      if (updated) {
        setTransactions(prev => prev.map(t => t.id === id ? updated : t));
        showToast('Транзакция обновлена', 'success');
        await loadData();
      } else {
        showToast('Ошибка при обновлении транзакции', 'error');
      }
      setShowAddForm(false);
      setEditingTransaction(null);
    } catch (error) {
      showToast('Ошибка при обновлении транзакции', 'error');
      console.error('Update transaction error:', error);
    }
  };

  // Budget handlers
  const handleSaveBudget = async (budgetData: Omit<AppBudget, 'id' | 'created_at' | 'updated_at' | 'spent' | 'remaining' | 'percentage'>) => {
    try {
      const saved = editingBudget 
        ? await db.budgets.update(editingBudget.id, budgetData)
        : await db.budgets.create(budgetData);
      
      if (saved) {
        showToast(editingBudget ? 'Бюджет обновлён' : 'Бюджет создан', 'success');
        await loadData();
        setShowBudgetForm(false);
        setEditingBudget(null);
      }
    } catch (error) {
      showToast('Ошибка при сохранении бюджета', 'error');
      console.error('Budget save error:', error);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await db.budgets.delete(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
      showToast('Бюджет удалён', 'info');
    } catch (error) {
      showToast('Ошибка при удалении бюджета', 'error');
      console.error('Budget delete error:', error);
    }
  };

  // Goal handlers
  const handleSaveGoal = async (goalData: Omit<AppGoal, 'id' | 'created_at' | 'updated_at' | 'percentage' | 'days_remaining'>) => {
    try {
      const saved = editingGoal
        ? await db.goals.update(editingGoal.id, goalData)
        : await db.goals.create(goalData);
      
      if (saved) {
        showToast(editingGoal ? 'Цель обновлена' : 'Цель создана', 'success');
        await loadData();
        setShowGoalForm(false);
        setEditingGoal(null);
      }
    } catch (error) {
      showToast('Ошибка при сохранении цели', 'error');
      console.error('Goal save error:', error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await db.goals.delete(id);
      setGoals(prev => prev.filter(g => g.id !== id));
      showToast('Цель удалена', 'info');
    } catch (error) {
      showToast('Ошибка при удалении цели', 'error');
      console.error('Goal delete error:', error);
    }
  };

  const handleAddContribution = async (goalId: string, userId: string, amount: number, note?: string) => {
    try {
      const contribution = await db.goals.addContribution(goalId, userId, amount, note);
      if (contribution) {
        showToast('Взнос добавлен', 'success');
        await loadData();
        setShowContributionForm(false);
        setContributionGoalId(null);
      }
    } catch (error) {
      showToast('Ошибка при добавлении взноса', 'error');
      console.error('Contribution error:', error);
    }
  };

  // Recurring payment handlers
  const handleSaveRecurring = async (paymentData: Omit<AppRecurringPayment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const saved = editingRecurring
        ? await db.recurring.update(editingRecurring.id, paymentData)
        : await db.recurring.create(paymentData);
      
      if (saved) {
        showToast(editingRecurring ? 'Платёж обновлён' : 'Платёж создан', 'success');
        await loadData();
        setShowRecurringForm(false);
        setEditingRecurring(null);
      }
    } catch (error) {
      showToast('Ошибка при сохранении платежа', 'error');
      console.error('Recurring payment save error:', error);
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      await db.recurring.delete(id);
      setRecurringPayments(prev => prev.filter(p => p.id !== id));
      showToast('Платёж удалён', 'info');
    } catch (error) {
      showToast('Ошибка при удалении платежа', 'error');
      console.error('Recurring payment delete error:', error);
    }
  };

  const handleToggleRecurring = async (id: string, isActive: boolean) => {
    try {
      await db.recurring.update(id, { is_active: isActive });
      setRecurringPayments(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive } : p));
    } catch (error) {
      showToast('Ошибка при обновлении платежа', 'error');
      console.error('Recurring payment toggle error:', error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <h1 className="header-title">Загрузка...</h1>
        </header>
        <main className="content">
          <DashboardSkeleton />
        </main>
      </div>
    );
  }

  // Setup screen
  if (!isSetup) {
    return <SetupScreen onComplete={handleSetupComplete} />;
  }

  // Calculate stats
  const stats = calculateStats(transactions, users);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1 className="header-title">
          {activeTab === 'dashboard' && 'Обзор'}
          {activeTab === 'history' && 'История'}
          {activeTab === 'finance' && (
            financeSubTab === 'budgets' ? 'Бюджеты' :
            financeSubTab === 'goals' ? 'Цели' : 'Платежи'
          )}
          {activeTab === 'analytics' && 'Аналитика'}
          {activeTab === 'settings' && 'Настройки'}
        </h1>
      </header>

      {/* Content */}
      <main className="content">
        {activeTab === 'dashboard' && (
          <DashboardTab 
            stats={stats} 
            users={users} 
            transactions={transactions} 
            categories={categories}
            budgets={budgets}
            goals={goals}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab 
            transactions={transactions} 
            users={users}
            categories={categories}
            onDelete={handleDeleteTransaction}
            onEdit={(tx) => { setEditingTransaction(tx); setShowAddForm(true); }}
          />
        )}
        {activeTab === 'finance' && (
          <FinanceTab
            subTab={financeSubTab}
            setSubTab={setFinanceSubTab}
            budgets={budgets}
            goals={goals}
            recurringPayments={recurringPayments}
            users={users}
            categories={categories}
            onAddBudget={() => { setEditingBudget(null); setShowBudgetForm(true); }}
            onEditBudget={(b) => { setEditingBudget(b); setShowBudgetForm(true); }}
            onDeleteBudget={handleDeleteBudget}
            onAddGoal={() => { setEditingGoal(null); setShowGoalForm(true); }}
            onEditGoal={(g) => { setEditingGoal(g); setShowGoalForm(true); }}
            onDeleteGoal={handleDeleteGoal}
            onAddContribution={(goalId) => { setContributionGoalId(goalId); setShowContributionForm(true); }}
            onAddRecurring={() => { setEditingRecurring(null); setShowRecurringForm(true); }}
            onEditRecurring={(p) => { setEditingRecurring(p); setShowRecurringForm(true); }}
            onDeleteRecurring={handleDeleteRecurring}
            onToggleRecurring={handleToggleRecurring}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            transactions={transactions}
            categories={categories}
            isDark={theme === 'dark'}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab 
            theme={theme} 
            setTheme={setTheme}
            users={users}
            setUsers={setUsers}
          />
        )}
      </main>

      {/* FAB */}
      {activeTab === 'dashboard' || activeTab === 'history' ? (
        <button className="fab" onClick={() => { setEditingTransaction(null); setShowAddForm(true); }}>
          <span>+</span>
        </button>
      ) : activeTab === 'finance' ? (
        <button className="fab" onClick={() => {
          if (financeSubTab === 'budgets') { setEditingBudget(null); setShowBudgetForm(true); }
          else if (financeSubTab === 'goals') { setEditingGoal(null); setShowGoalForm(true); }
          else { setEditingRecurring(null); setShowRecurringForm(true); }
        }}>
          <span>+</span>
        </button>
      ) : null}

      {/* Add/Edit Transaction Modal */}
      {showAddForm && (
        <AddTransactionModal
          users={users}
          categories={categories}
          transactions={transactions}
          editingTransaction={editingTransaction}
          onAdd={handleAddTransaction}
          onUpdate={handleUpdateTransaction}
          onClose={() => { setShowAddForm(false); setEditingTransaction(null); }}
        />
      )}

      {/* Budget Modal */}
      {showBudgetForm && (
        <Modal onClose={() => { setShowBudgetForm(false); setEditingBudget(null); }}>
          <BudgetForm
            budget={editingBudget || undefined}
            categories={categories}
            onSave={handleSaveBudget}
            onCancel={() => { setShowBudgetForm(false); setEditingBudget(null); }}
          />
        </Modal>
      )}

      {/* Goal Modal */}
      {showGoalForm && (
        <Modal onClose={() => { setShowGoalForm(false); setEditingGoal(null); }}>
          <GoalForm
            goal={editingGoal || undefined}
            onSave={handleSaveGoal}
            onCancel={() => { setShowGoalForm(false); setEditingGoal(null); }}
          />
        </Modal>
      )}

      {/* Contribution Modal */}
      {showContributionForm && contributionGoalId && (
        <Modal onClose={() => { setShowContributionForm(false); setContributionGoalId(null); }}>
          <ContributionForm
            goalId={contributionGoalId}
            goalName={goals.find(g => g.id === contributionGoalId)?.name || ''}
            users={users}
            onSave={handleAddContribution}
            onCancel={() => { setShowContributionForm(false); setContributionGoalId(null); }}
          />
        </Modal>
      )}

      {/* Recurring Payment Modal */}
      {showRecurringForm && (
        <Modal onClose={() => { setShowRecurringForm(false); setEditingRecurring(null); }}>
          <RecurringPaymentForm
            payment={editingRecurring || undefined}
            users={users}
            categories={categories}
            onSave={handleSaveRecurring}
            onCancel={() => { setShowRecurringForm(false); setEditingRecurring(null); }}
          />
        </Modal>
      )}

      {/* Tab Bar - 5 tabs for better UX */}
      <nav className="tab-bar">
        <TabButton icon="🏠" label="Обзор" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <TabButton icon="📋" label="История" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        <TabButton icon="💰" label="Финансы" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
        <TabButton icon="📊" label="Аналитика" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
        <TabButton icon="⚙️" label="Настройки" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}

// ============================================
// SETUP SCREEN
// ============================================

function SetupScreen({ onComplete }: { onComplete: (name1: string, name2: string) => void }) {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name1.trim() && name2.trim()) {
      onComplete(name1.trim(), name2.trim());
    }
  };

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <h1>👋 Добро пожаловать!</h1>
        <p>Введите имена двух пользователей для учёта финансов</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Пользователь 1</label>
            <input
              type="text"
              value={name1}
              onChange={e => setName1(e.target.value)}
              placeholder="Например: Алексей"
              className="text-input"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Пользователь 2</label>
            <input
              type="text"
              value={name2}
              onChange={e => setName2(e.target.value)}
              placeholder="Например: Мария"
              className="text-input"
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-btn"
            disabled={!name1.trim() || !name2.trim()}
          >
            Начать
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// TAB BUTTON
// ============================================

function TabButton({ icon, label, active, onClick }: { 
  icon: string; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button className={`tab-button ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="tab-icon">{icon}</span>
      <span className="tab-label">{label}</span>
    </button>
  );
}

// ============================================
// DASHBOARD TAB
// ============================================

function DashboardTab({ stats, users, transactions, categories, budgets, goals }: { 
  stats: Stats; 
  users: AppUser[];
  transactions: AppTransaction[];
  categories: AppCategory[];
  budgets: AppBudget[];
  goals: AppGoal[];
}) {
  const recentTx = transactions.slice(0, 5);
  
  // Memoized type conversions for better performance
  const { serviceCategories, serviceTransactions, transactionsWithCategories } = useMemo(() => {
    const serviceCategories = categories.map(c => appCategoryToCategory(c));
    const serviceTransactions = transactions.map(tx => appTransactionToTransaction(tx));
    
    const transactionsWithCategories = serviceTransactions.map(tx => {
      const categoryName = transactions.find(t => t.id === tx.id)?.category;
      const categoryId = categoryName ? findCategoryIdByName(categoryName, categories) : undefined;
      return { ...tx, category_id: categoryId };
    });
    
    return { serviceCategories, serviceTransactions, transactionsWithCategories };
  }, [transactions, categories]);

  // Convert budgets and goals to service types
  const serviceBudgets = useMemo(() => {
    return budgets.map(b => ({
      id: b.id,
      family_id: '',
      category_id: b.category ? findCategoryIdByName(b.category, categories) : undefined,
      name: b.name,
      amount: b.amount,
      period: b.period,
      alert_threshold: b.alert_threshold,
      start_date: b.start_date,
      end_date: b.end_date,
      is_active: b.is_active,
      created_at: b.created_at,
      updated_at: b.updated_at,
      spent: b.spent,
      remaining: b.remaining,
      percentage: b.percentage
    }));
  }, [budgets, categories]);

  const serviceGoals = useMemo(() => {
    return goals.map(g => ({
      id: g.id,
      family_id: '',
      name: g.name,
      icon: g.icon,
      target_amount: g.target_amount,
      current_amount: g.current_amount,
      deadline: g.deadline,
      is_completed: g.is_completed,
      completed_at: g.completed_at,
      created_at: g.created_at,
      updated_at: g.updated_at,
      percentage: g.percentage,
      days_remaining: g.days_remaining
    }));
  }, [goals]);

  // Calculate financial health with real budgets and goals
  const healthAnalysis = useMemo(() => {
    try {
      return HealthService.analyzeFinancialHealth(
        transactionsWithCategories,
        serviceBudgets,
        serviceGoals
      );
    } catch (error) {
      console.error('Health analysis error:', error);
      return null;
    }
  }, [transactionsWithCategories, serviceBudgets, serviceGoals]);

  // Detect anomalies in recent transactions
  const recentAnomalies = useMemo(() => {
    try {
      const recentTransactions = transactions.slice(0, 10);
      const anomalies: Array<{ tx: AppTransaction; anomalies: any[] }> = [];
      
      recentTransactions.forEach(tx => {
        const serviceTx = serviceTransactions.find(t => t.id === tx.id);
        if (serviceTx && tx.type === 'expense') {
          const txWithCategory = {
            ...serviceTx,
            category_id: tx.category ? findCategoryIdByName(tx.category, categories) : undefined
          };
          
          const detected = AnomalyService.detectTransactionAnomalies(
            txWithCategory,
            serviceTransactions,
            serviceCategories
          );
          
          if (detected.length > 0) {
            anomalies.push({ tx, anomalies: detected });
          }
        }
      });
      
      return anomalies.slice(0, 3);
    } catch (error) {
      console.error('Anomaly detection error:', error);
      return [];
    }
  }, [transactions, categories, serviceTransactions, serviceCategories]);

  return (
    <div className="tab-content">
      {/* Balance Card */}
      <div className="card balance-card">
        <div className="balance-label">Баланс за месяц</div>
        <div className="balance-amount">{formatMoney(stats.balance)}</div>
        <div className="balance-details">
          <div className="balance-item income">
            <span>Доходы</span>
            <span>+{formatMoney(stats.totalIncome)}</span>
          </div>
          <div className="balance-item expense">
            <span>Расходы</span>
            <span>-{formatMoney(stats.totalExpense)}</span>
          </div>
        </div>
      </div>

      {/* Financial Health Card */}
      {healthAnalysis && (
        <div className="card">
          <h3 className="card-title">💚 Финансовое здоровье</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: '700',
              color: `var(--${healthAnalysis.score.grade === 'A' || healthAnalysis.score.grade === 'B' ? 'green' : healthAnalysis.score.grade === 'C' ? 'yellow' : 'red'})`
            }}>
              {healthAnalysis.score.overall}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                {healthAnalysis.score.emoji} {healthAnalysis.score.grade}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {healthAnalysis.score.summary}
              </div>
            </div>
          </div>
          {healthAnalysis.recommendations.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--bg-tertiary)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Рекомендации:
              </div>
              {healthAnalysis.recommendations.slice(0, 2).map((rec, idx) => (
                <div key={idx} style={{ 
                  fontSize: '13px', 
                  padding: '8px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  marginBottom: '6px'
                }}>
                  <strong>{rec.title}</strong> - {rec.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Stats */}
      <div className="card">
        <h3 className="card-title">👥 По пользователям</h3>
        {users.map(user => {
          const userStats = stats.byUser[user.id] || { income: 0, expense: 0, shared: 0 };
          return (
            <div key={user.id} className="user-stat-row">
              <div className="user-info">
                <span className="user-avatar" style={{ background: user.color }}>
                  {user.name[0]}
                </span>
                <span className="user-name">{user.name}</span>
              </div>
              <div className="user-amounts">
                <span className="expense">-{formatMoney(userStats.expense)}</span>
                <span className="income">+{formatMoney(userStats.income)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Debts */}
      {stats.debt !== 0 && (
        <div className="card debt-card">
          <h3 className="card-title">💰 Расчёт</h3>
          <div className="debt-info">
            {stats.debt > 0 ? (
              <p><strong>{users[1]?.name}</strong> должен(а) <strong>{users[0]?.name}</strong></p>
            ) : (
              <p><strong>{users[0]?.name}</strong> должен(а) <strong>{users[1]?.name}</strong></p>
            )}
            <div className="debt-amount">{formatMoney(Math.abs(stats.debt))}</div>
          </div>
        </div>
      )}

      {/* Anomalies */}
      {recentAnomalies.length > 0 && (
        <div className="card alert-card">
          <h3 className="card-title">⚠️ Обнаружены аномалии</h3>
          <div className="anomalies-list">
            {recentAnomalies.map(({ tx, anomalies }, idx) => (
              <div key={idx} style={{ 
                padding: '12px 0',
                borderBottom: idx < recentAnomalies.length - 1 ? '1px solid var(--bg-tertiary)' : 'none'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                  {tx.description || tx.category || 'Транзакция'} - {formatMoney(tx.amount)}
                </div>
                {anomalies.map((anomaly, aidx) => (
                  <div key={aidx} style={{ 
                    fontSize: '12px', 
                    color: anomaly.severity === 'alert' ? 'var(--red)' : 
                           anomaly.severity === 'warning' ? 'var(--orange)' : 'var(--text-secondary)',
                    marginTop: '4px'
                  }}>
                    {anomaly.message}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {recentTx.length > 0 && (
        <div className="card">
          <h3 className="card-title">🕐 Последние операции</h3>
          <div className="transactions-list">
            {recentTx.map(tx => (
              <TransactionItem key={tx.id} tx={tx} showUser />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// HISTORY TAB
// ============================================

function HistoryTab({ 
  transactions, 
  users,
  categories,
  onDelete,
  onEdit
}: { 
  transactions: AppTransaction[];
  users: AppUser[];
  categories: AppCategory[];
  onDelete: (id: string) => void;
  onEdit: (tx: AppTransaction) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('month');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

    return transactions.filter(t => {
      // Type filter
      if (filter !== 'all' && t.type !== filter) return false;
      // User filter
      if (userFilter !== 'all' && t.user_id !== userFilter) return false;
      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      // Date filter
      if (dateFilter !== 'all') {
        const txDate = new Date(t.date);
        if (dateFilter === 'today' && txDate < today) return false;
        if (dateFilter === 'week' && txDate < weekAgo) return false;
        if (dateFilter === 'month' && txDate < monthAgo) return false;
      }
      return true;
    });
  }, [transactions, filter, userFilter, dateFilter, categoryFilter]);

  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="tab-content">
      {/* Type Filters */}
      <div className="filter-bar">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Все
        </button>
        <button 
          className={`filter-btn ${filter === 'expense' ? 'active' : ''}`}
          onClick={() => setFilter('expense')}
        >
          Расходы
        </button>
        <button 
          className={`filter-btn ${filter === 'income' ? 'active' : ''}`}
          onClick={() => setFilter('income')}
        >
          Доходы
        </button>
      </div>

      {/* Date Filter */}
      <div className="date-filter">
        <button
          className={`date-filter-btn ${dateFilter === 'today' ? 'active' : ''}`}
          onClick={() => setDateFilter('today')}
        >
          Сегодня
        </button>
        <button
          className={`date-filter-btn ${dateFilter === 'week' ? 'active' : ''}`}
          onClick={() => setDateFilter('week')}
        >
          Неделя
        </button>
        <button
          className={`date-filter-btn ${dateFilter === 'month' ? 'active' : ''}`}
          onClick={() => setDateFilter('month')}
        >
          Месяц
        </button>
        <button
          className={`date-filter-btn ${dateFilter === 'all' ? 'active' : ''}`}
          onClick={() => setDateFilter('all')}
        >
          Всё время
        </button>
      </div>

      {/* User Filter */}
      <div className="user-filter">
        <button
          className={`user-filter-btn ${userFilter === 'all' ? 'active' : ''}`}
          onClick={() => setUserFilter('all')}
        >
          Все
        </button>
        {users.map(user => (
          <button
            key={user.id}
            className={`user-filter-btn ${userFilter === user.id ? 'active' : ''}`}
            onClick={() => setUserFilter(user.id)}
            style={{ '--user-color': user.color } as React.CSSProperties}
          >
            {user.name}
          </button>
        ))}
      </div>

      {/* Category Filter (optional) */}
      {filter === 'expense' && (
        <div className="category-filter">
          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
            className="select-input"
          >
            <option value="all">Все категории</option>
            {expenseCategories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Transactions */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3 className="empty-state-title">Нет транзакций</h3>
            <p className="empty-state-description">
              {filter === 'all' 
                ? 'Начните добавлять транзакции, чтобы отслеживать свои финансы'
                : `Нет ${filter === 'expense' ? 'расходов' : 'доходов'} за выбранный период`
              }
            </p>
          </div>
        ) : (
          <>
            <div className="transactions-count">
              Найдено: {filtered.length} {filtered.length === 1 ? 'транзакция' : filtered.length < 5 ? 'транзакции' : 'транзакций'}
            </div>
            <div className="transactions-list">
              {filtered.map(tx => (
                <TransactionItem 
                  key={tx.id} 
                  tx={tx} 
                  showUser 
                  showDate
                  onDelete={() => onDelete(tx.id)}
                  onEdit={() => onEdit(tx)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// FINANCE TAB (Combined: Budgets, Goals, Recurring)
// ============================================

function FinanceTab({
  subTab,
  setSubTab,
  budgets,
  goals,
  recurringPayments,
  users,
  categories,
  onAddBudget,
  onEditBudget,
  onDeleteBudget,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
  onAddContribution,
  onAddRecurring,
  onEditRecurring,
  onDeleteRecurring,
  onToggleRecurring
}: {
  subTab: 'budgets' | 'goals' | 'recurring';
  setSubTab: (tab: 'budgets' | 'goals' | 'recurring') => void;
  budgets: AppBudget[];
  goals: AppGoal[];
  recurringPayments: AppRecurringPayment[];
  users: AppUser[];
  categories: AppCategory[];
  onAddBudget: () => void;
  onEditBudget: (b: AppBudget) => void;
  onDeleteBudget: (id: string) => void;
  onAddGoal: () => void;
  onEditGoal: (g: AppGoal) => void;
  onDeleteGoal: (id: string) => void;
  onAddContribution: (goalId: string) => void;
  onAddRecurring: () => void;
  onEditRecurring: (p: AppRecurringPayment) => void;
  onDeleteRecurring: (id: string) => void;
  onToggleRecurring: (id: string, isActive: boolean) => void;
}) {
  return (
    <div className="tab-content">
      {/* Sub-tabs */}
      <div className="sub-tab-bar">
        <button
          className={`sub-tab-btn ${subTab === 'budgets' ? 'active' : ''}`}
          onClick={() => setSubTab('budgets')}
        >
          💰 Бюджеты
        </button>
        <button
          className={`sub-tab-btn ${subTab === 'goals' ? 'active' : ''}`}
          onClick={() => setSubTab('goals')}
        >
          🎯 Цели
        </button>
        <button
          className={`sub-tab-btn ${subTab === 'recurring' ? 'active' : ''}`}
          onClick={() => setSubTab('recurring')}
        >
          🔄 Платежи
        </button>
      </div>

      {/* Content based on sub-tab */}
      {subTab === 'budgets' && (
        <BudgetsTab
          budgets={budgets}
          categories={categories}
          onAdd={onAddBudget}
          onEdit={onEditBudget}
          onDelete={onDeleteBudget}
        />
      )}
      {subTab === 'goals' && (
        <GoalsTab
          goals={goals}
          users={users}
          onAdd={onAddGoal}
          onEdit={onEditGoal}
          onDelete={onDeleteGoal}
          onAddContribution={onAddContribution}
        />
      )}
      {subTab === 'recurring' && (
        <RecurringTab
          payments={recurringPayments}
          users={users}
          categories={categories}
          onAdd={onAddRecurring}
          onEdit={onEditRecurring}
          onDelete={onDeleteRecurring}
          onToggle={onToggleRecurring}
        />
      )}
    </div>
  );
}

// ============================================
// STATS TAB (Kept for analytics integration)
// ============================================

function StatsTab({ stats, users, transactions }: {
  stats: Stats;
  users: AppUser[];
  transactions: AppTransaction[];
}) {
  // Group by category
  const byCategory: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'expense' && isCurrentMonth(t.date))
    .forEach(t => {
      const cat = t.category || 'Другое';
      byCategory[cat] = (byCategory[cat] || 0) + t.amount;
    });

  const sortedCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1]);

  const totalCategoryExpense = sortedCategories.reduce((sum, [, amount]) => sum + amount, 0);

  // Generate expense forecasts
  const forecasts = useMemo(() => {
    try {
      // Get last 6 months of expense data
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      
      const monthlyExpenses: { date: Date; amount: number }[] = [];
      const expenses = transactions.filter(t => t.type === 'expense' && new Date(t.date) >= sixMonthsAgo);
      
      // Group by month
      const byMonth: Record<string, number> = {};
      expenses.forEach(t => {
        const monthKey = t.date.substring(0, 7); // YYYY-MM
        byMonth[monthKey] = (byMonth[monthKey] || 0) + t.amount;
      });
      
      // Convert to array and sort
      Object.entries(byMonth)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([month, amount]) => {
          monthlyExpenses.push({
            date: new Date(month + '-01'),
            amount
          });
        });
      
      if (monthlyExpenses.length >= 3) {
        return ML.forecastExpenses(monthlyExpenses, 3);
      }
      return [];
    } catch (error) {
      console.error('Forecast error:', error);
      return [];
    }
  }, [transactions]);

  return (
    <div className="tab-content">
      {/* User Comparison */}
      <div className="card">
        <h3 className="card-title">👥 Сравнение расходов</h3>
        <div className="comparison-chart">
          {users.map(user => {
            const userExpense = stats.byUser[user.id]?.expense || 0;
            const percent = stats.totalExpense > 0 
              ? Math.round(userExpense / stats.totalExpense * 100) 
              : 0;
            return (
              <div key={user.id} className="comparison-bar">
                <div className="comparison-header">
                  <span>{user.name}</span>
                  <span>{formatMoney(userExpense)}</span>
                </div>
                <div className="comparison-track">
                  <div 
                    className="comparison-fill" 
                    style={{ width: `${percent}%`, background: user.color }}
                  />
                </div>
                <span className="comparison-percent">{percent}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shared vs Personal */}
      <div className="card">
        <h3 className="card-title">📊 Общие vs Личные</h3>
        <div className="shared-stats">
          <div className="shared-stat">
            <span className="shared-label">👥 Общие расходы</span>
            <span className="shared-value">{formatMoney(stats.sharedExpense)}</span>
          </div>
          <div className="shared-stat">
            <span className="shared-label">👤 Личные расходы</span>
            <span className="shared-value">{formatMoney(stats.totalExpense - stats.sharedExpense)}</span>
          </div>
        </div>
      </div>

      {/* By Category */}
      <div className="card">
        <h3 className="card-title">📁 По категориям</h3>
        <div className="categories-list">
          {sortedCategories.map(([category, amount]) => (
            <div key={category} className="category-item">
              <div className="category-info">
                <span className="category-name">{category}</span>
              </div>
              <div className="category-stats">
                <span className="category-amount">{formatMoney(amount)}</span>
                <span className="category-percent">
                  {Math.round(amount / totalCategoryExpense * 100)}%
                </span>
              </div>
              <div className="category-bar">
                <div 
                  className="category-bar-fill" 
                  style={{ width: `${amount / totalCategoryExpense * 100}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit */}
      {stats.creditExpense > 0 && (
        <div className="card">
          <h3 className="card-title">💳 В кредит</h3>
          <p className="stat-value">{formatMoney(stats.creditExpense)}</p>
        </div>
      )}

      {/* Forecasts */}
      {forecasts.length > 0 && (
        <div className="card">
          <h3 className="card-title">📊 Прогноз расходов</h3>
          <div className="forecast-list">
            {forecasts.map((forecast, idx) => (
              <div key={idx} className="forecast-item">
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>
                    {new Date(forecast.date).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {formatMoney(forecast.confidence_low)} - {formatMoney(forecast.confidence_high)}
                  </div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>
                  {formatMoney(forecast.predicted_expense)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SETTINGS TAB
// ============================================

function SettingsTab({ 
  theme, 
  setTheme,
  users,
  setUsers
}: { 
  theme: 'light' | 'dark'; 
  setTheme: (t: 'light' | 'dark') => void;
  users: AppUser[];
  setUsers: (users: AppUser[]) => void;
}) {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleSaveName = async (userId: string) => {
    if (!newName.trim()) return;
    
    await db.users.update(userId, { name: newName.trim() });
    
    setUsers(users.map(u => u.id === userId ? { ...u, name: newName.trim() } : u));
    setEditingUser(null);
    setNewName('');
  };

  return (
    <div className="tab-content">
      {/* Users */}
      <div className="card">
        <h3 className="card-title">👥 Пользователи</h3>
        {users.map(user => (
          <div key={user.id} className="setting-item">
            {editingUser === user.id ? (
              <div className="edit-user">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="text-input"
                  autoFocus
                />
                <button onClick={() => handleSaveName(user.id)} className="save-btn">✓</button>
                <button onClick={() => setEditingUser(null)} className="cancel-btn">✕</button>
              </div>
            ) : (
              <>
                <div className="user-info">
                  <span className="user-avatar" style={{ background: user.color }}>
                    {user.name[0]}
                  </span>
                  <span>{user.name}</span>
                </div>
                <button 
                  onClick={() => { setEditingUser(user.id); setNewName(user.name); }}
                  className="edit-btn"
                >
                  ✏️
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Theme */}
      <div className="card">
        <h3 className="card-title">🎨 Оформление</h3>
        <div className="setting-item">
          <span>Тёмная тема</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={theme === 'dark'} 
              onChange={e => setTheme(e.target.checked ? 'dark' : 'light')}
            />
            <span className="switch-slider" />
          </label>
        </div>
      </div>

      {/* Info */}
      <div className="card">
        <h3 className="card-title">ℹ️ О приложении</h3>
        <p className="setting-text">Family Finance v3.0</p>
      </div>
    </div>
  );
}

// ============================================
// ADD TRANSACTION MODAL
// ============================================

function AddTransactionModal({ 
  users,
  categories,
  transactions,
  editingTransaction,
  onAdd,
  onUpdate,
  onClose 
}: { 
  users: AppUser[];
  categories: AppCategory[];
  transactions: AppTransaction[];
  editingTransaction: AppTransaction | null;
  onAdd: (data: {
    user_id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description?: string;
    date: string;
    is_shared: boolean;
    is_credit: boolean;
  }) => void;
  onUpdate: (id: string, data: {
    user_id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description?: string;
    date: string;
    is_shared: boolean;
    is_credit: boolean;
  }) => void;
  onClose: () => void;
}) {
  const isEditing = !!editingTransaction;
  const [userId, setUserId] = useState(editingTransaction?.user_id || users[0]?.id || '');
  const [type, setType] = useState<'expense' | 'income'>(editingTransaction?.type || 'expense');
  const [amount, setAmount] = useState(editingTransaction?.amount?.toString() || '');
  const [category, setCategory] = useState(editingTransaction?.category || '');
  const [description, setDescription] = useState(editingTransaction?.description || '');
  const [isShared, setIsShared] = useState(editingTransaction?.is_shared || false);
  const [isCredit, setIsCredit] = useState(editingTransaction?.is_credit || false);
  const [date, setDate] = useState(editingTransaction?.date || new Date().toISOString().split('T')[0]);
  const [predictedCategory, setPredictedCategory] = useState<string | null>(null);
  const [predictionConfidence, setPredictionConfidence] = useState<number>(0);

  const filteredCategories = categories.filter(c => c.type === type);

  // Auto-categorize when description changes
  useEffect(() => {
    if (description.trim().length > 3) {
      try {
        const serviceCategories = categories.map(c => appCategoryToCategory(c));
        const serviceTransactions = transactions.map(tx => appTransactionToTransaction(tx));
        
        const prediction = AutoCategoryService.predictCategory(
          description,
          serviceCategories,
          serviceTransactions
        );
        
        if (prediction && prediction.confidence > 0.5) {
          setPredictedCategory(prediction.category_name);
          setPredictionConfidence(prediction.confidence);
          
          // Auto-select category if confidence is high
          if (prediction.confidence > 0.7 && !category) {
            setCategory(prediction.category_name);
          }
        } else {
          setPredictedCategory(null);
          setPredictionConfidence(0);
        }
      } catch (error) {
        console.error('Auto-categorization error:', error);
      }
    } else {
      setPredictedCategory(null);
      setPredictionConfidence(0);
    }
  }, [description, categories, transactions, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Введите сумму');
      return;
    }

    const data = {
      user_id: userId,
      type,
      amount: parseFloat(amount),
      category: category || (filteredCategories[0]?.name || 'Другое'),
      description: description || undefined,
      date,
      is_shared: isShared,
      is_credit: isCredit
    };

    if (isEditing && editingTransaction) {
      onUpdate(editingTransaction.id, data);
    } else {
      onAdd(data);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Редактировать операцию' : 'Новая операция'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="add-form">
          {/* User Selection */}
          <div className="form-group">
            <label>Кто</label>
            <div className="user-select">
              {users.map(user => (
                <button
                  key={user.id}
                  type="button"
                  className={`user-select-btn ${userId === user.id ? 'active' : ''}`}
                  onClick={() => setUserId(user.id)}
                  style={{ '--user-color': user.color } as React.CSSProperties}
                >
                  <span className="user-avatar" style={{ background: user.color }}>
                    {user.name[0]}
                  </span>
                  {user.name}
                </button>
              ))}
            </div>
          </div>

          {/* Type Toggle */}
          <div className="type-toggle">
            <button
              type="button"
              className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
              onClick={() => setType('expense')}
            >
              Расход
            </button>
            <button
              type="button"
              className={`type-btn ${type === 'income' ? 'active income' : ''}`}
              onClick={() => setType('income')}
            >
              Доход
            </button>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label>Сумма *</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="amount-input"
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label>
              Категория
              {predictedCategory && (
                <span className="prediction-hint" style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-secondary)',
                  fontWeight: 'normal',
                  marginLeft: '8px'
                }}>
                  (предложено: {predictedCategory} {Math.round(predictionConfidence * 100)}%)
                </span>
              )}
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="select-input"
              style={predictedCategory && !category ? { borderColor: 'var(--accent)' } : undefined}
            >
              <option value="">Выберите...</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                  {predictedCategory === cat.name && ` (${Math.round(predictionConfidence * 100)}%)`}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Комментарий</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Описание..."
              className="text-input"
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label>Дата</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="date-input"
            />
          </div>

          {/* Flags */}
          {type === 'expense' && (
            <div className="flags-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={e => setIsShared(e.target.checked)}
                />
                <span>👥 Общий</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isCredit}
                  onChange={e => setIsCredit(e.target.checked)}
                />
                <span>💳 Кредит</span>
              </label>
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="submit-btn">
            {isEditing 
              ? '💾 Сохранить изменения'
              : type === 'expense' ? '➖ Добавить расход' : '➕ Добавить доход'
            }
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// TRANSACTION ITEM
// ============================================

function TransactionItem({ 
  tx, 
  showUser = false,
  showDate = false,
  onDelete,
  onEdit
}: { 
  tx: AppTransaction;
  showUser?: boolean;
  showDate?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const isIncome = tx.type === 'income';
  
  return (
    <div className="transaction-item">
      <div className={`transaction-icon ${isIncome ? 'income' : tx.is_shared ? 'shared' : 'expense'}`}>
        {tx.category?.[0] || (isIncome ? '💰' : '💸')}
      </div>
      <div className="transaction-info" onClick={onEdit} style={onEdit ? { cursor: 'pointer' } : undefined}>
        <span className="transaction-category">
          {tx.category || 'Без категории'}
          {tx.is_shared && <span className="badge shared">общий</span>}
          {tx.is_credit && <span className="badge credit">кредит</span>}
        </span>
        <span className="transaction-meta">
          {showDate && formatDate(tx.date)}
          {showDate && showUser && ' · '}
          {showUser && tx.user?.name}
          {tx.description && ` · ${tx.description}`}
        </span>
      </div>
      <span className={`transaction-amount ${isIncome ? 'income' : 'expense'}`}>
        {isIncome ? '+' : '-'}{formatMoney(tx.amount)}
      </span>
      <div className="transaction-actions">
        {onEdit && (
          <button className="edit-btn" onClick={onEdit} title="Редактировать">✏️</button>
        )}
        {onDelete && (
          <button className="delete-btn" onClick={onDelete} title="Удалить">🗑️</button>
        )}
      </div>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

interface UserStats {
  income: number;
  expense: number;
  shared: number;
}

interface Stats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  sharedExpense: number;
  creditExpense: number;
  debt: number;
  byUser: Record<string, UserStats>;
}

function calculateStats(transactions: AppTransaction[], users: AppUser[]): Stats {
  const currentMonth = transactions.filter(t => isCurrentMonth(t.date));
  
  const byUser: Record<string, UserStats> = {};
  users.forEach(u => {
    byUser[u.id] = { income: 0, expense: 0, shared: 0 };
  });

  let totalIncome = 0;
  let totalExpense = 0;
  let sharedExpense = 0;
  let creditExpense = 0;

  currentMonth.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
      if (byUser[t.user_id]) byUser[t.user_id].income += t.amount;
    } else {
      totalExpense += t.amount;
      if (byUser[t.user_id]) byUser[t.user_id].expense += t.amount;
      if (t.is_shared) {
        sharedExpense += t.amount;
        if (byUser[t.user_id]) byUser[t.user_id].shared += t.amount;
      }
      if (t.is_credit) creditExpense += t.amount;
    }
  });

  // Calculate debt: positive = user[1] owes user[0], negative = user[0] owes user[1]
  const fairShare = sharedExpense / 2;
  const user0Shared = byUser[users[0]?.id]?.shared || 0;
  const debt = user0Shared - fairShare;

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    sharedExpense,
    creditExpense,
    debt,
    byUser
  };
}

function isCurrentMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}


