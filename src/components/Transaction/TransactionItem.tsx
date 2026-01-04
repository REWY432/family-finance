import { memo } from 'react';
import { AppTransaction } from '../../lib/supabase';
import { formatMoney, formatDate } from '../../utils/formatters';

interface TransactionItemProps {
  tx: AppTransaction;
  showUser?: boolean;
  showDate?: boolean;
  index?: number;
  onDelete?: () => void;
  onEdit?: () => void;
}

export const TransactionItem = memo(function TransactionItem({ 
  tx, 
  showUser = false,
  showDate = false,
  index = 0,
  onDelete,
  onEdit
}: TransactionItemProps) {
  const isIncome = tx.type === 'income';
  
  // Get category color (you can expand this based on your categories)
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Продукты': '#4CAF50',
      'Транспорт': '#2196F3',
      'Рестораны': '#FF9800',
      'Развлечения': '#9C27B0',
      'Коммуналка': '#607D8B',
      'Здоровье': '#E91E63',
      'Одежда': '#00BCD4',
      'Подарки': '#F44336',
      'Образование': '#3F51B5',
      'Путешествия': '#009688',
      'Дом': '#795548',
      'Связь': '#673AB7',
      'Подписки': '#FF5722',
      'Хоз товары': '#8BC34A',
      'Маркетплейсы': '#FF7043',
      'Зарплата': '#4CAF50',
      'Фриланс': '#2196F3',
      'Кэшбэк': '#FF9800',
    };
    return colors[category] || '#9E9E9E';
  };

  const categoryColor = getCategoryColor(tx.category || '');
  
  return (
    <div 
      className="transaction-item animate-slide-in"
      style={{ '--index': index, '--category-color': categoryColor } as React.CSSProperties}
    >
      <div 
        className={`transaction-icon ${isIncome ? 'income' : tx.is_shared ? 'shared' : 'expense'}`}
        style={{ 
          background: isIncome 
            ? 'rgba(52, 199, 89, 0.15)' 
            : tx.is_shared 
              ? 'rgba(0, 122, 255, 0.15)'
              : `${categoryColor}20`
        }}
      >
        {tx.category?.[0] || (isIncome ? '💰' : '💸')}
      </div>
      <div className="transaction-info" onClick={onEdit} style={onEdit ? { cursor: 'pointer' } : undefined}>
        <span className="transaction-category">
          {tx.category || 'Без категории'}
          {tx.is_shared && <span className="badge shared">общий</span>}
          {tx.is_credit && <span className="badge credit">кредит</span>}
        </span>
        <span className="transaction-meta">
          {showDate && formatDate(tx.date)}
          {showDate && showUser && ' · '}
          {showUser && tx.user?.name}
          {tx.description && ` · ${tx.description}`}
        </span>
      </div>
      <span className={`transaction-amount ${isIncome ? 'income' : 'expense'}`}>
        {isIncome ? '+' : '-'}{formatMoney(tx.amount)}
      </span>
      {(onEdit || onDelete) && (
        <div className="transaction-actions">
          {onEdit && (
            <button className="action-btn edit" onClick={onEdit} title="Редактировать">
              ✏️
            </button>
          )}
          {onDelete && (
            <button className="action-btn delete" onClick={onDelete} title="Удалить">
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  );
});

