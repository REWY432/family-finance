/**
 * Auto-Categorization Service
 * Automatically categorizes transactions based on description and patterns
 */

import type { 
  Category, 
  Transaction, 
  CategoryPrediction,
  CategoryRule 
} from '../types';

// ============================================
// TYPES
// ============================================

interface MatchResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  matchedKeyword?: string;
  matchType: 'keyword' | 'pattern' | 'history' | 'fuzzy';
}

interface LearningData {
  description: string;
  categoryId: string;
  count: number;
}

// ============================================
// DEFAULT KEYWORDS (Russian)
// ============================================

const DEFAULT_KEYWORDS: Record<string, string[]> = {
  // Groceries
  'продукты': [
    'магнит', 'пятёрочка', 'пятерочка', 'перекрёсток', 'перекресток', 
    'ашан', 'лента', 'дикси', 'вкусвилл', 'азбука вкуса', 'metro', 
    'окей', 'карусель', 'супермаркет', 'продукты', 'гипермаркет',
    'spar', 'билла', 'billa', 'fixprice', 'фикспрайс'
  ],
  
  // Transport
  'транспорт': [
    'яндекс такси', 'uber', 'gett', 'ситимобил', 'такси', 'метро',
    'бензин', 'азс', 'лукойл', 'газпром', 'роснефть', 'shell', 'bp',
    'парковка', 'мойка', 'автомойка', 'шиномонтаж', 'автосервис',
    'ржд', 'аэрофлот', 's7', 'победа', 'билет', 'каршеринг',
    'яндекс драйв', 'делимобиль', 'belka', 'трансп'
  ],
  
  // Restaurants & Food delivery
  'рестораны': [
    'кафе', 'ресторан', 'бар', 'пиццерия', 'суши', 'бургер',
    'макдоналдс', 'mcdonalds', 'kfc', 'бургер кинг', 'burger king',
    'subway', 'pizza', 'пицца', 'coffee', 'кофе', 'starbucks',
    'якитория', 'тануки', 'delivery club', 'яндекс еда', 'самокат',
    'сбермаркет', 'доставка еды'
  ],
  
  // Entertainment
  'развлечения': [
    'кино', 'cinema', 'театр', 'концерт', 'музей', 'выставка',
    'netflix', 'spotify', 'youtube', 'apple music', 'подписка',
    'steam', 'playstation', 'xbox', 'игра', 'game', 'кинопоиск',
    'иви', 'okko', 'premier', 'more.tv', 'билет'
  ],
  
  // Clothing
  'одежда': [
    'zara', 'h&m', 'hm', 'uniqlo', 'reserved', 'massimo dutti',
    'bershka', 'pull&bear', 'mango', 'одежда', 'обувь', 'adidas',
    'nike', 'puma', 'reebok', 'спортмастер', 'декатлон', 'rendez-vous',
    'ecco', 'kari', 'respect', 'wildberries', 'lamoda', 'wb'
  ],
  
  // Health
  'здоровье': [
    'аптека', 'pharmacy', 'лекарство', 'витамины', 'клиника',
    'поликлиника', 'врач', 'доктор', 'анализы', 'стоматолог',
    'госртолог', 'окулист', 'медицинский', 'здоровье', 'медси',
    'инвитро', 'гемотест', 'лаборатория'
  ],
  
  // Utilities & Housing
  'коммуналка': [
    'жкх', 'квартплата', 'электричество', 'газ', 'вода', 'отопление',
    'интернет', 'телефон', 'мобильная связь', 'мтс', 'билайн', 
    'мегафон', 'теле2', 'tele2', 'ростелеком', 'аренда', 'rent'
  ],
  
  // Education
  'образование': [
    'курс', 'обучение', 'школа', 'университет', 'книга', 'учебник',
    'skillbox', 'geekbrains', 'нетология', 'coursera', 'udemy',
    'литрес', 'книжный', 'библиотека'
  ],
  
  // Beauty
  'красота': [
    'салон', 'парикмахерская', 'барбершоп', 'маникюр', 'педикюр',
    'spa', 'спа', 'массаж', 'косметика', 'л\'этуаль', 'letual',
    'рив гош', 'иль де ботэ', 'золотое яблоко', 'sephora'
  ],
  
  // Income categories
  'зарплата': [
    'зарплата', 'зп', 'аванс', 'оклад', 'премия', 'бонус', 'salary'
  ],
  
  'фриланс': [
    'фриланс', 'freelance', 'проект', 'заказ', 'контракт', 'гонорар'
  ],
  
  'кэшбэк': [
    'кэшбэк', 'cashback', 'возврат', 'refund', 'бонусы'
  ]
};

// ============================================
// MAIN CATEGORIZATION FUNCTION
// ============================================

/**
 * Predict category for a transaction
 */
export function predictCategory(
  description: string,
  categories: Category[],
  historicalTransactions: Transaction[] = [],
  customRules: CategoryRule[] = []
): CategoryPrediction | null {
  if (!description || description.trim().length === 0) {
    return null;
  }

  const normalizedDesc = normalizeText(description);
  const matches: MatchResult[] = [];

  // 1. Check custom rules first (highest priority)
  for (const rule of customRules.sort((a, b) => b.priority - a.priority)) {
    if (matchesPattern(normalizedDesc, rule.pattern)) {
      const category = categories.find(c => c.id === rule.category_id);
      if (category) {
        matches.push({
          categoryId: category.id,
          categoryName: category.name,
          confidence: 0.95,
          matchedKeyword: rule.pattern,
          matchType: 'pattern'
        });
        break; // Custom rules are definitive
      }
    }
  }

  // 2. Check category keywords
  for (const category of categories) {
    const keywords = category.keywords || [];
    for (const keyword of keywords) {
      if (normalizedDesc.includes(normalizeText(keyword))) {
        matches.push({
          categoryId: category.id,
          categoryName: category.name,
          confidence: 0.85,
          matchedKeyword: keyword,
          matchType: 'keyword'
        });
        break;
      }
    }
  }

  // 3. Check default keywords
  for (const [categoryName, keywords] of Object.entries(DEFAULT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedDesc.includes(normalizeText(keyword))) {
        const category = categories.find(
          c => normalizeText(c.name) === normalizeText(categoryName)
        );
        if (category && !matches.find(m => m.categoryId === category.id)) {
          matches.push({
            categoryId: category.id,
            categoryName: category.name,
            confidence: 0.75,
            matchedKeyword: keyword,
            matchType: 'keyword'
          });
        }
        break;
      }
    }
  }

  // 4. Learn from historical data
  const historicalMatch = findHistoricalMatch(
    normalizedDesc, 
    historicalTransactions,
    categories
  );
  if (historicalMatch) {
    matches.push(historicalMatch);
  }

  // 5. Fuzzy matching as fallback
  if (matches.length === 0) {
    const fuzzyMatch = fuzzyMatchCategory(normalizedDesc, categories);
    if (fuzzyMatch) {
      matches.push(fuzzyMatch);
    }
  }

  // No matches found
  if (matches.length === 0) {
    return null;
  }

  // Sort by confidence and return best match
  matches.sort((a, b) => b.confidence - a.confidence);
  const best = matches[0];
  const alternative = matches[1];

  return {
    category_id: best.categoryId,
    category_name: best.categoryName,
    confidence: best.confidence,
    alternative: alternative ? {
      category_id: alternative.categoryId,
      category_name: alternative.categoryName,
      confidence: alternative.confidence
    } : undefined
  };
}

/**
 * Batch categorize transactions
 */
export function batchCategorize(
  transactions: Array<{ id: string; description: string }>,
  categories: Category[],
  historicalTransactions: Transaction[] = [],
  customRules: CategoryRule[] = []
): Map<string, CategoryPrediction> {
  const results = new Map<string, CategoryPrediction>();

  for (const tx of transactions) {
    const prediction = predictCategory(
      tx.description,
      categories,
      historicalTransactions,
      customRules
    );
    
    if (prediction) {
      results.set(tx.id, prediction);
    }
  }

  return results;
}

// ============================================
// LEARNING FROM HISTORY
// ============================================

/**
 * Find matching category from historical transactions
 */
function findHistoricalMatch(
  description: string,
  transactions: Transaction[],
  categories: Category[]
): MatchResult | null {
  // Group similar descriptions
  const descriptionCounts: Record<string, Record<string, number>> = {};

  for (const tx of transactions) {
    if (!tx.description || !tx.category_id) continue;
    
    const normalized = normalizeText(tx.description);
    
    // Check if descriptions are similar
    if (areSimilar(description, normalized)) {
      if (!descriptionCounts[normalized]) {
        descriptionCounts[normalized] = {};
      }
      descriptionCounts[normalized][tx.category_id] = 
        (descriptionCounts[normalized][tx.category_id] || 0) + 1;
    }
  }

  // Find most common category for similar descriptions
  let bestMatch: { categoryId: string; count: number } | null = null;
  let totalCount = 0;

  for (const counts of Object.values(descriptionCounts)) {
    for (const [categoryId, count] of Object.entries(counts)) {
      totalCount += count;
      if (!bestMatch || count > bestMatch.count) {
        bestMatch = { categoryId, count };
      }
    }
  }

  if (!bestMatch || bestMatch.count < 2) {
    return null;
  }

  const category = categories.find(c => c.id === bestMatch!.categoryId);
  if (!category) return null;

  // Confidence based on how often this description was categorized this way
  const confidence = Math.min(0.9, 0.5 + (bestMatch.count / totalCount) * 0.4);

  return {
    categoryId: category.id,
    categoryName: category.name,
    confidence,
    matchType: 'history'
  };
}

/**
 * Extract learning patterns from transactions
 */
export function extractLearningPatterns(
  transactions: Transaction[]
): LearningData[] {
  const patterns: Record<string, { categoryId: string; count: number }> = {};

  for (const tx of transactions) {
    if (!tx.description || !tx.category_id) continue;
    
    const normalized = normalizeText(tx.description);
    
    // Extract keywords (2+ word combinations)
    const words = normalized.split(/\s+/).filter(w => w.length > 2);
    
    for (let i = 0; i < words.length; i++) {
      // Single word patterns
      const key1 = words[i];
      if (key1.length >= 4) {
        if (!patterns[key1]) {
          patterns[key1] = { categoryId: tx.category_id, count: 0 };
        }
        if (patterns[key1].categoryId === tx.category_id) {
          patterns[key1].count++;
        }
      }
      
      // Two word patterns
      if (i < words.length - 1) {
        const key2 = `${words[i]} ${words[i + 1]}`;
        if (!patterns[key2]) {
          patterns[key2] = { categoryId: tx.category_id, count: 0 };
        }
        if (patterns[key2].categoryId === tx.category_id) {
          patterns[key2].count++;
        }
      }
    }
  }

  // Filter to patterns that appeared at least 3 times
  return Object.entries(patterns)
    .filter(([_, data]) => data.count >= 3)
    .map(([description, data]) => ({
      description,
      categoryId: data.categoryId,
      count: data.count
    }))
    .sort((a, b) => b.count - a.count);
}

// ============================================
// FUZZY MATCHING
// ============================================

/**
 * Fuzzy match against category names
 */
function fuzzyMatchCategory(
  description: string,
  categories: Category[]
): MatchResult | null {
  let bestMatch: { category: Category; score: number } | null = null;

  for (const category of categories) {
    const score = calculateSimilarity(description, normalizeText(category.name));
    
    if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { category, score };
    }
  }

  if (!bestMatch) return null;

  return {
    categoryId: bestMatch.category.id,
    categoryName: bestMatch.category.name,
    confidence: bestMatch.score * 0.6, // Lower confidence for fuzzy
    matchType: 'fuzzy'
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^a-zа-я0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if text matches pattern (supports wildcards)
 */
function matchesPattern(text: string, pattern: string): boolean {
  // Convert simple wildcards to regex
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '.*')
    .replace(/\\\?/g, '.');
  
  try {
    const regex = new RegExp(regexPattern, 'i');
    return regex.test(text);
  } catch {
    return text.includes(pattern);
  }
}

/**
 * Check if two strings are similar
 */
function areSimilar(a: string, b: string, threshold: number = 0.7): boolean {
  // Quick check for contains
  if (a.includes(b) || b.includes(a)) return true;
  
  // Levenshtein-based similarity
  return calculateSimilarity(a, b) >= threshold;
}

/**
 * Calculate similarity between two strings (0-1)
 * Using Sørensen–Dice coefficient for better performance
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Create bigrams
  const bigramsA = new Set<string>();
  const bigramsB = new Set<string>();

  for (let i = 0; i < a.length - 1; i++) {
    bigramsA.add(a.substring(i, i + 2));
  }
  
  for (let i = 0; i < b.length - 1; i++) {
    bigramsB.add(b.substring(i, i + 2));
  }

  // Count intersection
  let intersection = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) {
      intersection++;
    }
  }

  // Dice coefficient
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

// ============================================
// RULE MANAGEMENT
// ============================================

/**
 * Create a new categorization rule
 */
export function createRule(
  familyId: string,
  categoryId: string,
  pattern: string,
  priority: number = 0
): Omit<CategoryRule, 'id' | 'created_at'> {
  return {
    family_id: familyId,
    category_id: categoryId,
    pattern: normalizeText(pattern),
    priority,
    match_count: 0
  };
}

/**
 * Suggest rules based on uncategorized transactions
 */
export function suggestRules(
  uncategorizedTransactions: Transaction[],
  categories: Category[]
): Array<{ pattern: string; suggestedCategory: Category; confidence: number }> {
  const suggestions: Array<{ 
    pattern: string; 
    suggestedCategory: Category; 
    confidence: number 
  }> = [];

  // Group by normalized description
  const grouped: Record<string, Transaction[]> = {};
  
  for (const tx of uncategorizedTransactions) {
    if (!tx.description) continue;
    const normalized = normalizeText(tx.description);
    
    // Extract main keywords
    const words = normalized.split(/\s+/).filter(w => w.length > 3);
    const key = words.slice(0, 2).join(' ');
    
    if (key) {
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tx);
    }
  }

  // Suggest patterns that appear multiple times
  for (const [pattern, transactions] of Object.entries(grouped)) {
    if (transactions.length < 2) continue;

    // Try to predict category based on pattern
    const prediction = predictCategory(pattern, categories);
    
    if (prediction && prediction.confidence > 0.5) {
      const category = categories.find(c => c.id === prediction.category_id);
      if (category) {
        suggestions.push({
          pattern,
          suggestedCategory: category,
          confidence: prediction.confidence
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// ============================================
// EXPORTS
// ============================================

export const AutoCategoryService = {
  predictCategory,
  batchCategorize,
  extractLearningPatterns,
  createRule,
  suggestRules,
  DEFAULT_KEYWORDS
};

export default AutoCategoryService;
