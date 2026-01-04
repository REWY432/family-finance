import { useState, useEffect } from 'react';
import type { AppBudget, AppCategory } from '../../lib/supabase';
import { showToast } from '../Toast';

interface BudgetFormProps {
  budget?: AppBudget;
  categories: AppCategory[];
  onSave: (budget: Omit<AppBudget, 'id' | 'created_at' | 'updated_at' | 'spent' | 'remaining' | 'percentage'>) => void;
  onCancel: () => void;
}

export function BudgetForm({ budget, categories, onSave, onCancel }: BudgetFormProps) {
  const [name, setName] = useState(budget?.name || '');
  const [category, setCategory] = useState(budget?.category || '');
  const [amount, setAmount] = useState(budget?.amount.toString() || '');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>(budget?.period || 'monthly');
  const [alertThreshold, setAlertThreshold] = useState(budget?.alert_threshold.toString() || '80');
  const [startDate, setStartDate] = useState(budget?.start_date || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(budget?.end_date || '');

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showToast('Введите название бюджета', 'error');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Введите корректную сумму', 'error');
      return;
    }

    onSave({
      name: name.trim(),
      category: category || undefined,
      amount: parseFloat(amount),
      period,
      alert_threshold: parseInt(alertThreshold),
      start_date: startDate,
      end_date: endDate || undefined,
      is_active: true
    });
  };

  return (
    <form onSubmit={handleSubmit} className="budget-form">
      <div className="form-group">
        <label>Название *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Например: Бюджет на продукты"
          className="text-input"
          required
        />
      </div>

      <div className="form-group">
        <label>Категория (опционально)</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="select-input"
        >
          <option value="">Все категории</option>
          {expenseCategories.map(cat => (
            <option key={cat.id} value={cat.name}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Сумма *</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0"
          className="text-input"
          min="0"
          step="0.01"
          required
        />
      </div>

      <div className="form-group">
        <label>Период *</label>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value as 'weekly' | 'monthly' | 'yearly')}
          className="select-input"
        >
          <option value="weekly">Еженедельно</option>
          <option value="monthly">Ежемесячно</option>
          <option value="yearly">Ежегодно</option>
        </select>
      </div>

      <div className="form-group">
        <label>Порог уведомления (%)</label>
        <input
          type="number"
          value={alertThreshold}
          onChange={e => setAlertThreshold(e.target.value)}
          className="text-input"
          min="1"
          max="100"
        />
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Уведомление при достижении {alertThreshold}% бюджета
        </div>
      </div>

      <div className="form-group">
        <label>Дата начала *</label>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="date-input"
          required
        />
      </div>

      <div className="form-group">
        <label>Дата окончания (опционально)</label>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="date-input"
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button type="button" onClick={onCancel} className="cancel-btn" style={{ flex: 1 }}>
          Отмена
        </button>
        <button type="submit" className="submit-btn" style={{ flex: 1 }}>
          {budget ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  );
}

