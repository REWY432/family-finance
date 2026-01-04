import { useState, useMemo, memo } from 'react';
import { formatMoney } from '../../utils/formatters';
import { AppGoal, AppBudget } from '../../lib/supabase';
import { Stats } from '../../hooks/useStats';

interface PurchaseCalculatorProps {
  stats: Stats;
  goals: AppGoal[];
  budgets: AppBudget[];
}

export const PurchaseCalculator = memo(function PurchaseCalculator({ 
  stats, 
  goals, 
  budgets 
}: PurchaseCalculatorProps) {
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState<string>('');
  
  const analysis = useMemo(() => {
    const amount = parseFloat(purchaseAmount) || 0;
    if (amount <= 0) return null;
    
    const monthlyBalance = stats.balance;
    const balanceAfter = monthlyBalance - amount;
    const dailyBudgetRemaining = stats.remainingDays > 0 
      ? (monthlyBalance - amount) / stats.remainingDays 
      : 0;
    
    // Check if any budget would be exceeded
    const affectedBudget = budgets.find(b => 
      (!b.category || b.category === purchaseCategory) && 
      b.remaining && b.remaining < amount
    );
    
    // Check impact on goals
    const activeGoals = goals.filter(g => !g.is_completed);
    const totalGoalsRemaining = activeGoals.reduce((sum, g) => sum + (g.target_amount - g.current_amount), 0);
    const canAffordGoals = balanceAfter >= totalGoalsRemaining * 0.1; // Can we still save 10% towards goals?
    
    // Calculate how long it would take to save this amount
    const monthsToSave = stats.dailyAverage > 0 
      ? amount / (stats.dailyAverage * 30 * 0.2) // Assuming 20% savings rate
      : 0;
    
    return {
      amount,
      balanceAfter,
      dailyBudgetRemaining,
      affectedBudget,
      canAffordGoals,
      monthsToSave,
      recommendation: getRecommendation(amount, monthlyBalance, stats.totalIncome, affectedBudget, canAffordGoals)
    };
  }, [purchaseAmount, purchaseCategory, stats, budgets, goals]);
  
  function getRecommendation(
    amount: number, 
    balance: number, 
    income: number,
    affectedBudget: AppBudget | undefined,
    canAffordGoals: boolean
  ): { status: 'safe' | 'caution' | 'danger'; message: string } {
    const percentOfIncome = (amount / income) * 100;
    const percentOfBalance = (amount / Math.max(balance, 1)) * 100;
    
    if (affectedBudget) {
      return {
        status: 'danger',
        message: `Превысит бюджет "${affectedBudget.name}" на ${formatMoney(amount - (affectedBudget.remaining || 0))}`
      };
    }
    
    if (percentOfBalance > 100) {
      return {
        status: 'danger',
        message: 'Эта покупка превышает доступный баланс'
      };
    }
    
    if (!canAffordGoals) {
      return {
        status: 'caution',
        message: 'Может затруднить достижение финансовых целей'
      };
    }
    
    if (percentOfIncome > 30) {
      return {
        status: 'caution',
        message: `Это ${percentOfIncome.toFixed(0)}% от месячного дохода — крупная покупка`
      };
    }
    
    if (percentOfBalance > 50) {
      return {
        status: 'caution',
        message: 'Более половины текущего баланса'
      };
    }
    
    return {
      status: 'safe',
      message: 'Покупка в рамках бюджета'
    };
  }

  return (
    <div className="card glass calculator-card">
      <h3 className="card-title">🧮 Калькулятор покупок</h3>
      <p className="card-subtitle">Проверьте, как покупка повлияет на ваш бюджет</p>
      
      <div className="calculator-form">
        <div className="form-group">
          <label>Сумма покупки</label>
          <input
            type="number"
            value={purchaseAmount}
            onChange={e => setPurchaseAmount(e.target.value)}
            placeholder="Например: 15000"
            className="amount-input calculator-input"
          />
        </div>
        
        {budgets.length > 0 && (
          <div className="form-group">
            <label>Категория (опционально)</label>
            <select
              value={purchaseCategory}
              onChange={e => setPurchaseCategory(e.target.value)}
              className="select-input"
            >
              <option value="">Выберите категорию...</option>
              {budgets.map(b => (
                <option key={b.id} value={b.category || ''}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {analysis && (
        <div className="calculator-results animate-fade-in">
          {/* Status indicator */}
          <div className={`calculator-status ${analysis.recommendation.status}`}>
            <span className="status-icon">
              {analysis.recommendation.status === 'safe' && '✅'}
              {analysis.recommendation.status === 'caution' && '⚠️'}
              {analysis.recommendation.status === 'danger' && '❌'}
            </span>
            <span className="status-message">{analysis.recommendation.message}</span>
          </div>

          <div className="calculator-metrics">
            <div className="metric-row">
              <span className="metric-label">Текущий баланс</span>
              <span className="metric-value">{formatMoney(stats.balance)}</span>
            </div>
            <div className="metric-row highlight">
              <span className="metric-label">После покупки</span>
              <span className={`metric-value ${analysis.balanceAfter < 0 ? 'negative' : ''}`}>
                {formatMoney(analysis.balanceAfter)}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Бюджет в день (остаток месяца)</span>
              <span className="metric-value">{formatMoney(analysis.dailyBudgetRemaining)}</span>
            </div>
            {analysis.monthsToSave > 0 && (
              <div className="metric-row">
                <span className="metric-label">Время накопления (при 20% сбережений)</span>
                <span className="metric-value">
                  {analysis.monthsToSave < 1 
                    ? `${Math.ceil(analysis.monthsToSave * 30)} дней`
                    : `${analysis.monthsToSave.toFixed(1)} мес.`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Visual progress */}
          <div className="calculator-visual">
            <div className="visual-bar">
              <div 
                className="visual-fill current"
                style={{ width: `${Math.min(100, (stats.balance / stats.totalIncome) * 100)}%` }}
              />
              <div 
                className="visual-fill purchase"
                style={{ 
                  width: `${Math.min(100, (analysis.amount / stats.totalIncome) * 100)}%`,
                  left: `${Math.max(0, ((stats.balance - analysis.amount) / stats.totalIncome) * 100)}%`
                }}
              />
            </div>
            <div className="visual-legend">
              <span>0 ₽</span>
              <span>{formatMoney(stats.totalIncome)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

