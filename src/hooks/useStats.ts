import { useMemo } from 'react';
import { AppTransaction, AppUser } from '../lib/supabase';

interface UserStats {
  income: number;
  expense: number;
  shared: number;
}

export interface Stats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  sharedExpense: number;
  creditExpense: number;
  debt: number;
  byUser: Record<string, UserStats>;
  dailyAverage: number;
  daysInMonth: number;
  remainingDays: number;
  projectedMonthlyExpense: number;
}

function isCurrentMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export function useStats(transactions: AppTransaction[], users: AppUser[]): Stats {
  return useMemo(() => {
    const currentMonth = transactions.filter(t => isCurrentMonth(t.date));
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const remainingDays = daysInMonth - currentDay;
    
    const byUser: Record<string, UserStats> = {};
    users.forEach(u => {
      byUser[u.id] = { income: 0, expense: 0, shared: 0 };
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let sharedExpense = 0;
    let creditExpense = 0;

    currentMonth.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
        if (byUser[t.user_id]) byUser[t.user_id].income += t.amount;
      } else {
        totalExpense += t.amount;
        if (byUser[t.user_id]) byUser[t.user_id].expense += t.amount;
        if (t.is_shared) {
          sharedExpense += t.amount;
          if (byUser[t.user_id]) byUser[t.user_id].shared += t.amount;
        }
        if (t.is_credit) creditExpense += t.amount;
      }
    });

    const dailyAverage = currentDay > 0 ? totalExpense / currentDay : 0;
    const projectedMonthlyExpense = dailyAverage * daysInMonth;

    // Calculate debt
    const fairShare = sharedExpense / 2;
    const user0Shared = byUser[users[0]?.id]?.shared || 0;
    const debt = user0Shared - fairShare;

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      sharedExpense,
      creditExpense,
      debt,
      byUser,
      dailyAverage,
      daysInMonth,
      remainingDays,
      projectedMonthlyExpense
    };
  }, [transactions, users]);
}

