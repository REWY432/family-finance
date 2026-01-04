import { Line } from 'react-chartjs-2';
import { chartOptions, getChartColors } from '../../lib/chartConfig';
import type { AppTransaction } from '../../lib/supabase';

interface ExpenseLineChartProps {
  transactions: AppTransaction[];
  isDark?: boolean;
}

export function ExpenseLineChart({ transactions, isDark = false }: ExpenseLineChartProps) {
  const colors = getChartColors(isDark);

  // Group by month
  const monthlyData: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const month = t.date.substring(0, 7); // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + t.amount;
    });

  const sortedMonths = Object.keys(monthlyData).sort();
  const monthLabels = sortedMonths.map(m => {
    const date = new Date(m + '-01');
    return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
  });

  const data = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Расходы',
        data: sortedMonths.map(m => monthlyData[m]),
        borderColor: colors.danger,
        backgroundColor: `rgba(255, 59, 48, ${isDark ? '0.2' : '0.1'})`,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  return (
    <div style={{ height: '300px', position: 'relative' }}>
      <Line data={data} options={chartOptions} />
    </div>
  );
}

