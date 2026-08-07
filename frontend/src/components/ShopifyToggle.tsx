import React from 'react';

interface Props {
  productId: string;
  isListed: boolean;
  syncStatus?: string;
  onToggle: (productId: string, newValue: boolean) => void;
}

export const ShopifyToggle: React.FC<Props> = ({ productId, isListed, syncStatus = 'UNPUBLISHED', onToggle }) => {
  const isCurrentlySynced = syncStatus.toUpperCase() === 'SYNCED';
  const isChecked = isListed || isCurrentlySynced;

  const getBadgeStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SYNCED':
        return { background: '#e6f4ea', color: '#137333', border: '1px solid #ceead6' };
      case 'PENDING':
        return { background: '#fef7e0', color: '#b06000', border: '1px solid #feefc3' };
      case 'FAILED':
        return { background: '#fce8e6', color: '#c5221f', border: '1px solid #fad2cf' };
      default:
        return { background: '#f1f3f4', color: '#5f6368', border: '1px solid #dadce0' };
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '6px', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onToggle(productId, e.target.checked)}
            style={{ accentColor: '#10b981', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>Publish to Shopify</span>
        </label>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            letterSpacing: '0.05em',
            ...getBadgeStyle(syncStatus),
          }}
        >
          [{syncStatus.toUpperCase()}]
        </span>
      </div>

      {isChecked && (
        <button
          type="button"
          onClick={() => onToggle(productId, false)}
          style={{
            fontSize: '10px',
            color: '#dc2626',
            background: 'none',
            border: 'none',
            textDecoration: 'underline',
            cursor: 'pointer',
            textAlign: 'left',
            padding: 0,
            fontFamily: 'monospace',
          }}
        >
          ❌ Delete from Shopify
        </button>
      )}
    </div>
  );
};
