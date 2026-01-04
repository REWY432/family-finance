import { useState, useEffect, useMemo } from 'react';
import { AppUser, AppCategory, AppTransaction } from '../../lib/supabase';
import { AutoCategoryService } from '../../services/autocategory';
import { appCategoryToCategory, appTransactionToTransaction } from '../../utils/typeAdapters';
import { useApp, TransactionTemplate } from '../../context/AppContext';

interface TransactionFormProps {
  users: AppUser[];
  categories: AppCategory[];
  transactions: AppTransaction[];
  editingTransaction?: AppTransaction | null;
  onSubmit: (data: {
    user_id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description?: string;
    date: string;
    is_shared: boolean;
    is_credit: boolean;
  }) => void;
  onClose: () => void;
}

export function TransactionForm({ 
  users, 
  categories, 
  transactions,
  editingTransaction,
  onSubmit, 
  onClose 
}: TransactionFormProps) {
  const { templates, saveTemplate, applyTemplate } = useApp();
  const isEditing = !!editingTransaction;
  
  const [userId, setUserId] = useState(editingTransaction?.user_id || users[0]?.id || '');
  const [type, setType] = useState<'expense' | 'income'>(editingTransaction?.type || 'expense');
  const [amount, setAmount] = useState(editingTransaction?.amount?.toString() || '');
  const [category, setCategory] = useState(editingTransaction?.category || '');
  const [description, setDescription] = useState(editingTransaction?.description || '');
  const [isShared, setIsShared] = useState(editingTransaction?.is_shared || false);
  const [isCredit, setIsCredit] = useState(editingTransaction?.is_credit || false);
  const [date, setDate] = useState(editingTransaction?.date || new Date().toISOString().split('T')[0]);
  const [predictedCategory, setPredictedCategory] = useState<string | null>(null);
  const [predictionConfidence, setPredictionConfidence] = useState<number>(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const filteredCategories = categories.filter(c => c.type === type);

  // Auto-categorize when description changes
  useEffect(() => {
    if (description.trim().length > 3) {
      try {
        const serviceCategories = categories.map(c => appCategoryToCategory(c));
        const serviceTransactions = transactions.map(tx => appTransactionToTransaction(tx));
        
        const prediction = AutoCategoryService.predictCategory(
          description,
          serviceCategories,
          serviceTransactions
        );
        
        if (prediction && prediction.confidence > 0.5) {
          setPredictedCategory(prediction.category_name);
          setPredictionConfidence(prediction.confidence);
          
          if (prediction.confidence > 0.7 && !category) {
            setCategory(prediction.category_name);
          }
        } else {
          setPredictedCategory(null);
          setPredictionConfidence(0);
        }
      } catch (error) {
        console.error('Auto-categorization error:', error);
      }
    } else {
      setPredictedCategory(null);
      setPredictionConfidence(0);
    }
  }, [description, categories, transactions, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Введите сумму');
      return;
    }

    onSubmit({
      user_id: userId,
      type,
      amount: parseFloat(amount),
      category: category || (filteredCategories[0]?.name || 'Другое'),
      description: description || undefined,
      date,
      is_shared: isShared,
      is_credit: isCredit
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = applyTemplate(templateId);
    if (template) {
      setUserId(template.user_id);
      setType(template.type);
      setAmount(template.amount.toString());
      setCategory(template.category);
      setDescription(template.description || '');
      setIsShared(template.is_shared);
      setIsCredit(template.is_credit);
      setShowTemplates(false);
    }
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) return;
    
    saveTemplate({
      name: templateName,
      user_id: userId,
      type,
      amount: parseFloat(amount) || 0,
      category,
      description,
      is_shared: isShared,
      is_credit: isCredit
    });
    
    setTemplateName('');
    setShowSaveTemplate(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Редактировать операцию' : 'Новая операция'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Templates Section */}
        {!isEditing && templates.length > 0 && (
          <div className="templates-section">
            <button 
              type="button"
              className="templates-toggle"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              ⚡ Быстрые шаблоны ({templates.length})
            </button>
            
            {showTemplates && (
              <div className="templates-list">
                {templates.map((template: TransactionTemplate) => (
                  <button
                    key={template.id}
                    type="button"
                    className="template-item"
                    onClick={() => handleApplyTemplate(template.id)}
                  >
                    <span className="template-icon">{template.type === 'income' ? '💰' : '💸'}</span>
                    <span className="template-name">{template.name}</span>
                    <span className="template-amount">{template.amount} ₽</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-form">
          {/* User Selection */}
          <div className="form-group">
            <label>Кто</label>
            <div className="user-select">
              {users.map(user => (
                <button
                  key={user.id}
                  type="button"
                  className={`user-select-btn ${userId === user.id ? 'active' : ''}`}
                  onClick={() => setUserId(user.id)}
                  style={{ '--user-color': user.color } as React.CSSProperties}
                >
                  <span className="user-avatar" style={{ background: user.color }}>
                    {user.name[0]}
                  </span>
                  {user.name}
                </button>
              ))}
            </div>
          </div>

          {/* Type Toggle */}
          <div className="type-toggle">
            <button
              type="button"
              className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
              onClick={() => setType('expense')}
            >
              Расход
            </button>
            <button
              type="button"
              className={`type-btn ${type === 'income' ? 'active income' : ''}`}
              onClick={() => setType('income')}
            >
              Доход
            </button>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label>Сумма *</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="amount-input"
              autoFocus={!isEditing}
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label>
              Категория
              {predictedCategory && (
                <span className="prediction-hint">
                  (предложено: {predictedCategory} {Math.round(predictionConfidence * 100)}%)
                </span>
              )}
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="select-input"
              style={predictedCategory && !category ? { borderColor: 'var(--accent)' } : undefined}
            >
              <option value="">Выберите...</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                  {predictedCategory === cat.name && ` (${Math.round(predictionConfidence * 100)}%)`}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Комментарий</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Описание..."
              className="text-input"
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label>Дата</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="date-input"
            />
          </div>

          {/* Flags */}
          {type === 'expense' && (
            <div className="flags-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={e => setIsShared(e.target.checked)}
                />
                <span>👥 Общий</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isCredit}
                  onChange={e => setIsCredit(e.target.checked)}
                />
                <span>💳 Кредит</span>
              </label>
            </div>
          )}

          {/* Save as Template */}
          {!isEditing && (
            <div className="save-template-section">
              {!showSaveTemplate ? (
                <button 
                  type="button" 
                  className="save-template-toggle"
                  onClick={() => setShowSaveTemplate(true)}
                >
                  💾 Сохранить как шаблон
                </button>
              ) : (
                <div className="save-template-form">
                  <input
                    type="text"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="Название шаблона..."
                    className="text-input"
                  />
                  <button type="button" onClick={handleSaveAsTemplate} className="save-btn">
                    ✓
                  </button>
                  <button type="button" onClick={() => setShowSaveTemplate(false)} className="cancel-btn">
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="submit-btn animate-pulse-once">
            {isEditing 
              ? '💾 Сохранить изменения'
              : type === 'expense' ? '➖ Добавить расход' : '➕ Добавить доход'
            }
          </button>
        </form>
      </div>
    </div>
  );
}

