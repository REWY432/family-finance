import type { AppBudget } from '../../lib/supabase';
import { formatMoney } from '../../utils/formatters';

interface BudgetCardProps {
  budget: AppBudget;
  onEdit?: (budget: AppBudget) => void;
  onDelete?: (id: string) => void;
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const spent = budget.spent || 0;
  const remaining = budget.remaining || (budget.amount - spent);
  const percentage = budget.percentage || (spent / budget.amount * 100);
  const isOver = spent > budget.amount;
  const isWarning = percentage >= budget.alert_threshold;
  
  const getStatusColor = () => {
    if (isOver) return 'var(--red)';
    if (isWarning) return 'var(--orange)';
    return 'var(--green)';
  };

  return (
    <div className="card budget-card-item">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
            {budget.category ? `${budget.category}: ` : ''}{budget.name}
          </h4>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {budget.period === 'monthly' ? 'Ежемесячно' : 
             budget.period === 'weekly' ? 'Еженедельно' : 'Ежегодно'}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {onEdit && (
              <button 
                onClick={() => onEdit(budget)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button 
                onClick={() => onDelete(budget.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
          <span>Потрачено</span>
          <span style={{ fontWeight: '600', color: getStatusColor() }}>
            {formatMoney(spent)} / {formatMoney(budget.amount)}
          </span>
        </div>
        <div className="budget-progress-bar">
          <div 
            className="budget-progress-fill"
            style={{ 
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: getStatusColor()
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          <span>{Math.round(percentage)}%</span>
          <span style={{ color: isOver ? 'var(--red)' : 'var(--text-secondary)' }}>
            {isOver ? `Превышен на ${formatMoney(Math.abs(remaining))}` : `Осталось ${formatMoney(remaining)}`}
          </span>
        </div>
      </div>

      {isWarning && !isOver && (
        <div style={{ 
          padding: '8px', 
          background: 'rgba(255, 149, 0, 0.1)', 
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--orange)'
        }}>
          ⚠️ Бюджет почти исчерпан ({Math.round(percentage)}%)
        </div>
      )}
      
      {isOver && (
        <div style={{ 
          padding: '8px', 
          background: 'rgba(255, 59, 48, 0.1)', 
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--red)'
        }}>
          🚨 Бюджет превышен!
        </div>
      )}
    </div>
  );
}

