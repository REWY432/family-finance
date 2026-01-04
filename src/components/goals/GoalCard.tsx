import type { AppGoal } from '../../lib/supabase';
import { formatMoney, getDaysRemaining } from '../../utils/formatters';

interface GoalCardProps {
  goal: AppGoal;
  onEdit?: (goal: AppGoal) => void;
  onDelete?: (id: string) => void;
  onAddContribution?: (goalId: string) => void;
}

export function GoalCard({ goal, onEdit, onDelete, onAddContribution }: GoalCardProps) {
  const percentage = goal.percentage || (goal.current_amount / goal.target_amount * 100);
  const daysRemaining = goal.deadline ? getDaysRemaining(goal.deadline) : undefined;
  const remaining = goal.target_amount - goal.current_amount;
  const isCompleted = goal.is_completed || percentage >= 100;

  // Calculate circumference for circular progress
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="card goal-card-item">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>{goal.icon}</span>
            <h4 style={{ fontSize: '16px', fontWeight: '600' }}>{goal.name}</h4>
          </div>
          {goal.deadline && typeof daysRemaining === 'number' && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span style={{ color: daysRemaining < 30 ? 'var(--red)' : 'var(--text-secondary)' }}>
                {daysRemaining > 0 ? `Осталось ${daysRemaining} дней` : 'Срок истёк'}
              </span>
            </div>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {onEdit && (
              <button 
                onClick={() => onEdit(goal)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button 
                onClick={() => onDelete(goal.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Circular Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
          <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={isCompleted ? 'var(--green)' : 'var(--accent)'}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: isCompleted ? 'var(--green)' : 'var(--accent)' }}>
              {Math.round(percentage)}%
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Накоплено
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            {formatMoney(goal.current_amount)} / {formatMoney(goal.target_amount)}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Осталось: {formatMoney(remaining)}
          </div>
        </div>
      </div>

      {isCompleted && (
        <div style={{ 
          padding: '12px', 
          background: 'rgba(52, 199, 89, 0.1)', 
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--green)',
          fontWeight: '600'
        }}>
          🎉 Цель достигнута!
        </div>
      )}

      {onAddContribution && !isCompleted && (
        <button 
          onClick={() => onAddContribution(goal.id)}
          className="submit-btn"
          style={{ width: '100%', marginTop: '12px' }}
        >
          ➕ Добавить взнос
        </button>
      )}
    </div>
  );
}

