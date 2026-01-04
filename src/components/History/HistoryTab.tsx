import { useState, useMemo, memo } from 'react';
import { AppTransaction, AppUser, AppCategory } from '../../lib/supabase';
import { TransactionItem } from '../Transaction/TransactionItem';
import { formatDate } from '../../utils/formatters';

interface HistoryTabProps {
  transactions: AppTransaction[];
  users: AppUser[];
  categories: AppCategory[];
  onDelete: (id: string) => void;
  onEdit: (tx: AppTransaction) => void;
}

// Group transactions by date
interface TransactionGroup {
  date: string;
  label: string;
  transactions: AppTransaction[];
  total: number;
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Сегодня';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера';
  }
  
  const dayOfWeek = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][date.getDay()];
  const day = date.getDate();
  const month = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'][date.getMonth()];
  
  // Check if it's this week
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  if (date > weekAgo) {
    return dayOfWeek;
  }
  
  return `${day} ${month}`;
}

export const HistoryTab = memo(function HistoryTab({ 
  transactions, 
  users,
  categories,
  onDelete,
  onEdit
}: HistoryTabProps) {
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('month');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

    return transactions.filter(t => {
      // Type filter
      if (filter !== 'all' && t.type !== filter) return false;
      // User filter
      if (userFilter !== 'all' && t.user_id !== userFilter) return false;
      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = t.description?.toLowerCase().includes(query);
        const matchesCategory = t.category?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesCategory) return false;
      }
      // Date filter
      if (dateFilter !== 'all') {
        const txDate = new Date(t.date);
        if (dateFilter === 'today' && txDate < today) return false;
        if (dateFilter === 'week' && txDate < weekAgo) return false;
        if (dateFilter === 'month' && txDate < monthAgo) return false;
      }
      return true;
    });
  }, [transactions, filter, userFilter, dateFilter, categoryFilter, searchQuery]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, TransactionGroup> = {};
    
    filtered.forEach(tx => {
      const dateKey = tx.date.split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          label: getDateLabel(dateKey),
          transactions: [],
          total: 0
        };
      }
      groups[dateKey].transactions.push(tx);
      if (tx.type === 'expense') {
        groups[dateKey].total -= tx.amount;
      } else {
        groups[dateKey].total += tx.amount;
      }
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered]);

  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="tab-content">
      {/* Search */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Поиск по описанию или категории..."
          className="search-input"
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {/* Type Filters */}
      <div className="filter-bar">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Все
        </button>
        <button 
          className={`filter-btn ${filter === 'expense' ? 'active' : ''}`}
          onClick={() => setFilter('expense')}
        >
          Расходы
        </button>
        <button 
          className={`filter-btn ${filter === 'income' ? 'active' : ''}`}
          onClick={() => setFilter('income')}
        >
          Доходы
        </button>
      </div>

      {/* Date Filter */}
      <div className="date-filter">
        <button
          className={`date-filter-btn ${dateFilter === 'today' ? 'active' : ''}`}
          onClick={() => setDateFilter('today')}
        >
          Сегодня
        </button>
        <button
          className={`date-filter-btn ${dateFilter === 'week' ? 'active' : ''}`}
          onClick={() => setDateFilter('week')}
        >
          Неделя
        </button>
        <button
          className={`date-filter-btn ${dateFilter === 'month' ? 'active' : ''}`}
          onClick={() => setDateFilter('month')}
        >
          Месяц
        </button>
        <button
          className={`date-filter-btn ${dateFilter === 'all' ? 'active' : ''}`}
          onClick={() => setDateFilter('all')}
        >
          Всё время
        </button>
      </div>

      {/* User Filter */}
      <div className="user-filter">
        <button
          className={`user-filter-btn ${userFilter === 'all' ? 'active' : ''}`}
          onClick={() => setUserFilter('all')}
        >
          Все
        </button>
        {users.map(user => (
          <button
            key={user.id}
            className={`user-filter-btn ${userFilter === user.id ? 'active' : ''}`}
            onClick={() => setUserFilter(user.id)}
            style={{ '--user-color': user.color } as React.CSSProperties}
          >
            {user.name}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      {filter === 'expense' && (
        <div className="category-filter">
          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
            className="select-input"
          >
            <option value="all">Все категории</option>
            {expenseCategories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Grouped Transactions */}
      {groupedTransactions.length === 0 ? (
        <div className="card glass">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3 className="empty-state-title">Нет транзакций</h3>
            <p className="empty-state-description">
              {filter === 'all' 
                ? 'Начните добавлять транзакции, чтобы отслеживать свои финансы'
                : `Нет ${filter === 'expense' ? 'расходов' : 'доходов'} за выбранный период`
              }
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="transactions-count">
            Найдено: {filtered.length} {filtered.length === 1 ? 'транзакция' : filtered.length < 5 ? 'транзакции' : 'транзакций'}
          </div>
          
          {groupedTransactions.map((group, groupIndex) => (
            <div key={group.date} className="transaction-group animate-slide-in" style={{ '--index': groupIndex } as React.CSSProperties}>
              <div className="group-header">
                <span className="group-date">{group.label}</span>
                <span className={`group-total ${group.total >= 0 ? 'income' : 'expense'}`}>
                  {group.total >= 0 ? '+' : ''}{Math.round(group.total).toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="card glass">
                <div className="transactions-list">
                  {group.transactions.map((tx, index) => (
                    <TransactionItem 
                      key={tx.id} 
                      tx={tx} 
                      showUser 
                      index={index}
                      onDelete={() => onDelete(tx.id)}
                      onEdit={() => onEdit(tx)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
});

