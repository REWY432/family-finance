import { useMemo, memo } from 'react';
import { AppTransaction } from '../../lib/supabase';
import { formatMoney } from '../../utils/formatters';

interface SpendingHabitsProps {
  transactions: AppTransaction[];
}

interface Habit {
  icon: string;
  title: string;
  description: string;
  type: 'info' | 'good' | 'warning';
}

export const SpendingHabits = memo(function SpendingHabits({ transactions }: SpendingHabitsProps) {
  const habits = useMemo(() => {
    const result: Habit[] = [];
    
    // Get last 3 months of data
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentTx = transactions.filter(t => 
      t.type === 'expense' && new Date(t.date) >= threeMonthsAgo
    );
    
    if (recentTx.length < 10) return result;
    
    // 1. Analyze spending by day of week
    const byDayOfWeek: Record<number, { count: number; total: number }> = {};
    for (let i = 0; i < 7; i++) {
      byDayOfWeek[i] = { count: 0, total: 0 };
    }
    
    recentTx.forEach(tx => {
      const day = new Date(tx.date).getDay();
      byDayOfWeek[day].count++;
      byDayOfWeek[day].total += tx.amount;
    });
    
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const maxSpendingDay = Object.entries(byDayOfWeek).sort((a, b) => b[1].total - a[1].total)[0];
    
    if (maxSpendingDay) {
      result.push({
        icon: '📅',
        title: `Больше всего тратите по ${dayNames[parseInt(maxSpendingDay[0])]?.toLowerCase()}м`,
        description: `Средние траты: ${formatMoney(maxSpendingDay[1].total / Math.max(1, maxSpendingDay[1].count))}`,
        type: 'info'
      });
    }
    
    // 2. Find most frequent category
    const byCategory: Record<string, { count: number; total: number }> = {};
    recentTx.forEach(tx => {
      const cat = tx.category || 'Другое';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 };
      byCategory[cat].count++;
      byCategory[cat].total += tx.amount;
    });
    
    const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1].count - a[1].count);
    if (sortedCategories.length > 0) {
      const [topCat, topData] = sortedCategories[0];
      result.push({
        icon: '🏆',
        title: `Самая частая категория: ${topCat}`,
        description: `${topData.count} транзакций на ${formatMoney(topData.total)}`,
        type: 'info'
      });
    }
    
    // 3. Weekend vs weekday spending
    const weekendTotal = (byDayOfWeek[0].total + byDayOfWeek[6].total);
    const weekdayTotal = Object.entries(byDayOfWeek)
      .filter(([day]) => day !== '0' && day !== '6')
      .reduce((sum, [, data]) => sum + data.total, 0);
    
    const weekendDays = 2;
    const weekdayDays = 5;
    const weekendAvg = weekendTotal / weekendDays;
    const weekdayAvg = weekdayTotal / weekdayDays;
    
    if (weekendAvg > weekdayAvg * 1.5) {
      result.push({
        icon: '🎉',
        title: 'Выходные — время трат!',
        description: `В выходные тратите на ${Math.round((weekendAvg / weekdayAvg - 1) * 100)}% больше чем в будни`,
        type: 'warning'
      });
    } else if (weekdayAvg > weekendAvg * 1.5) {
      result.push({
        icon: '💼',
        title: 'Будни дороже выходных',
        description: `В будни тратите на ${Math.round((weekdayAvg / weekendAvg - 1) * 100)}% больше`,
        type: 'info'
      });
    }
    
    // 4. Average transaction size trend
    const sortedByDate = [...recentTx].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstHalf = sortedByDate.slice(0, Math.floor(sortedByDate.length / 2));
    const secondHalf = sortedByDate.slice(Math.floor(sortedByDate.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, t) => sum + t.amount, 0) / Math.max(1, firstHalf.length);
    const secondHalfAvg = secondHalf.reduce((sum, t) => sum + t.amount, 0) / Math.max(1, secondHalf.length);
    
    if (secondHalfAvg > firstHalfAvg * 1.2) {
      result.push({
        icon: '📈',
        title: 'Траты растут',
        description: `Средний чек вырос на ${Math.round((secondHalfAvg / firstHalfAvg - 1) * 100)}%`,
        type: 'warning'
      });
    } else if (secondHalfAvg < firstHalfAvg * 0.8) {
      result.push({
        icon: '📉',
        title: 'Траты снижаются',
        description: `Средний чек уменьшился на ${Math.round((1 - secondHalfAvg / firstHalfAvg) * 100)}%`,
        type: 'good'
      });
    }
    
    // 5. Regularity of shared expenses
    const sharedTx = recentTx.filter(t => t.is_shared);
    if (sharedTx.length > 0) {
      const sharedPercent = (sharedTx.reduce((sum, t) => sum + t.amount, 0) / 
                           recentTx.reduce((sum, t) => sum + t.amount, 0)) * 100;
      result.push({
        icon: '👥',
        title: `${Math.round(sharedPercent)}% расходов — общие`,
        description: `${sharedTx.length} общих транзакций за период`,
        type: sharedPercent > 40 ? 'good' : 'info'
      });
    }
    
    // 6. Credit usage
    const creditTx = recentTx.filter(t => t.is_credit);
    if (creditTx.length > 0) {
      const creditTotal = creditTx.reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = recentTx.reduce((sum, t) => sum + t.amount, 0);
      const creditPercent = (creditTotal / totalExpense) * 100;
      
      result.push({
        icon: '💳',
        title: `${Math.round(creditPercent)}% покупок в кредит`,
        description: `Сумма: ${formatMoney(creditTotal)}`,
        type: creditPercent > 30 ? 'warning' : 'info'
      });
    }
    
    // 7. Impulse purchases (small frequent transactions)
    const smallTx = recentTx.filter(t => t.amount < 500);
    if (smallTx.length > recentTx.length * 0.4) {
      const smallTotal = smallTx.reduce((sum, t) => sum + t.amount, 0);
      result.push({
        icon: '☕',
        title: 'Много мелких покупок',
        description: `${smallTx.length} покупок до 500₽ на сумму ${formatMoney(smallTotal)}`,
        type: 'warning'
      });
    }
    
    return result;
  }, [transactions]);

  if (habits.length === 0) {
    return (
      <div className="card glass">
        <h3 className="card-title">📊 Статистика привычек</h3>
        <div className="empty-state-mini">
          <p>Недостаточно данных для анализа. Добавьте больше транзакций.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card glass">
      <h3 className="card-title">📊 Статистика привычек</h3>
      <div className="habits-list">
        {habits.map((habit, index) => (
          <div 
            key={index} 
            className={`habit-item animate-slide-in ${habit.type}`}
            style={{ '--index': index } as React.CSSProperties}
          >
            <span className="habit-icon">{habit.icon}</span>
            <div className="habit-content">
              <div className="habit-title">{habit.title}</div>
              <div className="habit-description">{habit.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

