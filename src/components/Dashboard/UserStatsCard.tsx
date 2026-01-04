import { memo } from 'react';
import { formatMoney } from '../../utils/formatters';
import { AppUser } from '../../lib/supabase';
import { Stats } from '../../hooks/useStats';

interface UserStatsCardProps {
  users: AppUser[];
  stats: Stats;
}

export const UserStatsCard = memo(function UserStatsCard({ users, stats }: UserStatsCardProps) {
  return (
    <div className="card glass">
      <h3 className="card-title">👥 По пользователям</h3>
      {users.map((user, index) => {
        const userStats = stats.byUser[user.id] || { income: 0, expense: 0, shared: 0 };
        return (
          <div 
            key={user.id} 
            className="user-stat-row animate-slide-in"
            style={{ '--index': index } as React.CSSProperties}
          >
            <div className="user-info">
              <span className="user-avatar pulse-on-hover" style={{ background: user.color }}>
                {user.name[0]}
              </span>
              <span className="user-name">{user.name}</span>
            </div>
            <div className="user-amounts">
              <span className="expense">-{formatMoney(userStats.expense)}</span>
              <span className="income">+{formatMoney(userStats.income)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

