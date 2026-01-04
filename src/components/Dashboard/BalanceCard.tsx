import { memo } from 'react';
import { formatMoney } from '../../utils/formatters';
import { Stats } from '../../hooks/useStats';

interface BalanceCardProps {
  stats: Stats;
  healthGrade?: string;
}

export const BalanceCard = memo(function BalanceCard({ stats, healthGrade }: BalanceCardProps) {
  const isPositive = stats.balance >= 0;
  
  return (
    <div className={`card balance-card ${isPositive ? 'positive' : 'negative'}`}>
      <div className="balance-header">
        <span className="balance-label">Баланс за месяц</span>
        {healthGrade && (
          <span className="health-badge">{healthGrade}</span>
        )}
      </div>
      <div className="balance-amount">{formatMoney(stats.balance)}</div>
      <div className="balance-details">
        <div className="balance-item income">
          <span>Доходы</span>
          <span>+{formatMoney(stats.totalIncome)}</span>
        </div>
        <div className="balance-item expense">
          <span>Расходы</span>
          <span>-{formatMoney(stats.totalExpense)}</span>
        </div>
      </div>
      
      {/* Daily Stats */}
      <div className="balance-daily">
        <div className="daily-stat">
          <span className="daily-label">В среднем/день</span>
          <span className="daily-value">{formatMoney(stats.dailyAverage)}</span>
        </div>
        <div className="daily-stat">
          <span className="daily-label">Осталось дней</span>
          <span className="daily-value">{stats.remainingDays}</span>
        </div>
      </div>
    </div>
  );
});

