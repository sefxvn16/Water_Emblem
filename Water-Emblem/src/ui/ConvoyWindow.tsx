import React from 'react';
import { getItemIcon } from './itemIcon';
import type { TradeItemRow } from './TradeWindow';

interface ConvoyWindowProps {
  /** Convoy screen (PLAN item 88): click a held item to deposit it,
      click a convoy item to withdraw it. */
  unitName: string;
  unitAvatarUrl?: string;
  unitItems: readonly TradeItemRow[];
  convoyItems: readonly TradeItemRow[];
  convoyCount: number;
  convoyCapacity: number;
  onDeposit: (index: number) => void;
  onWithdraw: (index: number) => void;
  onClose: () => void;
}

export const ConvoyWindow: React.FC<ConvoyWindowProps> = (props) => {
  const renderRow = (
    item: TradeItemRow,
    index: number,
    testId: string,
    onClick: () => void,
  ) => {
    const icon = getItemIcon(item.itemId, item.type);
    return (
      <button
        key={`${item.itemId}-${index}`}
        data-testid={testId}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: '5px 8px',
          backgroundColor: item.equipped ? 'rgba(234, 179, 8, 0.14)' : 'transparent',
          border: 'none',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 'bold',
          cursor: 'pointer',
          textAlign: 'left',
          textShadow: '1px 1px 0 #000',
          borderRadius: '4px',
        }}
      >
        {icon && (
          <img
            src={icon}
            alt=""
            style={{ width: '18px', height: '18px', imageRendering: 'pixelated', flexShrink: 0 }}
          />
        )}
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </span>
        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{item.uses}/{item.maxUses}</span>
      </button>
    );
  };

  const headerStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#93c5fd',
    fontSize: '13px',
    padding: '4px 8px 6px',
    borderBottom: '1px solid rgba(234, 179, 8, 0.4)',
    marginBottom: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div
      data-testid="convoy-window"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '520px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 1400,
        backgroundColor: '#0c1e5b',
        border: '2px solid #eab308',
        borderRadius: '6px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.7)',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ fontWeight: 'bold', color: '#93c5fd', fontSize: '14px', padding: '2px 8px' }}>
        Storage
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {props.unitAvatarUrl ? (
              <img
                src={props.unitAvatarUrl}
                alt={props.unitName}
                style={{ width: '34px', height: '34px', objectFit: 'cover', borderRadius: '5px', border: '1px solid rgba(234, 179, 8, 0.6)', flexShrink: 0 }}
              />
            ) : (
              <span style={{ fontSize: '20px', flexShrink: 0 }}>👤</span>
            )}
            <span>{props.unitName}</span>
          </div>
          {props.unitItems.length === 0 && (
            <div style={{ fontSize: '12px', color: '#94a3b8', padding: '4px 8px' }}>No items</div>
          )}
          {props.unitItems.map((item, index) =>
            renderRow(item, index, `convoy-deposit-${index}`, () => props.onDeposit(index)))}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={headerStyle}>{`Convoy ${props.convoyCount}/${props.convoyCapacity}`}</div>
          {props.convoyItems.length === 0 && (
            <div style={{ fontSize: '12px', color: '#94a3b8', padding: '4px 8px' }}>Empty</div>
          )}
          {props.convoyItems.map((item, index) =>
            renderRow(item, index, `convoy-withdraw-${index}`, () => props.onWithdraw(index)))}
        </div>
      </div>
      <button
        data-testid="convoy-close"
        onClick={props.onClose}
        style={{
          width: '100%',
          padding: '6px 10px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#fca5a5',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          textAlign: 'left',
          textShadow: '1px 1px 0 #000',
          borderRadius: '4px',
        }}
      >
        Done
      </button>
    </div>
  );
};
