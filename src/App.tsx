import { useState, useEffect } from 'react';
import { isDemoMode, DemoData, demoFamilyMembers } from './services/demo-data';
import { AnalyticsService } from './services/analytics';
import { HealthService } from './services/health';
import type { Transaction, Budget, Goal, Category, HealthScore } from './types';

// ============================================
// TYPES
// ============================================

type Tab = 'dashboard' | 'analytics' | 'health' | 'history' | 'settings';

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const loadData = async () => {
    setLoading(true);
    
    if (isDemoMode()) {
      // Demo mode - use mock data
      setTransactions(DemoData.transactions);
      setBudgets(DemoData.budgets);
      setGoals(DemoData.goals);
      setCategories(DemoData.categories);
    } else {
      // Real Supabase - would load from DB
      // TODO: Implement real data loading
    }
    
    setLoading(false);
  };

  // Calculate dashboard data
  const dashboardData = AnalyticsService.getDashboardData(
    transactions,
    budgets,
    goals,
    demoFamilyMembers.map(m => ({ user_id: m.user_id, nickname: m.nickname || '' }))
  );

  // Calculate health score
  const healthAnalysis = HealthService.analyzeFinancialHealth(transactions, budgets, goals);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1 className="header-title">
          {activeTab === 'dashboard' && 'Обзор'}
          {activeTab === 'analytics' && 'Аналитика'}
          {activeTab === 'health' && 'Здоровье'}
          {activeTab === 'history' && 'История'}
          {activeTab === 'settings' && 'Настройки'}
        </h1>
        {isDemoMode() && <span className="demo-badge">DEMO</span>}
      </header>

      {/* Content */}
      <main className="content">
        {activeTab === 'dashboard' && (
          <DashboardTab data={dashboardData} health={healthAnalysis.score} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab transactions={transactions} />
        )}
        {activeTab === 'health' && (
          <HealthTab analysis={healthAnalysis} />
        )}
        {activeTab === 'history' && (
          <HistoryTab transactions={transactions} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab theme={theme} setTheme={setTheme} />
        )}
      </main>

      {/* Tab Bar */}
      <nav className="tab-bar">
        <TabButton icon="📊" label="Обзор" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <TabButton icon="📈" label="Аналитика" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
        <TabButton icon="❤️" label="Здоровье" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
        <TabButton icon="📋" label="История" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        <TabButton icon="⚙️" label="Настройки" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
}

// ============================================
// COMPONENTS
// ============================================

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>Загрузка...</p>
    </div>
  );
}

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

function DashboardTab({ data, health }: { data: any; health: HealthScore }) {
  return (
    <div className="tab-content">
      {/* Balance Card */}
      <div className="card balance-card">
        <div className="balance-header">
          <span className="balance-label">Баланс за месяц</span>
          <span className={`health-badge grade-${health.grade}`}>
            {health.emoji} {health.grade}
          </span>
        </div>
        <div className="balance-amount">
          {formatMoney(data.total_income - data.total_expense)}
        </div>
        <div className="balance-details">
          <div className="balance-item income">
            <span>Доходы</span>
            <span>+{formatMoney(data.total_income)}</span>
          </div>
          <div className="balance-item expense">
            <span>Расходы</span>
            <span>-{formatMoney(data.total_expense)}</span>
          </div>
        </div>
      </div>

      {/* Debts Card */}
      {data.debts.length > 0 && (
        <div className="card">
          <h3 className="card-title">💰 Расчёты</h3>
          {data.debts.map((debt: any, i: number) => (
            <div key={i} className="debt-item">
              <span>{debt.from_user_name} → {debt.to_user_name}</span>
              <span className="debt-amount">{formatMoney(debt.amount)}</span>
            </div>
          ))}
          <p className="card-subtitle">
            Общие расходы: {formatMoney(data.shared_expenses.total)}
          </p>
        </div>
      )}

      {/* Top Categories */}
      <div className="card">
        <h3 className="card-title">📊 Топ категорий</h3>
        <div className="categories-list">
          {data.top_categories.slice(0, 5).map((cat: any) => (
            <div key={cat.category_id} className="category-item">
              <div className="category-info">
                <span className="category-icon">{cat.category_icon}</span>
                <span className="category-name">{cat.category_name}</span>
              </div>
              <div className="category-stats">
                <span className="category-amount">{formatMoney(cat.total)}</span>
                <span className="category-percent">{cat.percentage}%</span>
              </div>
              <div className="category-bar">
                <div className="category-bar-fill" style={{ width: `${cat.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="card-title">🕐 Последние транзакции</h3>
        <div className="transactions-list">
          {data.recent_transactions.slice(0, 5).map((tx: Transaction) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))}
        </div>
      </div>

      {/* Budget Alerts */}
      {data.budget_alerts.length > 0 && (
        <div className="card alert-card">
          <h3 className="card-title">⚠️ Превышение бюджета</h3>
          {data.budget_alerts.map((alert: any) => (
            <div key={alert.budget_id} className="alert-item">
              <span>{alert.budget_name}</span>
              <span className="alert-percent">{alert.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// ANALYTICS TAB
// ============================================

function AnalyticsTab({ transactions }: { transactions: Transaction[] }) {
  const analytics = AnalyticsService.getAnalyticsData(transactions);
  
  return (
    <div className="tab-content">
      {/* Trends */}
      <div className="card">
        <h3 className="card-title">📈 Тренды</h3>
        <div className="trends-grid">
          <div className="trend-item">
            <span className="trend-label">Расходы</span>
            <span className={`trend-direction ${analytics.expense_trend.direction}`}>
              {analytics.expense_trend.direction === 'up' ? '↑' : 
               analytics.expense_trend.direction === 'down' ? '↓' : '→'}
              {Math.abs(analytics.expense_trend.change_percent)}%
            </span>
          </div>
          <div className="trend-item">
            <span className="trend-label">Доходы</span>
            <span className={`trend-direction ${analytics.income_trend.direction}`}>
              {analytics.income_trend.direction === 'up' ? '↑' : 
               analytics.income_trend.direction === 'down' ? '↓' : '→'}
              {Math.abs(analytics.income_trend.change_percent)}%
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Chart (simplified) */}
      <div className="card">
        <h3 className="card-title">📊 По месяцам</h3>
        <div className="chart-container">
          {analytics.monthly_data.map((m) => (
            <div key={m.month} className="chart-bar-group">
              <div className="chart-bars">
                <div 
                  className="chart-bar income" 
                  style={{ height: `${Math.min(100, m.income / 2000)}px` }}
                  title={`Доход: ${formatMoney(m.income)}`}
                />
                <div 
                  className="chart-bar expense" 
                  style={{ height: `${Math.min(100, m.expense / 2000)}px` }}
                  title={`Расход: ${formatMoney(m.expense)}`}
                />
              </div>
              <span className="chart-label">{m.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekday Pattern */}
      <div className="card">
        <h3 className="card-title">📅 По дням недели</h3>
        <div className="weekday-grid">
          {analytics.weekday_pattern.map((day) => (
            <div key={day.day} className="weekday-item">
              <span className="weekday-name">{day.day_name}</span>
              <span className="weekday-amount">{formatMoney(day.average_expense)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast */}
      {analytics.expense_forecast.length > 0 && (
        <div className="card">
          <h3 className="card-title">🔮 Прогноз расходов</h3>
          {analytics.expense_forecast.map((f) => (
            <div key={f.date} className="forecast-item">
              <span>{f.date}</span>
              <span>{formatMoney(f.predicted_expense)}</span>
              <span className="forecast-range">
                {formatMoney(f.confidence_low)} – {formatMoney(f.confidence_high)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// HEALTH TAB
// ============================================

function HealthTab({ analysis }: { analysis: any }) {
  const { score, recommendations, metrics } = analysis;
  
  return (
    <div className="tab-content">
      {/* Main Score */}
      <div className="card health-score-card">
        <div className="health-score-circle">
          <span className="health-score-value">{score.overall}</span>
          <span className="health-score-max">/100</span>
        </div>
        <div className="health-score-grade">
          <span className="grade-emoji">{score.emoji}</span>
          <span className="grade-letter">{score.grade}</span>
        </div>
        <p className="health-score-summary">{score.summary}</p>
      </div>

      {/* Score Breakdown */}
      <div className="card">
        <h3 className="card-title">📊 Детали</h3>
        <div className="score-breakdown">
          <ScoreBar label="Сбережения" value={score.savings} />
          <ScoreBar label="Бюджеты" value={score.budget} />
          <ScoreBar label="Кредиты" value={score.debt} />
          <ScoreBar label="Стабильность" value={score.stability} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="card">
        <h3 className="card-title">📈 Метрики</h3>
        <div className="metrics-grid">
          <MetricItem 
            label="Норма сбережений" 
            value={`${Math.round(metrics.savings_rate * 100)}%`}
            status={metrics.savings_rate >= 0.1 ? 'good' : 'bad'}
          />
          <MetricItem 
            label="Кредитная нагрузка" 
            value={`${Math.round(metrics.credit_ratio * 100)}%`}
            status={metrics.credit_ratio <= 0.2 ? 'good' : 'bad'}
          />
          <MetricItem 
            label="Бюджетов соблюдено" 
            value={`${metrics.budgets_on_track}/${metrics.budgets_on_track + metrics.budgets_exceeded}`}
            status={metrics.budget_adherence_rate >= 0.7 ? 'good' : 'bad'}
          />
          <MetricItem 
            label="Ср. расход в день" 
            value={formatMoney(metrics.avg_daily_expense)}
            status="neutral"
          />
        </div>
      </div>

      {/* Recommendations */}
      <div className="card">
        <h3 className="card-title">💡 Рекомендации</h3>
        <div className="recommendations-list">
          {recommendations.map((rec: any, i: number) => (
            <div key={i} className={`recommendation-item priority-${rec.priority}`}>
              <div className="recommendation-header">
                <span className="recommendation-title">{rec.title}</span>
                <span className={`priority-badge ${rec.priority}`}>{rec.priority}</span>
              </div>
              <p className="recommendation-description">{rec.description}</p>
              {rec.action && (
                <p className="recommendation-action">💡 {rec.action}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 80) return 'var(--green)';
    if (v >= 60) return 'var(--yellow)';
    if (v >= 40) return 'var(--orange)';
    return 'var(--red)';
  };
  
  return (
    <div className="score-bar-item">
      <div className="score-bar-header">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="score-bar-track">
        <div 
          className="score-bar-fill" 
          style={{ width: `${value}%`, backgroundColor: getColor(value) }} 
        />
      </div>
    </div>
  );
}

function MetricItem({ label, value, status }: { label: string; value: string; status: 'good' | 'bad' | 'neutral' }) {
  return (
    <div className={`metric-item ${status}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
    </div>
  );
}

// ============================================
// HISTORY TAB
// ============================================

function HistoryTab({ transactions }: { transactions: Transaction[] }) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  
  const filtered = transactions.filter(t => 
    filter === 'all' || t.type === filter
  );
  
  return (
    <div className="tab-content">
      {/* Filter */}
      <div className="filter-bar">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Все
        </button>
        <button 
          className={`filter-btn ${filter === 'income' ? 'active' : ''}`}
          onClick={() => setFilter('income')}
        >
          Доходы
        </button>
        <button 
          className={`filter-btn ${filter === 'expense' ? 'active' : ''}`}
          onClick={() => setFilter('expense')}
        >
          Расходы
        </button>
      </div>

      {/* Transactions List */}
      <div className="card">
        <div className="transactions-list">
          {filtered.slice(0, 50).map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} showDate />
          ))}
        </div>
      </div>
    </div>
  );
}

function TransactionItem({ transaction: tx, showDate = false }: { transaction: Transaction; showDate?: boolean }) {
  const isIncome = tx.type === 'income';
  
  return (
    <div className="transaction-item">
      <div className={`transaction-icon ${isIncome ? 'income' : tx.is_shared ? 'shared' : 'expense'}`}>
        {tx.category?.icon || (isIncome ? '💰' : '💸')}
      </div>
      <div className="transaction-info">
        <span className="transaction-category">
          {tx.category?.name || tx.description || 'Без категории'}
          {tx.is_shared && <span className="badge shared">общий</span>}
          {tx.is_credit && <span className="badge credit">кредит</span>}
        </span>
        <span className="transaction-meta">
          {showDate && formatDate(tx.date)}
          {showDate && ' · '}
          {tx.user_id === 'user-1' ? 'Алексей' : 'Мария'}
        </span>
      </div>
      <span className={`transaction-amount ${isIncome ? 'income' : 'expense'}`}>
        {isIncome ? '+' : '-'}{formatMoney(tx.amount)}
      </span>
    </div>
  );
}

// ============================================
// SETTINGS TAB
// ============================================

function SettingsTab({ theme, setTheme }: { theme: 'light' | 'dark'; setTheme: (t: 'light' | 'dark') => void }) {
  return (
    <div className="tab-content">
      <div className="card">
        <h3 className="card-title">🎨 Оформление</h3>
        <div className="setting-item">
          <span>Тёмная тема</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={theme === 'dark'} 
              onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
            />
            <span className="switch-slider" />
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">ℹ️ О приложении</h3>
        <p className="setting-text">Family Finance v2.0</p>
        <p className="setting-text">ML-аналитика для семейного бюджета</p>
        {isDemoMode() && (
          <p className="setting-text demo">
            🎭 Демо-режим: данные сгенерированы автоматически
          </p>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">🔗 Ссылки</h3>
        <a 
          href="https://github.com/yourusername/family-finance" 
          target="_blank" 
          rel="noopener"
          className="setting-link"
        >
          GitHub репозиторий
        </a>
      </div>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
