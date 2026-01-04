/**
 * Analytics Service
 * Main service that combines ML, anomalies, health, and auto-categorization
 */

import type { 
  Transaction, 
  Budget, 
  Goal, 
  Category,
  AnalyticsData,
  MonthlyData,
  WeeklyData,
  WeekdayPattern,
  PeriodComparison,
  CategorySummary,
  DashboardData,
  DebtCalculation,
  BudgetAlert,
  Forecast
} from '../types';

import { ML } from './ml';
import { AnomalyService } from './anomaly';
import { HealthService } from './health';
import { AutoCategoryService } from './autocategory';

// ============================================
// DASHBOARD DATA
// ============================================

/**
 * Get complete dashboard data
 */
export function getDashboardData(
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[],
  familyMembers: Array<{ user_id: string; nickname: string }>
): DashboardData {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Filter current month
  const monthTransactions = transactions.filter(t => new Date(t.date) >= monthStart);
  
  // Calculate totals
  const income = monthTransactions.filter(t => t.type === 'income');
  const expenses = monthTransactions.filter(t => t.type === 'expense');
  
  const total_income = sum(income.map(t => t.amount));
  const total_expense = sum(expenses.map(t => t.amount));
  const total_balance = total_income - total_expense;
  
  // Period comparison
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  
  const lastMonthTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= lastMonthStart && d <= lastMonthEnd;
  });
  
  const lastMonthIncome = sum(lastMonthTransactions.filter(t => t.type === 'income').map(t => t.amount));
  const lastMonthExpense = sum(lastMonthTransactions.filter(t => t.type === 'expense').map(t => t.amount));
  
  const income_change = lastMonthIncome > 0 
    ? Math.round((total_income - lastMonthIncome) / lastMonthIncome * 100) 
    : 0;
  const expense_change = lastMonthExpense > 0 
    ? Math.round((total_expense - lastMonthExpense) / lastMonthExpense * 100) 
    : 0;
  
  // Credit usage
  const credit_used = sum(expenses.filter(t => t.is_credit).map(t => t.amount));
  
  // Shared expenses
  const sharedExpenses = expenses.filter(t => t.is_shared);
  const shared_total = sum(sharedExpenses.map(t => t.amount));
  const by_user: Record<string, number> = {};
  
  familyMembers.forEach(m => {
    by_user[m.user_id] = sum(
      sharedExpenses.filter(t => t.user_id === m.user_id).map(t => t.amount)
    );
  });
  
  // Debt calculation
  const debts = calculateDebts(by_user, familyMembers);
  
  // Budget alerts
  const budget_alerts = getBudgetAlerts(budgets, expenses);
  
  // Recent transactions
  const recent_transactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);
  
  // Top categories
  const top_categories = getTopCategories(expenses, 6);
  
  // Anomaly detection
  const allAnomalies = transactions.slice(0, 20).flatMap(t => 
    AnomalyService.detectTransactionAnomalies(t, transactions, [])
  );
  
  return {
    total_balance,
    total_income,
    total_expense,
    income_change,
    expense_change,
    credit_used,
    shared_expenses: {
      total: shared_total,
      by_user
    },
    debts,
    recent_transactions,
    top_categories,
    budget_alerts,
    anomalies: allAnomalies.slice(0, 5).map(a => ({
      id: Math.random().toString(36).substr(2, 9),
      family_id: transactions[0]?.family_id || '',
      type: a.type,
      severity: a.severity,
      message: a.message,
      details: a.details,
      is_dismissed: false,
      created_at: new Date().toISOString()
    }))
  };
}

// ============================================
// ANALYTICS DATA
// ============================================

/**
 * Get complete analytics data
 */
export function getAnalyticsData(
  transactions: Transaction[],
  period: 'month' | 'quarter' | 'year' = 'month'
): AnalyticsData {
  // Monthly aggregation
  const monthly_data = aggregateMonthly(transactions, 12);
  
  // Weekly aggregation
  const weekly_data = aggregateWeekly(transactions, 12);
  
  // Category breakdown
  const expenses = transactions.filter(t => t.type === 'expense');
  const income = transactions.filter(t => t.type === 'income');
  
  const expense_by_category = getTopCategories(expenses, 10);
  const income_by_category = getTopCategories(income, 5);
  
  // Trends
  const expenseAmounts = monthly_data.map(m => m.expense);
  const incomeAmounts = monthly_data.map(m => m.income);
  
  const expense_trend = ML.analyzeTrend(expenseAmounts);
  const income_trend = ML.analyzeTrend(incomeAmounts);
  
  // Forecasts
  const expenseData = monthly_data.map(m => ({
    date: new Date(m.month + '-01'),
    amount: m.expense
  }));
  const incomeData = monthly_data.map(m => ({
    date: new Date(m.month + '-01'),
    amount: m.income
  }));
  
  const expense_forecast = ML.forecastExpenses(expenseData, 3);
  const income_forecast = ML.forecastExpenses(incomeData, 3);
  
  // Weekday patterns
  const weekday_pattern = getWeekdayPattern(expenses);
  
  // Period comparison
  const period_comparison = getPeriodComparison(transactions, period);
  
  return {
    monthly_data,
    weekly_data,
    expense_by_category,
    income_by_category,
    expense_trend,
    income_trend,
    expense_forecast,
    income_forecast,
    weekday_pattern,
    period_comparison
  };
}

// ============================================
// FINANCIAL HEALTH
// ============================================

/**
 * Get financial health analysis
 */
export function getHealthAnalysis(
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[]
) {
  return HealthService.analyzeFinancialHealth(transactions, budgets, goals);
}

// ============================================
// AUTO-CATEGORIZATION
// ============================================

/**
 * Auto-categorize a transaction
 */
export function autoCategorize(
  description: string,
  categories: Category[],
  historicalTransactions?: Transaction[]
) {
  return AutoCategoryService.predictCategory(
    description,
    categories,
    historicalTransactions
  );
}

/**
 * Batch categorize multiple transactions
 */
export function batchAutoCategorize(
  transactions: Array<{ id: string; description: string }>,
  categories: Category[]
) {
  return AutoCategoryService.batchCategorize(transactions, categories);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function aggregateMonthly(transactions: Transaction[], months: number): MonthlyData[] {
  const result: Record<string, { income: number; expense: number }> = {};
  
  // Initialize last N months
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().substring(0, 7);
    result[key] = { income: 0, expense: 0 };
  }
  
  // Aggregate transactions
  transactions.forEach(t => {
    const month = t.date.substring(0, 7);
    if (result[month]) {
      if (t.type === 'income') {
        result[month].income += t.amount;
      } else if (t.type === 'expense') {
        result[month].expense += t.amount;
      }
    }
  });
  
  return Object.entries(result)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      income: Math.round(data.income),
      expense: Math.round(data.expense),
      savings: Math.round(data.income - data.expense)
    }));
}

function aggregateWeekly(transactions: Transaction[], weeks: number): WeeklyData[] {
  const result: Record<string, { income: number; expense: number }> = {};
  
  // Initialize last N weeks
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() - i * 7);
    const key = d.toISOString().split('T')[0];
    result[key] = { income: 0, expense: 0 };
  }
  
  // Aggregate transactions
  transactions.forEach(t => {
    const d = new Date(t.date);
    d.setDate(d.getDate() - d.getDay());
    const weekStart = d.toISOString().split('T')[0];
    
    if (result[weekStart]) {
      if (t.type === 'income') {
        result[weekStart].income += t.amount;
      } else if (t.type === 'expense') {
        result[weekStart].expense += t.amount;
      }
    }
  });
  
  return Object.entries(result)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week_start, data]) => ({
      week_start,
      income: Math.round(data.income),
      expense: Math.round(data.expense)
    }));
}

function getTopCategories(
  transactions: Transaction[], 
  limit: number
): CategorySummary[] {
  const totals: Record<string, {
    category_id: string;
    category_name: string;
    category_icon: string;
    total: number;
    count: number;
  }> = {};
  
  let grandTotal = 0;
  
  transactions.forEach(t => {
    const id = t.category_id || 'uncategorized';
    const name = t.category?.name || 'Без категории';
    const icon = t.category?.icon || '📦';
    
    if (!totals[id]) {
      totals[id] = {
        category_id: id,
        category_name: name,
        category_icon: icon,
        total: 0,
        count: 0
      };
    }
    
    totals[id].total += t.amount;
    totals[id].count++;
    grandTotal += t.amount;
  });
  
  return Object.values(totals)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map(cat => ({
      ...cat,
      total: Math.round(cat.total),
      percentage: grandTotal > 0 ? Math.round(cat.total / grandTotal * 100) : 0,
      transaction_count: cat.count
    }));
}

function getWeekdayPattern(transactions: Transaction[]): WeekdayPattern[] {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const totals: number[] = Array(7).fill(0);
  const counts: number[] = Array(7).fill(0);
  
  transactions.forEach(t => {
    const day = new Date(t.date).getDay();
    totals[day] += t.amount;
    counts[day]++;
  });
  
  return days.map((name, i) => ({
    day: i,
    day_name: name,
    average_expense: counts[i] > 0 ? Math.round(totals[i] / counts[i]) : 0,
    transaction_count: counts[i]
  }));
}

function getPeriodComparison(
  transactions: Transaction[],
  period: 'month' | 'quarter' | 'year'
): PeriodComparison {
  const now = new Date();
  let currentStart: Date, previousStart: Date, previousEnd: Date;
  
  if (period === 'month') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    currentStart = new Date(now.getFullYear(), quarter * 3, 1);
    previousStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
    previousEnd = new Date(now.getFullYear(), quarter * 3, 0);
  } else {
    currentStart = new Date(now.getFullYear(), 0, 1);
    previousStart = new Date(now.getFullYear() - 1, 0, 1);
    previousEnd = new Date(now.getFullYear() - 1, 11, 31);
  }
  
  const current = transactions.filter(t => new Date(t.date) >= currentStart);
  const previous = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= previousStart && d <= previousEnd;
  });
  
  const currentIncome = sum(current.filter(t => t.type === 'income').map(t => t.amount));
  const currentExpense = sum(current.filter(t => t.type === 'expense').map(t => t.amount));
  const previousIncome = sum(previous.filter(t => t.type === 'income').map(t => t.amount));
  const previousExpense = sum(previous.filter(t => t.type === 'expense').map(t => t.amount));
  
  return {
    current_period: {
      income: currentIncome,
      expense: currentExpense,
      start_date: currentStart.toISOString(),
      end_date: now.toISOString()
    },
    previous_period: {
      income: previousIncome,
      expense: previousExpense,
      start_date: previousStart.toISOString(),
      end_date: previousEnd.toISOString()
    },
    income_change_percent: previousIncome > 0 
      ? Math.round((currentIncome - previousIncome) / previousIncome * 100)
      : 0,
    expense_change_percent: previousExpense > 0
      ? Math.round((currentExpense - previousExpense) / previousExpense * 100)
      : 0
  };
}

function calculateDebts(
  byUser: Record<string, number>,
  members: Array<{ user_id: string; nickname: string }>
): DebtCalculation[] {
  const total = Object.values(byUser).reduce((a, b) => a + b, 0);
  if (total === 0 || members.length < 2) return [];
  
  const fairShare = total / members.length;
  const debts: DebtCalculation[] = [];
  
  // Calculate who owes whom
  const balances = members.map(m => ({
    ...m,
    paid: byUser[m.user_id] || 0,
    balance: (byUser[m.user_id] || 0) - fairShare
  }));
  
  // Sort by balance (negative = owes money, positive = owed money)
  balances.sort((a, b) => a.balance - b.balance);
  
  // Simple debt settlement
  let i = 0; // Owes money
  let j = balances.length - 1; // Owed money
  
  while (i < j) {
    const debtor = balances[i];
    const creditor = balances[j];
    
    const amount = Math.min(-debtor.balance, creditor.balance);
    
    if (amount > 0) {
      debts.push({
        from_user_id: debtor.user_id,
        from_user_name: debtor.nickname,
        to_user_id: creditor.user_id,
        to_user_name: creditor.nickname,
        amount: Math.round(amount)
      });
    }
    
    debtor.balance += amount;
    creditor.balance -= amount;
    
    if (Math.abs(debtor.balance) < 1) i++;
    if (Math.abs(creditor.balance) < 1) j--;
  }
  
  return debts;
}

function getBudgetAlerts(
  budgets: Budget[],
  expenses: Transaction[]
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  
  budgets.filter(b => b.is_active).forEach(budget => {
    const categoryExpenses = expenses.filter(e => 
      e.category_id === budget.category_id
    );
    
    const spent = sum(categoryExpenses.map(e => e.amount));
    const percentage = Math.round(spent / budget.amount * 100);
    
    if (percentage >= budget.alert_threshold) {
      alerts.push({
        budget_id: budget.id,
        budget_name: budget.name,
        category_name: budget.category?.name,
        spent,
        limit: budget.amount,
        percentage
      });
    }
  });
  
  return alerts.sort((a, b) => b.percentage - a.percentage);
}

// ============================================
// EXPORTS
// ============================================

export const AnalyticsService = {
  getDashboardData,
  getAnalyticsData,
  getHealthAnalysis,
  autoCategorize,
  batchAutoCategorize,
  // Re-export sub-services
  ML,
  Anomaly: AnomalyService,
  Health: HealthService,
  AutoCategory: AutoCategoryService
};

export default AnalyticsService;
