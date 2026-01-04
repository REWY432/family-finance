import type { AppGoal, AppUser } from '../../lib/supabase';
import { GoalCard } from '../goals/GoalCard';

interface GoalsTabProps {
  goals: AppGoal[];
  users: AppUser[];
  onAdd: () => void;
  onEdit: (goal: AppGoal) => void;
  onDelete: (id: string) => void;
  onAddContribution: (goalId: string) => void;
}

export function GoalsTab({ goals, users, onAdd, onEdit, onDelete, onAddContribution }: GoalsTabProps) {
  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);

  return (
    <div className="tab-content">
      {goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <h3 className="empty-state-title">Нет целей</h3>
          <p className="empty-state-description">
            Создайте финансовую цель, чтобы отслеживать свой прогресс
          </p>
        </div>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Активные цели</h3>
              <div className="goals-list">
                {activeGoals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddContribution={onAddContribution}
                  />
                ))}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Достигнутые цели</h3>
              <div className="goals-list">
                {completedGoals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
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

