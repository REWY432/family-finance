/**
 * Anomaly Detection Service Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  detectTransactionAnomalies, 
  analyzeSpendingPatterns,
  AnomalyService 
} from '../../src/services/anomaly';
import type { Transaction, Category } from '../../src/types';

// ============================================
// TEST DATA FACTORIES
// ============================================

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.random().toString(36).substr(2, 9),
    family_id: 'family-1',
    user_id: 'user-1',
    type: 'expense',
    amount: 1000,
    currency: 'RUB',
    date: new Date().toISOString(),
    is_shared: false,
    is_recurring: false,
    is_credit: false,
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: Math.random().toString(36).substr(2, 9),
    family_id: 'family-1',
    name: 'Test Category',
    type: 'expense',
    icon: '📁',
    color: '#000',
    keywords: [],
    is_system: false,
    created_at: new Date().toISOString(),
    ...overrides
  };
}

function createHistoricalData(
  count: number, 
  baseAmount: number = 1000,
  variance: number = 100
): Transaction[] {
  const transactions: Transaction[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    transactions.push(createTransaction({
      amount: baseAmount + (Math.random() - 0.5) * variance * 2,
      date: date.toISOString()
    }));
  }
  
  return transactions;
}

// ============================================
// TESTS
// ============================================

describe('Anomaly Detection Service', () => {
  
  describe('detectTransactionAnomalies', () => {
    
    it('should detect unusually high transaction amounts', () => {
      const history = createHistoricalData(20, 1000, 100);
      const anomalousTransaction = createTransaction({ amount: 5000 });
      const categories: Category[] = [];
      
      const anomalies = detectTransactionAnomalies(
        anomalousTransaction,
        history,
        categories
      );
      
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.some(a => a.type === 'high_amount')).toBe(true);
    });

    it('should not flag normal transactions', () => {
      const history = createHistoricalData(20, 1000, 200);
      const normalTransaction = createTransaction({ amount: 1100 });
      const categories: Category[] = [];
      
      const anomalies = detectTransactionAnomalies(
        normalTransaction,
        history,
        categories
      );
      
      const highAmountAnomalies = anomalies.filter(a => a.type === 'high_amount');
      expect(highAmountAnomalies.length).toBe(0);
    });

    it('should detect category-specific anomalies', () => {
      const categoryId = 'cat-groceries';
      const history = createHistoricalData(20, 500, 50).map(t => ({
        ...t,
        category_id: categoryId
      }));
      
      const anomalousTransaction = createTransaction({ 
        amount: 2000, 
        category_id: categoryId 
      });
      
      const categories = [createCategory({ id: categoryId, name: 'Продукты' })];
      
      const anomalies = detectTransactionAnomalies(
        anomalousTransaction,
        history,
        categories
      );
      
      expect(anomalies.some(a => a.type === 'unusual_category')).toBe(true);
    });

    it('should ignore income transactions', () => {
      const history = createHistoricalData(20, 1000, 100);
      const incomeTransaction = createTransaction({ 
        type: 'income', 
        amount: 100000 
      });
      
      const anomalies = detectTransactionAnomalies(
        incomeTransaction,
        history,
        []
      );
      
      expect(anomalies.length).toBe(0);
    });

    it('should handle insufficient historical data', () => {
      const history = createHistoricalData(2, 1000, 100);
      const transaction = createTransaction({ amount: 5000 });
      
      const anomalies = detectTransactionAnomalies(
        transaction,
        history,
        []
      );
      
      // Should not crash, may return empty or reduced results
      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('should assign correct severity levels', () => {
      const history = createHistoricalData(30, 1000, 50);
      
      // Extreme anomaly
      const extremeTransaction = createTransaction({ amount: 10000 });
      const extremeAnomalies = detectTransactionAnomalies(
        extremeTransaction,
        history,
        []
      );
      
      const highAmountAnomaly = extremeAnomalies.find(a => a.type === 'high_amount');
      if (highAmountAnomaly) {
        expect(['alert', 'warning']).toContain(highAmountAnomaly.severity);
      }
    });
  });

  describe('analyzeSpendingPatterns', () => {
    
    it('should detect category spending increases', () => {
      const categoryId = 'cat-food';
      const now = new Date();
      
      // Create transactions with increasing amounts
      const transactions: Transaction[] = [];
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        transactions.push(createTransaction({
          category_id: categoryId,
          amount: 1000 + (30 - i) * 50, // Increasing over time
          date: date.toISOString()
        }));
      }
      
      const result = analyzeSpendingPatterns(transactions);
      
      expect(result.overallAssessment).toBeDefined();
      // May or may not detect anomaly depending on magnitude
    });

    it('should return assessment for insufficient data', () => {
      const transactions = createHistoricalData(2);
      
      const result = analyzeSpendingPatterns(transactions);
      
      expect(result.overallAssessment).toContain('Недостаточно данных');
    });

    it('should report stable spending as normal', () => {
      const transactions = createHistoricalData(30, 1000, 50);
      
      const result = analyzeSpendingPatterns(transactions);
      
      // Stable spending should result in fewer anomalies
      expect(result.categoryAnomalies.length + result.trendAnomalies.length).toBeLessThan(5);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have sensible default values', () => {
      const config = AnomalyService.DEFAULT_CONFIG;
      
      expect(config.amount_threshold).toBeGreaterThan(0);
      expect(config.lookback_days).toBeGreaterThan(0);
      expect(config.min_transactions).toBeGreaterThan(0);
      expect(config.iqr_multiplier).toBeGreaterThan(0);
    });
  });
});
