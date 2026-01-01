/**
 * Anomaly Detection Service
 * Detects unusual financial patterns and transactions
 */

import type { 
  Transaction, 
  Anomaly, 
  AnomalyType, 
  AnomalySeverity,
  Category 
} from '../types';
import { ML } from './ml';

// ============================================
// TYPES
// ============================================

export interface AnomalyDetectionConfig {
  // Z-score threshold for amount anomalies
  amount_threshold: number;
  // Days to look back for pattern analysis
  lookback_days: number;
  // Minimum transactions to establish pattern
  min_transactions: number;
  // IQR multiplier for expense detection
  iqr_multiplier: number;
}

export interface DetectedAnomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  details: {
    transaction_id?: string;
    expected_value?: number;
    actual_value?: number;
    z_score?: number;
    category?: string;
    historical_average?: number;
    deviation_percent?: number;
  };
}

const DEFAULT_CONFIG: AnomalyDetectionConfig = {
  amount_threshold: 2.5,
  lookback_days: 90,
  min_transactions: 5,
  iqr_multiplier: 1.5
};

// ============================================
// MAIN DETECTION FUNCTIONS
// ============================================

/**
 * Detect all anomalies for a transaction
 */
export function detectTransactionAnomalies(
  transaction: Transaction,
  historicalTransactions: Transaction[],
  categories: Category[],
  config: Partial<AnomalyDetectionConfig> = {}
): DetectedAnomaly[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const anomalies: DetectedAnomaly[] = [];

  // Only check expenses
  if (transaction.type !== 'expense') {
    return anomalies;
  }

  // Filter historical data
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cfg.lookback_days);
  
  const relevantHistory = historicalTransactions.filter(t => 
    t.type === 'expense' && 
    new Date(t.date) >= cutoffDate &&
    t.id !== transaction.id
  );

  // 1. High amount anomaly (overall)
  const highAmountAnomaly = detectHighAmount(
    transaction, 
    relevantHistory, 
    cfg
  );
  if (highAmountAnomaly) {
    anomalies.push(highAmountAnomaly);
  }

  // 2. Category-specific anomaly
  if (transaction.category_id) {
    const categoryAnomaly = detectCategoryAnomaly(
      transaction,
      relevantHistory,
      cfg
    );
    if (categoryAnomaly) {
      anomalies.push(categoryAnomaly);
    }
  }

  // 3. Unusual category usage
  const unusualCategoryAnomaly = detectUnusualCategory(
    transaction,
    relevantHistory,
    categories,
    cfg
  );
  if (unusualCategoryAnomaly) {
    anomalies.push(unusualCategoryAnomaly);
  }

  // 4. Frequency anomaly (too many transactions in short period)
  const frequencyAnomaly = detectFrequencyAnomaly(
    transaction,
    historicalTransactions,
    cfg
  );
  if (frequencyAnomaly) {
    anomalies.push(frequencyAnomaly);
  }

  return anomalies;
}

/**
 * Analyze spending patterns for a period
 */
export function analyzeSpendingPatterns(
  transactions: Transaction[],
  config: Partial<AnomalyDetectionConfig> = {}
): {
  categoryAnomalies: DetectedAnomaly[];
  trendAnomalies: DetectedAnomaly[];
  overallAssessment: string;
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const categoryAnomalies: DetectedAnomaly[] = [];
  const trendAnomalies: DetectedAnomaly[] = [];

  const expenses = transactions.filter(t => t.type === 'expense');
  
  if (expenses.length < cfg.min_transactions) {
    return {
      categoryAnomalies: [],
      trendAnomalies: [],
      overallAssessment: 'Недостаточно данных для анализа'
    };
  }

  // Group by category
  const byCategory = groupByCategory(expenses);
  
  // Analyze each category
  for (const [categoryId, categoryTransactions] of Object.entries(byCategory)) {
    const amounts = categoryTransactions.map(t => t.amount);
    const trend = ML.analyzeTrend(amounts);
    
    // Check for significant increase
    if (trend.direction === 'up' && trend.change_percent > 30) {
      categoryAnomalies.push({
        type: 'unusual_category',
        severity: trend.change_percent > 50 ? 'alert' : 'warning',
        message: `Расходы в категории выросли на ${trend.change_percent}%`,
        details: {
          category: categoryId,
          deviation_percent: trend.change_percent,
          historical_average: trend.average
        }
      });
    }
  }

  // Overall spending trend
  const dailyExpenses = aggregateByDay(expenses);
  const overallTrend = ML.analyzeTrend(dailyExpenses.map(d => d.amount));
  
  if (overallTrend.direction === 'up' && overallTrend.change_percent > 20) {
    trendAnomalies.push({
      type: 'frequency',
      severity: 'warning',
      message: `Общие расходы выросли на ${overallTrend.change_percent}%`,
      details: {
        deviation_percent: overallTrend.change_percent,
        historical_average: overallTrend.average
      }
    });
  }

  // High volatility
  if (overallTrend.volatility > 0.5) {
    trendAnomalies.push({
      type: 'frequency',
      severity: 'info',
      message: 'Высокая нестабильность расходов',
      details: {
        deviation_percent: Math.round(overallTrend.volatility * 100)
      }
    });
  }

  // Overall assessment
  let overallAssessment: string;
  const totalAnomalies = categoryAnomalies.length + trendAnomalies.length;
  
  if (totalAnomalies === 0) {
    overallAssessment = 'Расходы в норме ✓';
  } else if (totalAnomalies <= 2) {
    overallAssessment = 'Есть незначительные отклонения';
  } else {
    overallAssessment = 'Требует внимания: обнаружены аномалии';
  }

  return {
    categoryAnomalies,
    trendAnomalies,
    overallAssessment
  };
}

// ============================================
// SPECIFIC ANOMALY DETECTORS
// ============================================

/**
 * Detect if transaction amount is unusually high
 */
function detectHighAmount(
  transaction: Transaction,
  history: Transaction[],
  config: AnomalyDetectionConfig
): DetectedAnomaly | null {
  const amounts = history.map(t => t.amount);
  
  if (amounts.length < config.min_transactions) {
    return null;
  }

  const result = ML.isAnomaly(
    transaction.amount, 
    amounts, 
    config.amount_threshold
  );

  if (!result.isAnomaly) {
    return null;
  }

  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const deviationPercent = ((transaction.amount - avg) / avg) * 100;

  // Determine severity
  let severity: AnomalySeverity;
  if (Math.abs(result.zScore) > 4) {
    severity = 'alert';
  } else if (Math.abs(result.zScore) > 3) {
    severity = 'warning';
  } else {
    severity = 'info';
  }

  return {
    type: 'high_amount',
    severity,
    message: `Сумма ${Math.round(deviationPercent)}% выше среднего`,
    details: {
      transaction_id: transaction.id,
      expected_value: Math.round(avg),
      actual_value: transaction.amount,
      z_score: result.zScore,
      historical_average: Math.round(avg),
      deviation_percent: Math.round(deviationPercent)
    }
  };
}

/**
 * Detect if spending in category is unusual
 */
function detectCategoryAnomaly(
  transaction: Transaction,
  history: Transaction[],
  config: AnomalyDetectionConfig
): DetectedAnomaly | null {
  // Filter by same category
  const categoryHistory = history.filter(
    t => t.category_id === transaction.category_id
  );

  if (categoryHistory.length < config.min_transactions) {
    return null;
  }

  const amounts = categoryHistory.map(t => t.amount);
  const iqrResult = ML.detectAnomaliesIQR(
    transaction.amount,
    amounts,
    config.iqr_multiplier
  );

  if (!iqrResult.isAnomaly) {
    return null;
  }

  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const category = transaction.category?.name || 'категории';

  return {
    type: 'unusual_category',
    severity: iqrResult.severity === 'extreme' ? 'alert' : 'warning',
    message: `Необычная сумма для "${category}"`,
    details: {
      transaction_id: transaction.id,
      category: category,
      expected_value: Math.round(avg),
      actual_value: transaction.amount,
      historical_average: Math.round(avg)
    }
  };
}

/**
 * Detect if category usage is unusual
 */
function detectUnusualCategory(
  transaction: Transaction,
  history: Transaction[],
  categories: Category[],
  config: AnomalyDetectionConfig
): DetectedAnomaly | null {
  if (!transaction.category_id) {
    return null;
  }

  // Count transactions per category
  const categoryCounts: Record<string, number> = {};
  history.forEach(t => {
    if (t.category_id) {
      categoryCounts[t.category_id] = (categoryCounts[t.category_id] || 0) + 1;
    }
  });

  const thisCount = categoryCounts[transaction.category_id] || 0;
  const totalTransactions = history.length;

  // If this category is used < 2% of the time, it's unusual
  if (totalTransactions > 20 && thisCount / totalTransactions < 0.02) {
    const category = categories.find(c => c.id === transaction.category_id);
    
    return {
      type: 'new_merchant',
      severity: 'info',
      message: `Редкая категория: "${category?.name || 'Неизвестная'}"`,
      details: {
        transaction_id: transaction.id,
        category: category?.name
      }
    };
  }

  return null;
}

/**
 * Detect unusual frequency of transactions
 */
function detectFrequencyAnomaly(
  transaction: Transaction,
  history: Transaction[],
  config: AnomalyDetectionConfig
): DetectedAnomaly | null {
  const transactionDate = new Date(transaction.date);
  
  // Count transactions in same day
  const sameDay = history.filter(t => {
    const d = new Date(t.date);
    return d.toDateString() === transactionDate.toDateString();
  });

  // Count transactions in same week
  const weekStart = new Date(transactionDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const sameWeek = history.filter(t => {
    const d = new Date(t.date);
    return d >= weekStart && d < weekEnd;
  });

  // Calculate average daily transactions
  const daysCovered = config.lookback_days;
  const avgDailyTransactions = history.length / daysCovered;

  // Too many transactions today?
  if (sameDay.length > 10 && sameDay.length > avgDailyTransactions * 3) {
    return {
      type: 'frequency',
      severity: 'warning',
      message: `${sameDay.length + 1} транзакций за день — больше обычного`,
      details: {
        actual_value: sameDay.length + 1,
        historical_average: Math.round(avgDailyTransactions)
      }
    };
  }

  return null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function groupByCategory(transactions: Transaction[]): Record<string, Transaction[]> {
  return transactions.reduce((acc, t) => {
    const key = t.category_id || 'uncategorized';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);
}

function aggregateByDay(transactions: Transaction[]): { date: string; amount: number }[] {
  const byDay: Record<string, number> = {};
  
  transactions.forEach(t => {
    const day = new Date(t.date).toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + t.amount;
  });

  return Object.entries(byDay)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================
// DATABASE INTEGRATION
// ============================================

/**
 * Create anomaly record for database
 */
export function createAnomalyRecord(
  familyId: string,
  transactionId: string | undefined,
  anomaly: DetectedAnomaly
): Omit<Anomaly, 'id' | 'created_at'> {
  return {
    family_id: familyId,
    transaction_id: transactionId,
    type: anomaly.type,
    severity: anomaly.severity,
    message: anomaly.message,
    details: anomaly.details,
    is_dismissed: false
  };
}

// ============================================
// EXPORTS
// ============================================

export const AnomalyService = {
  detectTransactionAnomalies,
  analyzeSpendingPatterns,
  createAnomalyRecord,
  DEFAULT_CONFIG
};

export default AnomalyService;
