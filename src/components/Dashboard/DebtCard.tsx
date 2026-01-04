import { memo } from 'react';
import { formatMoney } from '../../utils/formatters';
import { AppUser } from '../../lib/supabase';

interface DebtCardProps {
  debt: number;
  users: AppUser[];
}

export const DebtCard = memo(function DebtCard({ debt, users }: DebtCardProps) {
  if (debt === 0 || users.length < 2) return null;
  
  return (
    <div className="card debt-card glass">
      <h3 className="card-title">💰 Расчёт</h3>
      <div className="debt-info">
        {debt > 0 ? (
          <p><strong>{users[1]?.name}</strong> должен(а) <strong>{users[0]?.name}</strong></p>
        ) : (
          <p><strong>{users[0]?.name}</strong> должен(а) <strong>{users[1]?.name}</strong></p>
        )}
        <div className="debt-amount animate-number">{formatMoney(Math.abs(debt))}</div>
      </div>
    </div>
  );
});

