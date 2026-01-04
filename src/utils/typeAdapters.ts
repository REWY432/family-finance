/**
 * Type adapters for converting between App types and Service types
 */

import type { Transaction, Category, Budget, Goal } from '../types';
import type { AppTransaction, AppCategory, AppUser } from '../lib/supabase';

/**
 * Convert AppCategory to Category
 */
export function appCategoryToCategory(
  appCategory: AppCategory,
  familyId: string = 'default'
): Category {
  return {
    id: appCategory.id,
    family_id: familyId,
    name: appCategory.name,
    type: appCategory.type,
    icon: appCategory.icon,
    color: appCategory.color,
    keywords: [], // AppCategory doesn't have keywords
    is_system: false,
    created_at: new Date().toISOString(),
    parent_id: undefined
  };
}

/**
 * Convert AppTransaction to Transaction
 */
export function appTransactionToTransaction(
  appTx: AppTransaction,
  familyId: string = 'default'
): Transaction {
  return {
    id: appTx.id,
    family_id: familyId,
    user_id: appTx.user_id,
    type: appTx.type,
    amount: appTx.amount,
    currency: 'RUB',
    description: appTx.description,
    date: appTx.date,
    is_shared: appTx.is_shared,
    is_recurring: false,
    is_credit: appTx.is_credit,
    category_id: undefined, // We'll need to find by name
    account_id: undefined,
    tags: [],
    created_at: appTx.created_at,
    updated_at: appTx.created_at
  };
}

/**
 * Find category ID by name
 */
export function findCategoryIdByName(
  categoryName: string,
  categories: AppCategory[]
): string | undefined {
  return categories.find(c => c.name === categoryName)?.id;
}

