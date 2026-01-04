import type { AppBudget, AppCategory } from '../../lib/supabase';
import { BudgetCard } from '../budgets/BudgetCard';

interface BudgetsTabProps {
  budgets: AppBudget[];
  categories: AppCategory[];
  onAdd: () => void;
  onEdit: (budget: AppBudget) => void;
  onDelete: (id: string) => void;
}

export function BudgetsTab({ budgets, categories, onAdd, onEdit, onDelete }: BudgetsTabProps) {
  const activeBudgets = budgets.filter(b => b.is_active);
  const inactiveBudgets = budgets.filter(b => !b.is_active);

  return (
    <div className="tab-content">
      {budgets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💰</div>
          <h3 className="empty-state-title">Нет бюджетов</h3>
          <p className="empty-state-description">
            Создайте бюджет, чтобы отслеживать свои расходы по категориям
          </p>
        </div>
      ) : (
        <>
          {activeBudgets.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Активные бюджеты</h3>
              <div className="budgets-list">
                {activeBudgets.map(budget => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {inactiveBudgets.length > 0 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Неактивные бюджеты</h3>
              <div className="budgets-list">
                {inactiveBudgets.map(budget => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

