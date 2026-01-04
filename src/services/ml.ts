/**
 * ML Service
 * Simple machine learning utilities for financial forecasting
 */

import type { LinearRegressionResult, Forecast, TrendAnalysis } from '../types';

// ============================================
// LINEAR REGRESSION
// ============================================

/**
 * Simple linear regression using least squares method
 * y = mx + b
 */
export function linearRegression(
  xValues: number[],
  yValues: number[]
): LinearRegressionResult {
  if (xValues.length !== yValues.length || xValues.length < 2) {
    throw new Error('Arrays must have equal length and at least 2 points');
  }

  const n = xValues.length;
  
  // Calculate means
  const xMean = xValues.reduce((a, b) => a + b, 0) / n;
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;
  
  // Calculate slope (m) and intercept (b)
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Calculate R² (coefficient of determination)
  const yPredicted = xValues.map(x => slope * x + intercept);
  const ssRes = yValues.reduce((sum, y, i) => sum + (y - yPredicted[i]) ** 2, 0);
  const ssTot = yValues.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
  
  // Predict next value (x = n)
  const prediction = slope * n + intercept;
  
  // Confidence based on R² and sample size
  const confidence = Math.min(0.95, Math.max(0.1, rSquared * (1 - 1 / n)));
  
  return {
    slope,
    intercept,
    r_squared: rSquared,
    prediction: Math.max(0, prediction), // Don't predict negative values
    confidence
  };
}

/**
 * Predict value at given x
 */
export function predict(
  regression: LinearRegressionResult,
  x: number
): number {
  return Math.max(0, regression.slope * x + regression.intercept);
}

// ============================================
// FORECASTING
// ============================================

/**
 * Generate expense forecast for next N periods
 */
export function forecastExpenses(
  historicalData: { date: Date; amount: number }[],
  periodsAhead: number = 3
): Forecast[] {
  if (historicalData.length < 3) {
    return [];
  }

  // Sort by date
  const sorted = [...historicalData].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Convert to x,y pairs (x = period index, y = amount)
  const xValues = sorted.map((_, i) => i);
  const yValues = sorted.map(d => d.amount);

  const regression = linearRegression(xValues, yValues);
  
  // Calculate standard deviation for confidence intervals
  const stdDev = calculateStdDev(yValues);
  
  const forecasts: Forecast[] = [];
  const lastDate = sorted[sorted.length - 1].date;
  
  for (let i = 1; i <= periodsAhead; i++) {
    const x = xValues.length - 1 + i;
    const predicted = predict(regression, x);
    
    // Wider confidence interval for further predictions
    const confidenceMultiplier = 1 + (i * 0.1);
    const margin = stdDev * confidenceMultiplier;
    
    // Calculate future date (assuming monthly periods)
    const futureDate = new Date(lastDate);
    futureDate.setMonth(futureDate.getMonth() + i);
    
    forecasts.push({
      date: futureDate.toISOString().split('T')[0],
      predicted_expense: Math.round(predicted),
      predicted_income: 0, // Separate calculation needed
      confidence_low: Math.max(0, Math.round(predicted - margin)),
      confidence_high: Math.round(predicted + margin)
    });
  }
  
  return forecasts;
}

/**
 * Forecast with seasonality adjustment
 */
export function forecastWithSeasonality(
  monthlyData: { month: string; expense: number }[],
  targetMonth: number // 0-11
): number {
  if (monthlyData.length < 12) {
    // Not enough data for seasonality
    const avg = monthlyData.reduce((s, d) => s + d.expense, 0) / monthlyData.length;
    return Math.round(avg);
  }

  // Calculate seasonal indices
  const monthlyAverages: number[] = Array(12).fill(0);
  const monthCounts: number[] = Array(12).fill(0);
  
  monthlyData.forEach(d => {
    const month = new Date(d.month + '-01').getMonth();
    monthlyAverages[month] += d.expense;
    monthCounts[month]++;
  });
  
  // Calculate seasonal factor for each month
  const overallAverage = monthlyData.reduce((s, d) => s + d.expense, 0) / monthlyData.length;
  const seasonalFactors = monthlyAverages.map((total, i) => 
    monthCounts[i] > 0 ? (total / monthCounts[i]) / overallAverage : 1
  );
  
  // Get trend from recent data
  const recentData = monthlyData.slice(-6);
  const xValues = recentData.map((_, i) => i);
  const yValues = recentData.map(d => d.expense);
  
  const regression = linearRegression(xValues, yValues);
  const trendPrediction = predict(regression, xValues.length);
  
  // Apply seasonal adjustment
  const seasonalFactor = seasonalFactors[targetMonth] || 1;
  
  return Math.round(trendPrediction * seasonalFactor);
}

// ============================================
// TREND ANALYSIS
// ============================================

/**
 * Analyze trend in data series
 */
export function analyzeTrend(values: number[]): TrendAnalysis {
  if (values.length < 2) {
    return {
      direction: 'stable',
      change_percent: 0,
      average: values[0] || 0,
      min: values[0] || 0,
      max: values[0] || 0,
      volatility: 0
    };
  }

  const xValues = values.map((_, i) => i);
  const regression = linearRegression(xValues, values);
  
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const volatility = calculateStdDev(values) / average; // Coefficient of variation
  
  // Calculate overall change
  const firstHalfAvg = values.slice(0, Math.floor(values.length / 2))
    .reduce((a, b) => a + b, 0) / Math.floor(values.length / 2);
  const secondHalfAvg = values.slice(Math.floor(values.length / 2))
    .reduce((a, b) => a + b, 0) / Math.ceil(values.length / 2);
  
  const changePercent = firstHalfAvg !== 0 
    ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 
    : 0;
  
  // Determine direction based on slope significance
  let direction: 'up' | 'down' | 'stable';
  const slopeSignificance = Math.abs(regression.slope) / average;
  
  if (slopeSignificance < 0.02 || regression.r_squared < 0.3) {
    direction = 'stable';
  } else if (regression.slope > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }
  
  return {
    direction,
    change_percent: Math.round(changePercent * 10) / 10,
    average: Math.round(average),
    min,
    max,
    volatility: Math.round(volatility * 100) / 100
  };
}

// ============================================
// ANOMALY DETECTION
// ============================================

/**
 * Detect if a value is anomalous using Z-score
 */
export function isAnomaly(
  value: number,
  historicalValues: number[],
  threshold: number = 2.5 // Number of standard deviations
): { isAnomaly: boolean; zScore: number; expectedRange: [number, number] } {
  if (historicalValues.length < 5) {
    return { isAnomaly: false, zScore: 0, expectedRange: [0, Infinity] };
  }

  const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
  const stdDev = calculateStdDev(historicalValues);
  
  if (stdDev === 0) {
    return { 
      isAnomaly: value !== mean, 
      zScore: value === mean ? 0 : Infinity,
      expectedRange: [mean, mean]
    };
  }
  
  const zScore = (value - mean) / stdDev;
  
  return {
    isAnomaly: Math.abs(zScore) > threshold,
    zScore: Math.round(zScore * 100) / 100,
    expectedRange: [
      Math.round(mean - threshold * stdDev),
      Math.round(mean + threshold * stdDev)
    ]
  };
}

/**
 * Detect anomalies using Interquartile Range (IQR)
 * More robust to outliers than Z-score
 */
export function detectAnomaliesIQR(
  value: number,
  historicalValues: number[],
  multiplier: number = 1.5
): { isAnomaly: boolean; severity: 'mild' | 'extreme' | 'none' } {
  if (historicalValues.length < 4) {
    return { isAnomaly: false, severity: 'none' };
  }

  const sorted = [...historicalValues].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;
  const extremeLower = q1 - 3 * iqr;
  const extremeUpper = q3 + 3 * iqr;
  
  if (value < extremeLower || value > extremeUpper) {
    return { isAnomaly: true, severity: 'extreme' };
  } else if (value < lowerBound || value > upperBound) {
    return { isAnomaly: true, severity: 'mild' };
  }
  
  return { isAnomaly: false, severity: 'none' };
}

// ============================================
// MOVING AVERAGES
// ============================================

/**
 * Simple Moving Average
 */
export function movingAverage(values: number[], window: number): number[] {
  if (values.length < window) {
    return values.map(() => values.reduce((a, b) => a + b, 0) / values.length);
  }

  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      // Not enough data yet, use what we have
      const slice = values.slice(0, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    } else {
      const slice = values.slice(i - window + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / window);
    }
  }
  
  return result.map(v => Math.round(v));
}

/**
 * Exponential Moving Average
 * More weight to recent values
 */
export function exponentialMovingAverage(
  values: number[],
  alpha: number = 0.3 // Smoothing factor (0-1), higher = more weight to recent
): number[] {
  if (values.length === 0) return [];
  
  const result: number[] = [values[0]];
  
  for (let i = 1; i < values.length; i++) {
    const ema = alpha * values[i] + (1 - alpha) * result[i - 1];
    result.push(Math.round(ema));
  }
  
  return result;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  
  return Math.sqrt(avgSquaredDiff);
}

function percentile(sortedValues: number[], p: number): number {
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sortedValues[lower];
  }
  
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

// ============================================
// EXPORTS
// ============================================

export const ML = {
  linearRegression,
  predict,
  forecastExpenses,
  forecastWithSeasonality,
  analyzeTrend,
  isAnomaly,
  detectAnomaliesIQR,
  movingAverage,
  exponentialMovingAverage
};

export default ML;
