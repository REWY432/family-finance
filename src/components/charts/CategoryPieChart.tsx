import { Pie } from 'react-chartjs-2';
import { chartOptions, getChartColors } from '../../lib/chartConfig';
import type { AppTransaction, AppCategory } from '../../lib/supabase';

interface CategoryPieChartProps {
  transactions: AppTransaction[];
  categories: AppCategory[];
  isDark?: boolean;
}

export function CategoryPieChart({ transactions, categories, isDark = false }: CategoryPieChartProps) {
  const colors = getChartColors(isDark);

  // Calculate expenses by category
  const categoryData: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'expense' && t.category)
    .forEach(t => {
      categoryData[t.category!] = (categoryData[t.category!] || 0) + t.amount;
    });

  // Sort by amount and take top 8
  const sorted = Object.entries(categoryData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const categoryColors = sorted.map(([name]) => {
    const cat = categories.find(c => c.name === name);
    return cat?.color || '#8E8E93';
  });

  const data = {
    labels: sorted.map(([name]) => name),
    datasets: [
      {
        data: sorted.map(([, amount]) => amount),
        backgroundColor: categoryColors,
        borderWidth: 2,
        borderColor: isDark ? '#1c1c1e' : '#ffffff'
      }
    ]
  };

  const pieOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins.legend,
        position: 'right' as const
      }
    }
  };

  return (
    <div style={{ height: '300px', position: 'relative' }}>
      <Pie data={data} options={pieOptions} />
    </div>
  );
}

