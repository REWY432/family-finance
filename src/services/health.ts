/**
 * Financial Health Service
 * Calculates financial health scores and provides recommendations
 */

import type { 
  Transaction, 
  Budget, 
  Goal,
  HealthMetrics,
  HealthSnapshot,
  TrendAnalysis
} from '../types';
import { ML } from './ml';

// ============================================
// TYPES
// ============================================

export interface HealthScore {
  overall: number; // 0-100
  savings: number;
  budget: number;
  debt: number;
  stability: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  emoji: string;
  summary: string;
}

export interface HealthRecommendation {
  category: 'savings' | 'budget' | 'debt' | 'stability' | 'general';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
}

export interface HealthAnalysis {
  score: HealthScore;
  metrics: HealthMetrics;
  recommendations: HealthRecommendation[];
  trends: {
    income: TrendAnalysis;
    expense: TrendAnalysis;
    savings: TrendAnalysis;
  };
  comparison: {
    vs_last_month: number; // Score change
    vs_last_quarter: number;
  };
}

// ============================================
// SCORING WEIGHTS
// ============================================

const WEIGHTS = {
  savings: 0.30,    // 30% - Savings rate is most important
  budget: 0.25,     // 25% - Staying within budget
  debt: 0.20,       // 20% - Credit/debt management
  stability: 0.25   // 25% - Income/expense stability
};

const THRESHOLDS = {
  // Savings rate thresholds
  savings: {
    excellent: 0.20,  // 20%+ savings rate
    good: 0.10,       // 10-20%
    fair: 0.05,       // 5-10%
    poor: 0           // 0-5%
  },
  // Budget adherence thresholds
  budget: {
    excellent: 0.90,  // 90%+ budgets on track
    good: 0.70,       // 70-90%
    fair: 0.50,       // 50-70%
    poor: 0           // <50%
  },
  // Credit usage thresholds
  debt: {
    excellent: 0.10,  // <10% credit usage
    good: 0.20,       // 10-20%
    fair: 0.40,       // 20-40%
    poor: 0.40        // >40%
  },
  // Volatility thresholds (lower is better)
  stability: {
    excellent: 0.15,  // <15% volatility
    good: 0.25,       // 15-25%
    fair: 0.40,       // 25-40%
    poor: 0.40        // >40%
  }
};

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Calculate complete financial health analysis
 */
export function analyzeFinancialHealth(
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[],
  previousSnapshots: HealthSnapshot[] = []
): HealthAnalysis {
  // Calculate metrics
  const metrics = calculateMetrics(transactions, budgets, goals);
  
  // Calculate individual scores
  const savingsScore = calculateSavingsScore(metrics);
  const budgetScore = calculateBudgetScore(metrics);
  const debtScore = calculateDebtScore(metrics);
  const stabilityScore = calculateStabilityScore(metrics);
  
  // Calculate overall score
  const overall = Math.round(
    savingsScore * WEIGHTS.savings +
    budgetScore * WEIGHTS.budget +
    debtScore * WEIGHTS.debt +
    stabilityScore * WEIGHTS.stability
  );
  
  // Determine grade
  const { grade, emoji, summary } = getGradeInfo(overall);
  
  const score: HealthScore = {
    overall,
    savings: savingsScore,
    budget: budgetScore,
    debt: debtScore,
    stability: stabilityScore,
    grade,
    emoji,
    summary
  };
  
  // Generate recommendations
  const recommendations = generateRecommendations(score, metrics);
  
  // Calculate trends
  const monthlyData = aggregateMonthly(transactions);
  const trends = {
    income: ML.analyzeTrend(monthlyData.map(m => m.income)),
    expense: ML.analyzeTrend(monthlyData.map(m => m.expense)),
    savings: ML.analyzeTrend(monthlyData.map(m => m.income - m.expense))
  };
  
  // Compare with previous periods
  const comparison = calculateComparison(overall, previousSnapshots);
  
  return {
    score,
    metrics,
    recommendations,
    trends,
    comparison
  };
}

// ============================================
// METRICS CALCULATION
// ============================================

function calculateMetrics(
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[]
): HealthMetrics {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Filter current month transactions
  const monthTransactions = transactions.filter(t => 
    new Date(t.date) >= monthStart
  );
  
  // Calculate totals
  const incomeTransactions = monthTransactions.filter(t => t.type === 'income');
  const expenseTransactions = monthTransactions.filter(t => t.type === 'expense');
  
  const total_income = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const total_expense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const net_savings = total_income - total_expense;
  const savings_rate = total_income > 0 ? net_savings / total_income : 0;
  
  // Budget analysis
  const activeBudgets = budgets.filter(b => b.is_active);
  let budgets_on_track = 0;
  let budgets_exceeded = 0;
  
  activeBudgets.forEach(budget => {
    const spent = expenseTransactions
      .filter(t => t.category_id === budget.category_id)
      .reduce((sum, t) => sum + t.amount, 0);
    
    if (spent <= budget.amount) {
      budgets_on_track++;
    } else {
      budgets_exceeded++;
    }
  });
  
  const budget_adherence_rate = activeBudgets.length > 0 
    ? budgets_on_track / activeBudgets.length 
    : 1;
  
  // Daily spending analysis
  const dailyExpenses = calculateDailyExpenses(expenseTransactions);
  const avg_daily_expense = dailyExpenses.length > 0
    ? dailyExpenses.reduce((a, b) => a + b, 0) / dailyExpenses.length
    : 0;
  
  const expense_volatility = calculateVolatility(dailyExpenses);
  const largest_expense = Math.max(...expenseTransactions.map(t => t.amount), 0);
  
  // Credit analysis
  const creditTransactions = expenseTransactions.filter(t => t.is_credit);
  const credit_usage = creditTransactions.reduce((sum, t) => sum + t.amount, 0);
  const credit_ratio = total_expense > 0 ? credit_usage / total_expense : 0;
  
  // Goals analysis
  const activeGoals = goals.filter(g => !g.is_completed);
  const goals_progress = activeGoals.length > 0
    ? activeGoals.reduce((sum, g) => {
        const progress = g.target_amount > 0 
          ? g.current_amount / g.target_amount 
          : 0;
        return sum + Math.min(1, progress);
      }, 0) / activeGoals.length
    : 1;
  
  // Goals on track (will reach deadline)
  let goals_on_track = 0;
  activeGoals.forEach(goal => {
    if (!goal.deadline) {
      goals_on_track++;
      return;
    }
    
    const remaining = goal.target_amount - goal.current_amount;
    const daysLeft = Math.max(1, 
      (new Date(goal.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Calculate required daily savings
    const requiredDaily = remaining / daysLeft;
    const avgDailySavings = net_savings / now.getDate();
    
    if (avgDailySavings >= requiredDaily * 0.8) {
      goals_on_track++;
    }
  });
  
  // Trends
  const monthlyData = aggregateMonthly(transactions);
  const expenseTrend = ML.analyzeTrend(monthlyData.map(m => m.expense));
  const incomeTrend = ML.analyzeTrend(monthlyData.map(m => m.income));
  
  return {
    total_income,
    total_expense,
    net_savings,
    savings_rate,
    budgets_on_track,
    budgets_exceeded,
    budget_adherence_rate,
    avg_daily_expense: Math.round(avg_daily_expense),
    expense_volatility,
    largest_expense,
    credit_usage,
    credit_ratio,
    goals_progress,
    goals_on_track,
    expense_trend: expenseTrend.direction === 'up' ? 'increasing' : 
                   expenseTrend.direction === 'down' ? 'decreasing' : 'stable',
    income_trend: incomeTrend.direction === 'up' ? 'increasing' :
                  incomeTrend.direction === 'down' ? 'decreasing' : 'stable'
  };
}

// ============================================
// INDIVIDUAL SCORE CALCULATIONS
// ============================================

function calculateSavingsScore(metrics: HealthMetrics): number {
  const rate = metrics.savings_rate;
  
  if (rate >= THRESHOLDS.savings.excellent) return 100;
  if (rate >= THRESHOLDS.savings.good) {
    return 70 + 30 * (rate - THRESHOLDS.savings.good) / 
           (THRESHOLDS.savings.excellent - THRESHOLDS.savings.good);
  }
  if (rate >= THRESHOLDS.savings.fair) {
    return 40 + 30 * (rate - THRESHOLDS.savings.fair) / 
           (THRESHOLDS.savings.good - THRESHOLDS.savings.fair);
  }
  if (rate > 0) {
    return 40 * rate / THRESHOLDS.savings.fair;
  }
  
  // Negative savings
  return Math.max(0, 20 + rate * 100);
}

function calculateBudgetScore(metrics: HealthMetrics): number {
  const rate = metrics.budget_adherence_rate;
  
  // No budgets = assume good
  if (metrics.budgets_on_track + metrics.budgets_exceeded === 0) {
    return 70;
  }
  
  if (rate >= THRESHOLDS.budget.excellent) return 100;
  if (rate >= THRESHOLDS.budget.good) {
    return 70 + 30 * (rate - THRESHOLDS.budget.good) / 
           (THRESHOLDS.budget.excellent - THRESHOLDS.budget.good);
  }
  if (rate >= THRESHOLDS.budget.fair) {
    return 40 + 30 * (rate - THRESHOLDS.budget.fair) / 
           (THRESHOLDS.budget.good - THRESHOLDS.budget.fair);
  }
  
  return 40 * rate / THRESHOLDS.budget.fair;
}

function calculateDebtScore(metrics: HealthMetrics): number {
  const ratio = metrics.credit_ratio;
  
  // No credit usage = perfect
  if (ratio === 0) return 100;
  
  if (ratio <= THRESHOLDS.debt.excellent) return 100;
  if (ratio <= THRESHOLDS.debt.good) {
    return 70 + 30 * (THRESHOLDS.debt.good - ratio) / 
           (THRESHOLDS.debt.good - THRESHOLDS.debt.excellent);
  }
  if (ratio <= THRESHOLDS.debt.fair) {
    return 40 + 30 * (THRESHOLDS.debt.fair - ratio) / 
           (THRESHOLDS.debt.fair - THRESHOLDS.debt.good);
  }
  
  // High credit usage
  return Math.max(0, 40 - (ratio - THRESHOLDS.debt.poor) * 100);
}

function calculateStabilityScore(metrics: HealthMetrics): number {
  const volatility = metrics.expense_volatility;
  
  // Factor in trends
  let trendPenalty = 0;
  if (metrics.expense_trend === 'increasing') trendPenalty = 10;
  if (metrics.income_trend === 'decreasing') trendPenalty += 10;
  
  let baseScore: number;
  
  if (volatility <= THRESHOLDS.stability.excellent) {
    baseScore = 100;
  } else if (volatility <= THRESHOLDS.stability.good) {
    baseScore = 70 + 30 * (THRESHOLDS.stability.good - volatility) / 
                (THRESHOLDS.stability.good - THRESHOLDS.stability.excellent);
  } else if (volatility <= THRESHOLDS.stability.fair) {
    baseScore = 40 + 30 * (THRESHOLDS.stability.fair - volatility) / 
                (THRESHOLDS.stability.fair - THRESHOLDS.stability.good);
  } else {
    baseScore = Math.max(0, 40 - (volatility - THRESHOLDS.stability.poor) * 50);
  }
  
  return Math.max(0, baseScore - trendPenalty);
}

// ============================================
// GRADE & SUMMARY
// ============================================

function getGradeInfo(score: number): { grade: 'A' | 'B' | 'C' | 'D' | 'F'; emoji: string; summary: string } {
  if (score >= 90) {
    return { 
      grade: 'A', 
      emoji: '🌟', 
      summary: 'Отличное финансовое здоровье!'
    };
  }
  if (score >= 75) {
    return { 
      grade: 'B', 
      emoji: '😊', 
      summary: 'Хорошее состояние финансов'
    };
  }
  if (score >= 60) {
    return { 
      grade: 'C', 
      emoji: '😐', 
      summary: 'Есть над чем поработать'
    };
  }
  if (score >= 40) {
    return { 
      grade: 'D', 
      emoji: '😟', 
      summary: 'Требуется внимание к финансам'
    };
  }
  return { 
    grade: 'F', 
    emoji: '🚨', 
    summary: 'Критическая ситуация'
  };
}

// ============================================
// RECOMMENDATIONS
// ============================================

function generateRecommendations(
  score: HealthScore, 
  metrics: HealthMetrics
): HealthRecommendation[] {
  const recommendations: HealthRecommendation[] = [];

  // Savings recommendations
  if (score.savings < 60) {
    if (metrics.savings_rate < 0) {
      recommendations.push({
        category: 'savings',
        priority: 'high',
        title: 'Расходы превышают доходы',
        description: `Вы тратите больше, чем зарабатываете. Это ведёт к накоплению долгов.`,
        action: 'Проанализируйте крупные категории расходов и найдите возможности для экономии'
      });
    } else if (metrics.savings_rate < 0.05) {
      recommendations.push({
        category: 'savings',
        priority: 'medium',
        title: 'Низкий уровень сбережений',
        description: `Текущий уровень сбережений ${Math.round(metrics.savings_rate * 100)}%. Рекомендуется минимум 10%.`,
        action: 'Попробуйте откладывать 10% от дохода сразу после получения зарплаты'
      });
    }
  }

  // Budget recommendations
  if (score.budget < 60) {
    recommendations.push({
      category: 'budget',
      priority: metrics.budgets_exceeded > 2 ? 'high' : 'medium',
      title: 'Превышение бюджетов',
      description: `${metrics.budgets_exceeded} из ${metrics.budgets_on_track + metrics.budgets_exceeded} бюджетов превышены.`,
      action: 'Пересмотрите лимиты или сократите расходы в этих категориях'
    });
  }

  // Debt recommendations
  if (score.debt < 60) {
    recommendations.push({
      category: 'debt',
      priority: metrics.credit_ratio > 0.3 ? 'high' : 'medium',
      title: 'Высокое использование кредита',
      description: `${Math.round(metrics.credit_ratio * 100)}% расходов — в кредит. Это может привести к долговой нагрузке.`,
      action: 'Старайтесь использовать кредитные средства только для необходимых покупок'
    });
  }

  // Stability recommendations
  if (score.stability < 60) {
    if (metrics.expense_volatility > 0.4) {
      recommendations.push({
        category: 'stability',
        priority: 'low',
        title: 'Нестабильные расходы',
        description: 'Ваши ежедневные расходы сильно варьируются. Это усложняет планирование.',
        action: 'Попробуйте установить дневной лимит на повседневные траты'
      });
    }
    
    if (metrics.expense_trend === 'increasing') {
      recommendations.push({
        category: 'stability',
        priority: 'medium',
        title: 'Расходы растут',
        description: 'Наблюдается тенденция к увеличению расходов.',
        action: 'Проверьте, нет ли новых регулярных трат, от которых можно отказаться'
      });
    }
  }

  // General positive feedback if doing well
  if (recommendations.length === 0) {
    recommendations.push({
      category: 'general',
      priority: 'low',
      title: 'Продолжайте в том же духе! 🎉',
      description: 'Ваши финансы в отличном состоянии.',
      action: 'Рассмотрите возможность увеличения инвестиций или создания финансовой подушки'
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateDailyExpenses(transactions: Transaction[]): number[] {
  const byDay: Record<string, number> = {};
  
  transactions.forEach(t => {
    const day = new Date(t.date).toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + t.amount;
  });
  
  return Object.values(byDay);
}

function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return stdDev / mean; // Coefficient of variation
}

function aggregateMonthly(transactions: Transaction[]): { month: string; income: number; expense: number }[] {
  const byMonth: Record<string, { income: number; expense: number }> = {};
  
  transactions.forEach(t => {
    const month = t.date.substring(0, 7); // YYYY-MM
    if (!byMonth[month]) {
      byMonth[month] = { income: 0, expense: 0 };
    }
    
    if (t.type === 'income') {
      byMonth[month].income += t.amount;
    } else if (t.type === 'expense') {
      byMonth[month].expense += t.amount;
    }
  });
  
  return Object.entries(byMonth)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function calculateComparison(
  currentScore: number,
  snapshots: HealthSnapshot[]
): { vs_last_month: number; vs_last_quarter: number } {
  if (snapshots.length === 0) {
    return { vs_last_month: 0, vs_last_quarter: 0 };
  }

  const sorted = [...snapshots].sort((a, b) => 
    b.snapshot_date.localeCompare(a.snapshot_date)
  );

  const lastMonth = sorted[0]?.overall_score || currentScore;
  const lastQuarter = sorted[2]?.overall_score || lastMonth;

  return {
    vs_last_month: currentScore - lastMonth,
    vs_last_quarter: currentScore - lastQuarter
  };
}

// ============================================
// DATABASE INTEGRATION
// ============================================

/**
 * Create snapshot for database
 */
export function createHealthSnapshot(
  familyId: string,
  analysis: HealthAnalysis
): Omit<HealthSnapshot, 'id' | 'created_at'> {
  return {
    family_id: familyId,
    snapshot_date: new Date().toISOString().split('T')[0],
    overall_score: analysis.score.overall,
    savings_score: analysis.score.savings,
    budget_score: analysis.score.budget,
    debt_score: analysis.score.debt,
    stability_score: analysis.score.stability,
    metrics: analysis.metrics
  };
}

// ============================================
// EXPORTS
// ============================================

export const HealthService = {
  analyzeFinancialHealth,
  createHealthSnapshot,
  WEIGHTS,
  THRESHOLDS
};

export default HealthService;
