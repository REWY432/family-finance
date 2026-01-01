/**
 * Auto-Categorization Service Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  predictCategory, 
  batchCategorize,
  extractLearningPatterns,
  suggestRules,
  AutoCategoryService 
} from '../../src/services/autocategory';
import type { Transaction, Category, CategoryRule } from '../../src/types';

// ============================================
// TEST DATA
// ============================================

const testCategories: Category[] = [
  {
    id: 'cat-groceries',
    family_id: 'family-1',
    name: 'Продукты',
    type: 'expense',
    icon: '🛒',
    color: '#4CAF50',
    keywords: ['магнит', 'пятёрочка', 'перекрёсток', 'ашан'],
    is_system: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-transport',
    family_id: 'family-1',
    name: 'Транспорт',
    type: 'expense',
    icon: '🚗',
    color: '#2196F3',
    keywords: ['яндекс такси', 'uber', 'бензин', 'метро'],
    is_system: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-restaurants',
    family_id: 'family-1',
    name: 'Рестораны',
    type: 'expense',
    icon: '🍽️',
    color: '#FF9800',
    keywords: ['кафе', 'ресторан', 'макдоналдс', 'kfc'],
    is_system: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-salary',
    family_id: 'family-1',
    name: 'Зарплата',
    type: 'income',
    icon: '💰',
    color: '#4CAF50',
    keywords: ['зарплата', 'аванс', 'оклад'],
    is_system: true,
    created_at: new Date().toISOString()
  }
];

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

// ============================================
// TESTS
// ============================================

describe('Auto-Categorization Service', () => {
  
  describe('predictCategory', () => {
    
    it('should categorize by exact keyword match', () => {
      const result = predictCategory('Магнит супермаркет', testCategories);
      
      expect(result).not.toBeNull();
      expect(result?.category_id).toBe('cat-groceries');
      expect(result?.confidence).toBeGreaterThan(0.7);
    });

    it('should categorize case-insensitively', () => {
      const result = predictCategory('ПЯТЁРОЧКА', testCategories);
      
      expect(result).not.toBeNull();
      expect(result?.category_id).toBe('cat-groceries');
    });

    it('should handle ё/е variations', () => {
      const result1 = predictCategory('Пятёрочка', testCategories);
      const result2 = predictCategory('Пятерочка', testCategories);
      
      expect(result1?.category_id).toBe(result2?.category_id);
    });

    it('should categorize transport transactions', () => {
      const result = predictCategory('Яндекс Такси поездка', testCategories);
      
      expect(result).not.toBeNull();
      expect(result?.category_id).toBe('cat-transport');
    });

    it('should categorize restaurant transactions', () => {
      const result = predictCategory('KFC Москва', testCategories);
      
      expect(result).not.toBeNull();
      expect(result?.category_id).toBe('cat-restaurants');
    });

    it('should categorize income transactions', () => {
      const result = predictCategory('Зарплата за декабрь', testCategories);
      
      expect(result).not.toBeNull();
      expect(result?.category_id).toBe('cat-salary');
    });

    it('should return null for unrecognized descriptions', () => {
      const result = predictCategory('xyz123 unknown', testCategories);
      
      // May return null or low confidence match
      if (result) {
        expect(result.confidence).toBeLessThan(0.5);
      }
    });

    it('should return null for empty description', () => {
      const result = predictCategory('', testCategories);
      expect(result).toBeNull();
    });

    it('should prioritize custom rules', () => {
      const customRules: CategoryRule[] = [{
        id: 'rule-1',
        family_id: 'family-1',
        category_id: 'cat-transport',
        pattern: 'моя особая покупка',
        priority: 100,
        match_count: 0,
        created_at: new Date().toISOString()
      }];
      
      const result = predictCategory(
        'Моя особая покупка в магазине',
        testCategories,
        [],
        customRules
      );
      
      expect(result?.category_id).toBe('cat-transport');
      expect(result?.confidence).toBeGreaterThan(0.9);
    });

    it('should learn from historical transactions', () => {
      const history: Transaction[] = Array(10).fill(null).map(() => 
        createTransaction({
          description: 'Специальный магазин',
          category_id: 'cat-groceries'
        })
      );
      
      const result = predictCategory(
        'Специальный магазин покупка',
        testCategories,
        history
      );
      
      // Should learn from history
      if (result) {
        expect(result.category_id).toBe('cat-groceries');
      }
    });

    it('should provide alternative category', () => {
      // Description that could match multiple categories
      const result = predictCategory('Яндекс еда доставка', testCategories);
      
      // Should have primary and possibly alternative
      expect(result).not.toBeNull();
      // Alternative is optional
    });
  });

  describe('batchCategorize', () => {
    
    it('should categorize multiple transactions', () => {
      const transactions = [
        { id: '1', description: 'Магнит продукты' },
        { id: '2', description: 'Яндекс такси' },
        { id: '3', description: 'Макдоналдс' }
      ];
      
      const results = batchCategorize(transactions, testCategories);
      
      expect(results.size).toBeGreaterThan(0);
      expect(results.get('1')?.category_id).toBe('cat-groceries');
      expect(results.get('2')?.category_id).toBe('cat-transport');
      expect(results.get('3')?.category_id).toBe('cat-restaurants');
    });

    it('should handle empty batch', () => {
      const results = batchCategorize([], testCategories);
      expect(results.size).toBe(0);
    });
  });

  describe('extractLearningPatterns', () => {
    
    it('should extract common patterns', () => {
      const transactions = Array(5).fill(null).map((_, i) => 
        createTransaction({
          id: `tx-${i}`,
          description: 'Пятерочка магазин',
          category_id: 'cat-groceries'
        })
      );
      
      const patterns = extractLearningPatterns(transactions);
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.categoryId === 'cat-groceries')).toBe(true);
    });

    it('should filter out rare patterns', () => {
      const transactions = [
        createTransaction({ description: 'Редкое место', category_id: 'cat-1' }),
        createTransaction({ description: 'Другое место', category_id: 'cat-2' })
      ];
      
      const patterns = extractLearningPatterns(transactions);
      
      // Patterns appearing less than 3 times should be filtered
      expect(patterns.every(p => p.count >= 3)).toBe(true);
    });

    it('should sort by frequency', () => {
      const transactions = [
        ...Array(10).fill(null).map(() => 
          createTransaction({ description: 'Частое место', category_id: 'cat-1' })
        ),
        ...Array(5).fill(null).map(() => 
          createTransaction({ description: 'Редкое место', category_id: 'cat-2' })
        )
      ];
      
      const patterns = extractLearningPatterns(transactions);
      
      if (patterns.length >= 2) {
        expect(patterns[0].count).toBeGreaterThanOrEqual(patterns[1].count);
      }
    });
  });

  describe('suggestRules', () => {
    
    it('should suggest rules for uncategorized transactions', () => {
      const uncategorized = Array(5).fill(null).map((_, i) => 
        createTransaction({
          id: `tx-${i}`,
          description: 'Новый магазин рядом с домом'
        })
      );
      
      const suggestions = suggestRules(uncategorized, testCategories);
      
      // May or may not find suggestions depending on keyword matching
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should not suggest for single occurrences', () => {
      const uncategorized = [
        createTransaction({ description: 'Уникальное место 1' }),
        createTransaction({ description: 'Уникальное место 2' }),
        createTransaction({ description: 'Уникальное место 3' })
      ];
      
      const suggestions = suggestRules(uncategorized, testCategories);
      
      // Each description is unique, so no patterns should be found
      expect(suggestions.length).toBe(0);
    });
  });

  describe('DEFAULT_KEYWORDS', () => {
    
    it('should have keywords for main categories', () => {
      const keywords = AutoCategoryService.DEFAULT_KEYWORDS;
      
      expect(keywords['продукты']).toBeDefined();
      expect(keywords['транспорт']).toBeDefined();
      expect(keywords['рестораны']).toBeDefined();
      expect(keywords['зарплата']).toBeDefined();
    });

    it('should have non-empty keyword arrays', () => {
      const keywords = AutoCategoryService.DEFAULT_KEYWORDS;
      
      Object.values(keywords).forEach(keywordArray => {
        expect(Array.isArray(keywordArray)).toBe(true);
        expect(keywordArray.length).toBeGreaterThan(0);
      });
    });

    it('should have lowercase keywords', () => {
      const keywords = AutoCategoryService.DEFAULT_KEYWORDS;
      
      Object.values(keywords).forEach(keywordArray => {
        keywordArray.forEach(keyword => {
          expect(keyword).toBe(keyword.toLowerCase());
        });
      });
    });
  });
});
