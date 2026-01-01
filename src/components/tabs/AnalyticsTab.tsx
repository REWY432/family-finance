import type { AppTransaction, AppCategory } from '../../lib/supabase';
import { ExpenseLineChart } from '../charts/ExpenseLineChart';
import { IncomeExpenseBarChart } from '../charts/IncomeExpenseBarChart';
import { CategoryPieChart } from '../charts/CategoryPieChart';

interface AnalyticsTabProps {
  transactions: AppTransaction[];
  categories: AppCategory[];
  isDark: boolean;
}

export function AnalyticsTab({ transactions, categories, isDark }: AnalyticsTabProps) {
  if (transactions.length === 0) {
    return (
      <div className="tab-content">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3 className="empty-state-title">Нет данных для анализа</h3>
          <p className="empty-state-description">
            Добавьте транзакции, чтобы увидеть графики и аналитику
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">📈 Динамика расходов</h3>
        <ExpenseLineChart transactions={transactions} isDark={isDark} />
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">📊 Доходы и расходы</h3>
        <IncomeExpenseBarChart transactions={transactions} isDark={isDark} />
      </div>

      <div className="card">
        <h3 className="card-title">🥧 Расходы по категориям</h3>
        <CategoryPieChart transactions={transactions} categories={categories} isDark={isDark} />
      </div>
    </div>
  );
}

