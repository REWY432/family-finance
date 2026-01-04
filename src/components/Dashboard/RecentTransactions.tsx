import { memo } from 'react';
import { AppTransaction } from '../../lib/supabase';
import { TransactionItem } from '../Transaction/TransactionItem';

interface RecentTransactionsProps {
  transactions: AppTransaction[];
}

export const RecentTransactions = memo(function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const recentTx = transactions.slice(0, 5);
  
  if (recentTx.length === 0) return null;
  
  return (
    <div className="card glass">
      <h3 className="card-title">🕐 Последние операции</h3>
      <div className="transactions-list">
        {recentTx.map((tx, index) => (
          <TransactionItem 
            key={tx.id} 
            tx={tx} 
            showUser 
            index={index}
          />
        ))}
      </div>
    </div>
  );
});

