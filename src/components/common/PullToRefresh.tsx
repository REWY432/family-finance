import { ReactNode } from 'react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const { containerRef, pullDistance, isRefreshing, isTriggered } = usePullToRefresh({
    onRefresh,
    threshold: 80
  });

  return (
    <div ref={containerRef} className="pull-to-refresh-container">
      {/* Pull indicator */}
      <div 
        className="pull-indicator"
        style={{ 
          transform: `translateY(${Math.min(pullDistance - 60, 20)}px)`,
          opacity: pullDistance > 20 ? 1 : 0
        }}
      >
        <div className={`pull-spinner ${isRefreshing ? 'spinning' : ''} ${isTriggered ? 'triggered' : ''}`}>
          {isRefreshing ? '🔄' : isTriggered ? '↓' : '↓'}
        </div>
        <span className="pull-text">
          {isRefreshing ? 'Обновление...' : isTriggered ? 'Отпустите' : 'Потяните вниз'}
        </span>
      </div>
      
      {/* Content with offset */}
      <div 
        className="pull-content"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}

