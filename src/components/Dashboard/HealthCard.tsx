import { memo, useMemo } from 'react';
import { HealthService } from '../../services/health';
import { appCategoryToCategory, appTransactionToTransaction, findCategoryIdByName } from '../../utils/typeAdapters';
import { AppTransaction, AppCategory, AppBudget, AppGoal } from '../../lib/supabase';

interface HealthCardProps {
  transactions: AppTransaction[];
  categories: AppCategory[];
  budgets: AppBudget[];
  goals: AppGoal[];
}

export const HealthCard = memo(function HealthCard({ transactions, categories, budgets, goals }: HealthCardProps) {
  const healthAnalysis = useMemo(() => {
    try {
      const serviceCategories = categories.map(c => appCategoryToCategory(c));
      const serviceTransactions = transactions.map(tx => appTransactionToTransaction(tx));
      
      const transactionsWithCategories = serviceTransactions.map(tx => {
        const categoryName = transactions.find(t => t.id === tx.id)?.category;
        const categoryId = categoryName ? findCategoryIdByName(categoryName, categories) : undefined;
        return { ...tx, category_id: categoryId };
      });

      const serviceBudgets = budgets.map(b => ({
        id: b.id,
        family_id: '',
        category_id: b.category ? findCategoryIdByName(b.category, categories) : undefined,
        name: b.name,
        amount: b.amount,
        period: b.period,
        alert_threshold: b.alert_threshold,
        start_date: b.start_date,
        end_date: b.end_date,
        is_active: b.is_active,
        created_at: b.created_at,
        updated_at: b.updated_at,
        spent: b.spent,
        remaining: b.remaining,
        percentage: b.percentage
      }));

      const serviceGoals = goals.map(g => ({
        id: g.id,
        family_id: '',
        name: g.name,
        icon: g.icon,
        target_amount: g.target_amount,
        current_amount: g.current_amount,
        deadline: g.deadline,
        is_completed: g.is_completed,
        completed_at: g.completed_at,
        created_at: g.created_at,
        updated_at: g.updated_at,
        percentage: g.percentage,
        days_remaining: g.days_remaining
      }));

      return HealthService.analyzeFinancialHealth(
        transactionsWithCategories,
        serviceBudgets,
        serviceGoals
      );
    } catch (error) {
      console.error('Health analysis error:', error);
      return null;
    }
  }, [transactions, categories, budgets, goals]);

  if (!healthAnalysis) return null;

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'var(--green)';
      case 'B': return '#32d74b';
      case 'C': return 'var(--yellow)';
      case 'D': return 'var(--orange)';
      default: return 'var(--red)';
    }
  };

  return (
    <div className="card health-card glass">
      <h3 className="card-title">💚 Финансовое здоровье</h3>
      
      <div className="health-content">
        <div className="health-score-display">
          <div 
            className="health-score-circle"
            style={{ 
              background: `conic-gradient(${getGradeColor(healthAnalysis.score.grade)} ${Math.round(healthAnalysis.score.overall) * 3.6}deg, var(--bg-tertiary) 0deg)`
            }}
          >
            <div className="health-score-inner">
              <span className="health-score-value">{Math.round(healthAnalysis.score.overall)}</span>
            </div>
          </div>
          <div className="health-score-info">
            <div className="health-grade" style={{ color: getGradeColor(healthAnalysis.score.grade) }}>
              Оценка: {healthAnalysis.score.grade}
            </div>
            <div className="health-summary">
              {healthAnalysis.score.summary}
            </div>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="health-breakdown">
          <ScoreBar label="Сбережения" value={healthAnalysis.score.savings} />
          <ScoreBar label="Бюджет" value={healthAnalysis.score.budget} />
          <ScoreBar label="Долги" value={healthAnalysis.score.debt} />
          <ScoreBar label="Стабильность" value={healthAnalysis.score.stability} />
        </div>

        {/* Top recommendation */}
        {healthAnalysis.recommendations.length > 0 && (
          <div className="health-recommendation">
            <div className="recommendation-icon">💡</div>
            <div className="recommendation-content">
              <strong>{healthAnalysis.recommendations[0].title}</strong>
              <p>{healthAnalysis.recommendations[0].description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

function ScoreBar({ label, value }: { label: string; value: number }) {
  const roundedValue = Math.round(value);
  
  const getColor = (v: number) => {
    if (v >= 80) return 'var(--green)';
    if (v >= 60) return 'var(--yellow)';
    if (v >= 40) return 'var(--orange)';
    return 'var(--red)';
  };

  return (
    <div className="score-bar-item">
      <div className="score-bar-header">
        <span>{label}</span>
        <span>{roundedValue}</span>
      </div>
      <div className="score-bar-track">
        <div 
          className="score-bar-fill animated"
          style={{ 
            width: `${roundedValue}%`,
            backgroundColor: getColor(roundedValue)
          }}
        />
      </div>
    </div>
  );
}

