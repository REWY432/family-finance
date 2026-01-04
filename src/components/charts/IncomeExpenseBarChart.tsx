import { Bar } from 'react-chartjs-2';
import { chartOptions, getChartColors } from '../../lib/chartConfig';
import type { AppTransaction } from '../../lib/supabase';

interface IncomeExpenseBarChartProps {
  transactions: AppTransaction[];
  isDark?: boolean;
}

export function IncomeExpenseBarChart({ transactions, isDark = false }: IncomeExpenseBarChartProps) {
  const colors = getChartColors(isDark);

  // Group by month
  const monthlyData: Record<string, { income: number; expense: number }> = {};
  transactions.forEach(t => {
    const month = t.date.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      monthlyData[month].income += t.amount;
    } else {
      monthlyData[month].expense += t.amount;
    }
  });

  const sortedMonths = Object.keys(monthlyData).sort();
  const monthLabels = sortedMonths.map(m => {
    const date = new Date(m + '-01');
    return date.toLocaleDateString('ru-RU', { month: 'short' });
  });

  const data = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Доходы',
        data: sortedMonths.map(m => monthlyData[m].income),
        backgroundColor: colors.success,
        borderRadius: 8
      },
      {
        label: 'Расходы',
        data: sortedMonths.map(m => monthlyData[m].expense),
        backgroundColor: colors.danger,
        borderRadius: 8
      }
    ]
  };

  return (
    <div style={{ height: '300px', position: 'relative' }}>
      <Bar data={data} options={chartOptions} />
    </div>
  );
}

