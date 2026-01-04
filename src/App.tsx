import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useStats } from './hooks/useStats';
import { DashboardTab } from './components/Dashboard';
import { HistoryTab } from './components/History';
import { TransactionForm } from './components/Transaction';
import { BudgetForm } from './components/budgets/BudgetForm';
import { GoalForm } from './components/goals/GoalForm';
import { ContributionForm } from './components/goals/ContributionForm';
import { RecurringPaymentForm } from './components/recurring/RecurringPaymentForm';
import { Modal } from './components/Modal';
import { BudgetsTab } from './components/tabs/BudgetsTab';
import { GoalsTab } from './components/tabs/GoalsTab';
import { RecurringTab } from './components/tabs/RecurringTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';
import { ToastContainer, showToast } from './components/Toast';
import { DashboardSkeleton } from './components/Skeleton';
import { PullToRefresh } from './components/common/PullToRefresh';
import { AppTransaction, AppBudget, AppGoal, AppRecurringPayment, db } from './lib/supabase';
import './lib/chartConfig';

// ============================================
// TYPES
// ============================================

type Tab = 'dashboard' | 'history' | 'finance' | 'analytics' | 'settings';

// ============================================
// MAIN APP CONTENT
// ============================================

function AppContent() {
  const {
    users,
    transactions,
    categories,
    budgets,
    goals,
    recurringPayments,
    loading,
    theme,
    setTheme,
    isSetup,
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
    refreshData,
    updateUser,
    setUsers
  } = useApp();

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

  const stats = useStats(transactions, users);

  // Theme effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Transaction handlers
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
    await addTransaction(data);
    setShowAddForm(false);
    setEditingTransaction(null);
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
    await updateTransaction(id, data);
    setShowAddForm(false);
    setEditingTransaction(null);
  };

  // Budget handlers
  const handleSaveBudget = async (budgetData: Omit<AppBudget, 'id' | 'created_at' | 'updated_at' | 'spent' | 'remaining' | 'percentage'>) => {
    await saveBudget(budgetData, editingBudget?.id);
    setShowBudgetForm(false);
    setEditingBudget(null);
  };

  // Goal handlers
  const handleSaveGoal = async (goalData: Omit<AppGoal, 'id' | 'created_at' | 'updated_at' | 'percentage' | 'days_remaining'>) => {
    await saveGoal(goalData, editingGoal?.id);
    setShowGoalForm(false);
    setEditingGoal(null);
  };

  const handleAddContribution = async (goalId: string, userId: string, amount: number, note?: string) => {
    await addContribution(goalId, userId, amount, note);
    setShowContributionForm(false);
    setContributionGoalId(null);
  };

  // Recurring payment handlers
  const handleSaveRecurring = async (paymentData: Omit<AppRecurringPayment, 'id' | 'created_at' | 'updated_at'>) => {
    await saveRecurring(paymentData, editingRecurring?.id);
    setShowRecurringForm(false);
    setEditingRecurring(null);
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

  return (
    <div className="app">
      {/* Header */}
      <header className="header glass">
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
        <PullToRefresh onRefresh={refreshData}>
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
              onDelete={deleteTransaction}
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
              onDeleteBudget={deleteBudget}
              onAddGoal={() => { setEditingGoal(null); setShowGoalForm(true); }}
              onEditGoal={(g) => { setEditingGoal(g); setShowGoalForm(true); }}
              onDeleteGoal={deleteGoal}
              onAddContribution={(goalId) => { setContributionGoalId(goalId); setShowContributionForm(true); }}
              onAddRecurring={() => { setEditingRecurring(null); setShowRecurringForm(true); }}
              onEditRecurring={(p) => { setEditingRecurring(p); setShowRecurringForm(true); }}
              onDeleteRecurring={deleteRecurring}
              onToggleRecurring={toggleRecurring}
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
              updateUser={updateUser}
            />
          )}
        </PullToRefresh>
      </main>

      {/* FAB */}
      {activeTab === 'dashboard' || activeTab === 'history' ? (
        <button className="fab animate-scale-in" onClick={() => { setEditingTransaction(null); setShowAddForm(true); }}>
          <span>+</span>
        </button>
      ) : activeTab === 'finance' ? (
        <button className="fab animate-scale-in" onClick={() => {
          if (financeSubTab === 'budgets') { setEditingBudget(null); setShowBudgetForm(true); }
          else if (financeSubTab === 'goals') { setEditingGoal(null); setShowGoalForm(true); }
          else { setEditingRecurring(null); setShowRecurringForm(true); }
        }}>
          <span>+</span>
        </button>
      ) : null}

      {/* Add/Edit Transaction Modal */}
      {showAddForm && (
        <TransactionForm
          users={users}
          categories={categories}
          transactions={transactions}
          editingTransaction={editingTransaction}
          onSubmit={editingTransaction 
            ? (data) => handleUpdateTransaction(editingTransaction.id, data)
            : handleAddTransaction
          }
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

      {/* Tab Bar */}
      <nav className="tab-bar glass">
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
// MAIN APP WITH PROVIDER
// ============================================

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
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
      <div className="setup-card glass animate-scale-in">
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
// FINANCE TAB
// ============================================

import { AppUser, AppCategory } from './lib/supabase';

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
      <div className="sub-tab-bar glass">
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
// SETTINGS TAB
// ============================================

function SettingsTab({ 
  theme, 
  setTheme,
  users,
  setUsers,
  updateUser
}: { 
  theme: 'light' | 'dark'; 
  setTheme: (t: 'light' | 'dark') => void;
  users: AppUser[];
  setUsers: (users: AppUser[]) => void;
  updateUser: (userId: string, name: string) => Promise<void>;
}) {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleSaveName = async (userId: string) => {
    if (!newName.trim()) return;
    await updateUser(userId, newName.trim());
    setEditingUser(null);
    setNewName('');
    showToast('Имя обновлено', 'success');
  };

  return (
    <div className="tab-content">
      {/* Users */}
      <div className="card glass">
        <h3 className="card-title">👥 Пользователи</h3>
        {users.map((user, index) => (
          <div 
            key={user.id} 
            className="setting-item animate-slide-in"
            style={{ '--index': index } as React.CSSProperties}
          >
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
                  <span className="user-avatar pulse-on-hover" style={{ background: user.color }}>
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
      <div className="card glass">
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
      <div className="card glass">
        <h3 className="card-title">ℹ️ О приложении</h3>
        <p className="setting-text">Family Finance v4.0</p>
        <p className="setting-text" style={{ fontSize: '12px', marginTop: '8px' }}>
          ✨ Glassmorphism UI<br/>
          🎬 Анимации и микро-взаимодействия<br/>
          📊 Статистика привычек<br/>
          🧮 Калькулятор покупок<br/>
          ⚡ Быстрые шаблоны
        </p>
      </div>
    </div>
  );
}
