import { memo } from 'react';
import { AppUser, AppTransaction, AppCategory, AppBudget, AppGoal } from '../../lib/supabase';
import { Stats } from '../../hooks/useStats';
import { BalanceCard } from './BalanceCard';
import { HealthCard } from './HealthCard';
import { UserStatsCard } from './UserStatsCard';
import { DebtCard } from './DebtCard';
import { RecentTransactions } from './RecentTransactions';
import { PurchaseCalculator } from '../Calculator/PurchaseCalculator';
import { SpendingHabits } from '../Habits/SpendingHabits';

interface DashboardTabProps {
  stats: Stats;
  users: AppUser[];
  transactions: AppTransaction[];
  categories: AppCategory[];
  budgets: AppBudget[];
  goals: AppGoal[];
}

export const DashboardTab = memo(function DashboardTab({ 
  stats, 
  users, 
  transactions, 
  categories,
  budgets,
  goals 
}: DashboardTabProps) {
  return (
    <div className="tab-content dashboard-content">
      <BalanceCard stats={stats} />
      
      <HealthCard 
        transactions={transactions}
        categories={categories}
        budgets={budgets}
        goals={goals}
      />
      
      <UserStatsCard users={users} stats={stats} />
      
      <DebtCard debt={stats.debt} users={users} />
      
      <SpendingHabits transactions={transactions} />
      
      <PurchaseCalculator stats={stats} goals={goals} budgets={budgets} />
      
      <RecentTransactions transactions={transactions} />
    </div>
  );
});

