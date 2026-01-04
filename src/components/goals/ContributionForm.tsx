import { useState } from 'react';
import type { AppUser } from '../../lib/supabase';
import { showToast } from '../Toast';

interface ContributionFormProps {
  goalId: string;
  goalName: string;
  users: AppUser[];
  onSave: (goalId: string, userId: string, amount: number, note?: string) => void;
  onCancel: () => void;
}

export function ContributionForm({ goalId, goalName, users, onSave, onCancel }: ContributionFormProps) {
  const [userId, setUserId] = useState(users[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Введите корректную сумму', 'error');
      return;
    }

    onSave(goalId, userId, parseFloat(amount), note || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="contribution-form">
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
          Взнос в цель: {goalName}
        </h3>
      </div>

      <div className="form-group">
        <label>Кто вносит *</label>
        <div className="user-select">
          {users.map(user => (
            <button
              key={user.id}
              type="button"
              className={`user-select-btn ${userId === user.id ? 'active' : ''}`}
              onClick={() => setUserId(user.id)}
              style={{ '--user-color': user.color } as React.CSSProperties}
            >
              <span className="user-avatar" style={{ background: user.color }}>
                {user.name[0]}
              </span>
              {user.name}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Сумма взноса *</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0"
          className="amount-input"
          min="0"
          step="0.01"
          required
        />
      </div>

      <div className="form-group">
        <label>Комментарий (опционально)</label>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Например: Зарплата за январь"
          className="text-input"
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button type="button" onClick={onCancel} className="cancel-btn" style={{ flex: 1 }}>
          Отмена
        </button>
        <button type="submit" className="submit-btn" style={{ flex: 1 }}>
          Добавить взнос
        </button>
      </div>
    </form>
  );
}

