import { useState, useEffect } from 'react';
import type { AppRecurringPayment, AppUser, AppCategory } from '../../lib/supabase';
import { showToast } from '../Toast';

interface RecurringPaymentFormProps {
  payment?: AppRecurringPayment;
  users: AppUser[];
  categories: AppCategory[];
  onSave: (payment: Omit<AppRecurringPayment, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

export function RecurringPaymentForm({ payment, users, categories, onSave, onCancel }: RecurringPaymentFormProps) {
  const [userId, setUserId] = useState(payment?.user_id || users[0]?.id || '');
  const [name, setName] = useState(payment?.name || '');
  const [type, setType] = useState<'income' | 'expense'>(payment?.type || 'expense');
  const [amount, setAmount] = useState(payment?.amount.toString() || '');
  const [category, setCategory] = useState(payment?.category || '');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'>(payment?.frequency || 'monthly');
  const [dayOfMonth, setDayOfMonth] = useState(payment?.day_of_month?.toString() || '');
  const [dayOfWeek, setDayOfWeek] = useState(payment?.day_of_week?.toString() || '');
  const [nextDate, setNextDate] = useState(payment?.next_date || new Date().toISOString().split('T')[0]);
  const [isShared, setIsShared] = useState(payment?.is_shared || false);

  const filteredCategories = categories.filter(c => c.type === type);

  // Calculate next date based on frequency
  useEffect(() => {
    if (!payment) {
      const today = new Date();
      let next = new Date();
      
      if (frequency === 'daily') {
        next.setDate(today.getDate() + 1);
      } else if (frequency === 'weekly') {
        next.setDate(today.getDate() + 7);
      } else if (frequency === 'biweekly') {
        next.setDate(today.getDate() + 14);
      } else if (frequency === 'monthly') {
        if (dayOfMonth) {
          next.setDate(parseInt(dayOfMonth));
          if (next < today) {
            next.setMonth(next.getMonth() + 1);
          }
        } else {
          next.setMonth(today.getMonth() + 1);
        }
      } else if (frequency === 'yearly') {
        next.setFullYear(today.getFullYear() + 1);
      }
      
      setNextDate(next.toISOString().split('T')[0]);
    }
  }, [frequency, dayOfMonth, payment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showToast('Введите название платежа', 'error');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Введите корректную сумму', 'error');
      return;
    }

    onSave({
      user_id: userId,
      name: name.trim(),
      type,
      amount: parseFloat(amount),
      category: category || undefined,
      frequency,
      day_of_month: dayOfMonth ? parseInt(dayOfMonth) : undefined,
      day_of_week: dayOfWeek ? parseInt(dayOfWeek) : undefined,
      next_date: nextDate,
      last_processed: payment?.last_processed,
      is_shared: isShared,
      is_active: true
    });
  };

  return (
    <form onSubmit={handleSubmit} className="recurring-payment-form">
      <div className="form-group">
        <label>Название *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Например: Аренда квартиры"
          className="text-input"
          required
        />
      </div>

      <div className="form-group">
        <label>Кто *</label>
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

      <div className="type-toggle">
        <button
          type="button"
          className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
          onClick={() => setType('expense')}
        >
          Расход
        </button>
        <button
          type="button"
          className={`type-btn ${type === 'income' ? 'active income' : ''}`}
          onClick={() => setType('income')}
        >
          Доход
        </button>
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
        <label>Категория</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="select-input"
        >
          <option value="">Выберите...</option>
          {filteredCategories.map(cat => (
            <option key={cat.id} value={cat.name}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Частота *</label>
        <select
          value={frequency}
          onChange={e => setFrequency(e.target.value as any)}
          className="select-input"
        >
          <option value="daily">Ежедневно</option>
          <option value="weekly">Еженедельно</option>
          <option value="biweekly">Раз в 2 недели</option>
          <option value="monthly">Ежемесячно</option>
          <option value="yearly">Ежегодно</option>
        </select>
      </div>

      {frequency === 'monthly' && (
        <div className="form-group">
          <label>День месяца (1-31)</label>
          <input
            type="number"
            value={dayOfMonth}
            onChange={e => setDayOfMonth(e.target.value)}
            className="text-input"
            min="1"
            max="31"
            placeholder="Например: 5"
          />
        </div>
      )}

      {frequency === 'weekly' && (
        <div className="form-group">
          <label>День недели</label>
          <select
            value={dayOfWeek}
            onChange={e => setDayOfWeek(e.target.value)}
            className="select-input"
          >
            <option value="">Любой</option>
            <option value="0">Воскресенье</option>
            <option value="1">Понедельник</option>
            <option value="2">Вторник</option>
            <option value="3">Среда</option>
            <option value="4">Четверг</option>
            <option value="5">Пятница</option>
            <option value="6">Суббота</option>
          </select>
        </div>
      )}

      <div className="form-group">
        <label>Следующий платёж *</label>
        <input
          type="date"
          value={nextDate}
          onChange={e => setNextDate(e.target.value)}
          className="date-input"
          required
        />
      </div>

      {type === 'expense' && (
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isShared}
              onChange={e => setIsShared(e.target.checked)}
            />
            <span>👥 Общий расход</span>
          </label>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button type="button" onClick={onCancel} className="cancel-btn" style={{ flex: 1 }}>
          Отмена
        </button>
        <button type="submit" className="submit-btn" style={{ flex: 1 }}>
          {payment ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  );
}

