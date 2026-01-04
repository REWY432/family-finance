/**
 * Skeleton Loaders
 * Loading placeholders for better perceived performance
 */

// ============================================
// Basic Skeleton
// ============================================

export function Skeleton({
  width,
  height,
  className = '',
  style
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

// ============================================
// Card Skeleton
// ============================================

export function CardSkeleton() {
  return (
    <div className="card">
      <Skeleton height={20} width="60%" style={{ marginBottom: '12px' }} />
      <Skeleton height={16} width="100%" style={{ marginBottom: '8px' }} />
      <Skeleton height={16} width="80%" />
    </div>
  );
}

// ============================================
// Transaction Item Skeleton
// ============================================

export function TransactionItemSkeleton() {
  return (
    <div className="transaction-item">
      <Skeleton width={40} height={40} style={{ borderRadius: '12px', flexShrink: 0 }} />
      <div style={{ flex: 1, marginLeft: '12px' }}>
        <Skeleton height={16} width="40%" style={{ marginBottom: '6px' }} />
        <Skeleton height={12} width="60%" />
      </div>
      <Skeleton height={16} width={60} />
    </div>
  );
}

// ============================================
// Dashboard Skeleton
// ============================================

export function DashboardSkeleton() {
  return (
    <div className="tab-content">
      {/* Balance Card Skeleton */}
      <div className="card balance-card" style={{ opacity: 0.7 }}>
        <Skeleton height={14} width="40%" style={{ marginBottom: '8px', background: 'rgba(255,255,255,0.3)' }} />
        <Skeleton height={36} width="60%" style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.3)' }} />
        <div style={{ display: 'flex', gap: '24px' }}>
          <Skeleton height={32} width={80} style={{ background: 'rgba(255,255,255,0.3)' }} />
          <Skeleton height={32} width={80} style={{ background: 'rgba(255,255,255,0.3)' }} />
        </div>
      </div>
      
      {/* Other Cards */}
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

