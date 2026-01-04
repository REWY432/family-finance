// ============================================
// Database Types (generated from Supabase schema)
// ============================================

export type UUID = string;

// ============================================
// ENUMS
// ============================================

export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
export type CategoryType = 'income' | 'expense';
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';
export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type FamilyRole = 'owner' | 'admin' | 'member';
export type AnomalyType = 'high_amount' | 'unusual_category' | 'frequency' | 'new_merchant';
export type AnomalySeverity = 'info' | 'warning' | 'alert';

// ============================================
// CORE ENTITIES
// ============================================

export interface Profile {
  id: UUID;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: UUID;
  name: string;
  created_by: UUID;
  created_at: string;
}

export interface FamilyMember {
  id: UUID;
  family_id: UUID;
  user_id: UUID;
  role: FamilyRole;
  nickname?: string;
  joined_at: string;
  // Joined data
  profile?: Profile;
}

export interface Account {
  id: UUID;
  family_id: UUID;
  name: string;
  type: AccountType;
  currency: string;
  initial_balance: number;
  current_balance: number;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: UUID;
  family_id: UUID;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  parent_id?: UUID;
  keywords: string[];
  is_system: boolean;
  created_at: string;
  // Computed
  children?: Category[];
}

export interface Transaction {
  id: UUID;
  family_id: UUID;
  account_id?: UUID;
  category_id?: UUID;
  user_id: UUID;
  type: TransactionType;
  amount: number;
  currency: string;
  description?: string;
  date: string;
  is_shared: boolean;
  is_recurring: boolean;
  is_credit: boolean;
  to_account_id?: UUID;
  tags: string[];
  receipt_url?: string;
  location?: string;
  auto_category_confidence?: number;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: Category;
  account?: Account;
  user?: Profile;
}

export interface Budget {
  id: UUID;
  family_id: UUID;
  category_id?: UUID;
  name: string;
  amount: number;
  period: BudgetPeriod;
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
  category?: Category;
}

export interface Goal {
  id: UUID;
  family_id: UUID;
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

export interface GoalContribution {
  id: UUID;
  goal_id: UUID;
  user_id: UUID;
  amount: number;
  note?: string;
  created_at: string;
  // Joined
  user?: Profile;
}

export interface RecurringPayment {
  id: UUID;
  family_id: UUID;
  account_id?: UUID;
  category_id?: UUID;
  user_id: UUID;
  name: string;
  type: TransactionType;
  amount: number;
  frequency: Frequency;
  day_of_month?: number;
  day_of_week?: number;
  next_date: string;
  last_processed?: string;
  is_shared: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category;
}

export interface CategoryRule {
  id: UUID;
  family_id: UUID;
  category_id: UUID;
  pattern: string;
  priority: number;
  match_count: number;
  created_at: string;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface Anomaly {
  id: UUID;
  family_id: UUID;
  transaction_id?: UUID;
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  details?: Record<string, unknown>;
  is_dismissed: boolean;
  dismissed_by?: UUID;
  dismissed_at?: string;
  created_at: string;
  // Joined
  transaction?: Transaction;
}

export interface HealthSnapshot {
  id: UUID;
  family_id: UUID;
  snapshot_date: string;
  overall_score: number;
  savings_score?: number;
  budget_score?: number;
  debt_score?: number;
  stability_score?: number;
  metrics: HealthMetrics;
  created_at: string;
}

export interface HealthMetrics {
  // Income & Expenses
  total_income: number;
  total_expense: number;
  net_savings: number;
  savings_rate: number; // Percentage of income saved
  
  // Budget adherence
  budgets_on_track: number;
  budgets_exceeded: number;
  budget_adherence_rate: number;
  
  // Spending patterns
  avg_daily_expense: number;
  expense_volatility: number; // Standard deviation
  largest_expense: number;
  
  // Debt
  credit_usage: number;
  credit_ratio: number; // Credit expenses / total expenses
  
  // Goals
  goals_progress: number; // Average progress across all goals
  goals_on_track: number;
  
  // Trends
  expense_trend: 'increasing' | 'stable' | 'decreasing';
  income_trend: 'increasing' | 'stable' | 'decreasing';
}

// ============================================
// ML TYPES
// ============================================

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  r_squared: number;
  prediction: number;
  confidence: number;
}

export interface Forecast {
  date: string;
  predicted_expense: number;
  predicted_income: number;
  confidence_low: number;
  confidence_high: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  change_percent: number;
  average: number;
  min: number;
  max: number;
  volatility: number;
}

export interface CategoryPrediction {
  category_id: UUID;
  category_name: string;
  confidence: number;
  alternative?: {
    category_id: UUID;
    category_name: string;
    confidence: number;
  };
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateTransactionInput {
  account_id?: UUID;
  category_id?: UUID;
  type: TransactionType;
  amount: number;
  description?: string;
  date?: string;
  is_shared?: boolean;
  is_credit?: boolean;
  to_account_id?: UUID;
  tags?: string[];
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  id: UUID;
}

export interface TransactionFilters {
  user_id?: UUID;
  category_id?: UUID;
  account_id?: UUID;
  type?: TransactionType;
  is_shared?: boolean;
  is_credit?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
  tags?: string[];
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardData {
  // Balances
  total_balance: number;
  total_income: number;
  total_expense: number;
  
  // Period comparison
  income_change: number; // vs previous period
  expense_change: number;
  
  // Credit
  credit_used: number;
  
  // Shared expenses
  shared_expenses: {
    total: number;
    by_user: Record<UUID, number>;
  };
  
  // Debts
  debts: DebtCalculation[];
  
  // Recent data
  recent_transactions: Transaction[];
  top_categories: CategorySummary[];
  
  // Alerts
  budget_alerts: BudgetAlert[];
  anomalies: Anomaly[];
}

export interface CategorySummary {
  category_id: UUID;
  category_name: string;
  category_icon: string;
  total: number;
  percentage: number;
  transaction_count: number;
}

export interface BudgetAlert {
  budget_id: UUID;
  budget_name: string;
  category_name?: string;
  spent: number;
  limit: number;
  percentage: number;
}

export interface DebtCalculation {
  from_user_id: UUID;
  from_user_name: string;
  to_user_id: UUID;
  to_user_name: string;
  amount: number;
}

// ============================================
// ANALYTICS DASHBOARD
// ============================================

export interface AnalyticsData {
  // Time series
  monthly_data: MonthlyData[];
  weekly_data: WeeklyData[];
  
  // Categories
  expense_by_category: CategorySummary[];
  income_by_category: CategorySummary[];
  
  // Trends
  expense_trend: TrendAnalysis;
  income_trend: TrendAnalysis;
  
  // Forecasts
  expense_forecast: Forecast[];
  income_forecast: Forecast[];
  
  // Patterns
  weekday_pattern: WeekdayPattern[];
  
  // Comparisons
  period_comparison: PeriodComparison;
}

export interface MonthlyData {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  savings: number;
}

export interface WeeklyData {
  week_start: string;
  income: number;
  expense: number;
}

export interface WeekdayPattern {
  day: number; // 0-6, 0 = Sunday
  day_name: string;
  average_expense: number;
  transaction_count: number;
}

export interface PeriodComparison {
  current_period: {
    income: number;
    expense: number;
    start_date: string;
    end_date: string;
  };
  previous_period: {
    income: number;
    expense: number;
    start_date: string;
    end_date: string;
  };
  income_change_percent: number;
  expense_change_percent: number;
}

// ============================================
// UTILITY TYPES
// ============================================

export type DateRange = {
  start: Date;
  end: Date;
};

export type Period = 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type Result<T, E = ApiError> = 
  | { success: true; data: T }
  | { success: false; error: E };
