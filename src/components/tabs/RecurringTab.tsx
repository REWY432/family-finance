import type { AppRecurringPayment, AppUser, AppCategory } from '../../lib/supabase';
import { RecurringPaymentCard } from '../recurring/RecurringPaymentCard';

interface RecurringTabProps {
  payments: AppRecurringPayment[];
  users: AppUser[];
  categories: AppCategory[];
  onAdd: () => void;
  onEdit: (payment: AppRecurringPayment) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}

export function RecurringTab({ payments, users, categories, onAdd, onEdit, onDelete, onToggle }: RecurringTabProps) {
  const activePayments = payments.filter(p => p.is_active).sort((a, b) => 
    new Date(a.next_date).getTime() - new Date(b.next_date).getTime()
  );
  const inactivePayments = payments.filter(p => !p.is_active);

  return (
    <div className="tab-content">
      {payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔄</div>
          <h3 className="empty-state-title">Нет регулярных платежей</h3>
          <p className="empty-state-description">
            Добавьте регулярные платежи (подписки, аренда, зарплата), чтобы автоматически отслеживать их
          </p>
        </div>
      ) : (
        <>
          {activePayments.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Активные платежи</h3>
              <div className="recurring-list">
                {activePayments.map(payment => (
                  <RecurringPaymentCard
                    key={payment.id}
                    payment={payment}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </div>
          )}

          {inactivePayments.length > 0 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Приостановленные платежи</h3>
              <div className="recurring-list">
                {inactivePayments.map(payment => (
                  <RecurringPaymentCard
                    key={payment.id}
                    payment={payment}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
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

