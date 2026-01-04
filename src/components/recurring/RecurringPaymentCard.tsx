import type { AppRecurringPayment } from '../../lib/supabase';
import { formatMoney, formatDate } from '../../utils/formatters';

interface RecurringPaymentCardProps {
  payment: AppRecurringPayment;
  onEdit?: (payment: AppRecurringPayment) => void;
  onDelete?: (id: string) => void;
  onToggle?: (id: string, isActive: boolean) => void;
}

export function RecurringPaymentCard({ payment, onEdit, onDelete, onToggle }: RecurringPaymentCardProps) {
  const getFrequencyLabel = () => {
    const labels: Record<string, string> = {
      daily: 'Ежедневно',
      weekly: 'Еженедельно',
      biweekly: 'Раз в 2 недели',
      monthly: 'Ежемесячно',
      yearly: 'Ежегодно'
    };
    return labels[payment.frequency] || payment.frequency;
  };

  const getNextDateLabel = () => {
    const today = new Date();
    const nextDate = new Date(payment.next_date);
    const diff = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return 'Просрочено';
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Завтра';
    if (diff <= 7) return `Через ${diff} дней`;
    return formatDate(payment.next_date);
  };

  return (
    <div className="card recurring-payment-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600' }}>{payment.name}</h4>
            {payment.is_shared && <span className="badge shared">общий</span>}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {getFrequencyLabel()}
            {payment.category && ` · ${payment.category}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onToggle && (
            <label className="switch">
              <input
                type="checkbox"
                checked={payment.is_active}
                onChange={e => onToggle(payment.id, e.target.checked)}
              />
              <span className="switch-slider" />
            </label>
          )}
          {onEdit && (
            <button 
              onClick={() => onEdit(payment)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => onDelete(payment.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: payment.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
            {payment.type === 'income' ? '+' : '-'}{formatMoney(payment.amount)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Следующий платёж: {getNextDateLabel()}
          </div>
        </div>
        {!payment.is_active && (
          <span style={{ 
            fontSize: '12px', 
            padding: '4px 8px', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '4px',
            color: 'var(--text-secondary)'
          }}>
            Приостановлен
          </span>
        )}
      </div>
    </div>
  );
}

