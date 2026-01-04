import { useState } from 'react';
import type { AppGoal } from '../../lib/supabase';
import { showToast } from '../Toast';

interface GoalFormProps {
  goal?: AppGoal;
  onSave: (goal: Omit<AppGoal, 'id' | 'created_at' | 'updated_at' | 'percentage' | 'days_remaining'>) => void;
  onCancel: () => void;
}

const GOAL_ICONS = ['🎯', '🏖️', '🚗', '🏠', '💻', '📱', '🎓', '💍', '🎁', '✈️', '💰', '🎮', '📚', '🏋️', '🎨'];

export function GoalForm({ goal, onSave, onCancel }: GoalFormProps) {
  const [name, setName] = useState(goal?.name || '');
  const [icon, setIcon] = useState(goal?.icon || '🎯');
  const [targetAmount, setTargetAmount] = useState(goal?.target_amount.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(goal?.current_amount.toString() || '0');
  const [deadline, setDeadline] = useState(goal?.deadline || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showToast('Введите название цели', 'error');
      return;
    }
    
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      showToast('Введите корректную целевую сумму', 'error');
      return;
    }

    if (parseFloat(currentAmount) < 0) {
      showToast('Текущая сумма не может быть отрицательной', 'error');
      return;
    }

    onSave({
      name: name.trim(),
      icon,
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount) || 0,
      deadline: deadline || undefined,
      is_completed: false
    });
  };

  return (
    <form onSubmit={handleSubmit} className="goal-form">
      <div className="form-group">
        <label>Название цели *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Например: Отпуск на море"
          className="text-input"
          required
        />
      </div>

      <div className="form-group">
        <label>Иконка</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          {GOAL_ICONS.map(ic => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              style={{
                fontSize: '24px',
                width: '48px',
                height: '48px',
                border: icon === ic ? '2px solid var(--accent)' : '1px solid var(--bg-tertiary)',
                borderRadius: '8px',
                background: icon === ic ? 'rgba(0, 122, 255, 0.1)' : 'var(--bg-primary)',
                cursor: 'pointer'
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Целевая сумма *</label>
        <input
          type="number"
          value={targetAmount}
          onChange={e => setTargetAmount(e.target.value)}
          placeholder="0"
          className="text-input"
          min="0"
          step="0.01"
          required
        />
      </div>

      <div className="form-group">
        <label>Текущая сумма</label>
        <input
          type="number"
          value={currentAmount}
          onChange={e => setCurrentAmount(e.target.value)}
          placeholder="0"
          className="text-input"
          min="0"
          step="0.01"
        />
      </div>

      <div className="form-group">
        <label>Дедлайн (опционально)</label>
        <input
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="date-input"
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button type="button" onClick={onCancel} className="cancel-btn" style={{ flex: 1 }}>
          Отмена
        </button>
        <button type="submit" className="submit-btn" style={{ flex: 1 }}>
          {goal ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  );
}

