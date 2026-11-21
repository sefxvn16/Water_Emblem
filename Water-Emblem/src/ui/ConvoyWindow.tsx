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
    actionLabel: string,
  ) => {
    const icon = getItemIcon(item.itemId, item.type);
    return (
      <button
        key={`${item.itemId}-${index}`}
        type="button"
        data-testid={testId}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          minHeight: '40px',
          padding: '6px 10px',
          backgroundColor: item.equipped ? 'rgba(234, 179, 8, 0.16)' : 'rgba(15, 23, 42, 0.55)',
          border: item.equipped ? '1.5px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
          color: item.equipped ? '#fde047' : '#ffffff',
          fontSize: '13px',
          fontWeight: 800,
          cursor: 'pointer',
          textAlign: 'left',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          borderRadius: '5px',
          transition: 'all 0.1s ease',
        }}
      >
        {icon ? (
          <img
            src={icon}
            alt=""
            style={{ width: '20px', height: '20px', imageRendering: 'pixelated', flexShrink: 0 }}
          />
        ) : null}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.name}
          </span>
          {item.equipped && (
            <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', backgroundColor: '#eab308', color: '#0f172a' }}>
              E
            </span>
          )}
        </div>
        <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 700, flexShrink: 0 }}>
          <span style={{ color: '#fde047' }}>{item.uses}</span>/{item.maxUses}
        </span>
        <span style={{ fontSize: '10px', color: '#93c5fd', marginLeft: '4px', flexShrink: 0 }}>
          {actionLabel}
        </span>
      </button>
    );
  };

  return (
    <div
      data-testid="convoy-window"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '640px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 1400,
        background: 'linear-gradient(160deg, #0b1a42 0%, #11255e 60%, #0d1e4e 100%)',
        border: '2px solid #eab308',
        borderRadius: '10px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.85), inset 0 1px 0 rgba(254, 240, 138, 0.25)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(234, 179, 8, 0.4)',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📦</span>
          <span style={{ fontWeight: 800, color: '#fde047', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Convoy / Kho đồ hoàng gia
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
          Click held item to deposit, click convoy item to withdraw
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Left Column: Unit Items */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', padding: '8px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 6px 6px', borderBottom: '1px solid rgba(234, 179, 8, 0.35)', marginBottom: '4px' }}>
            {props.unitAvatarUrl ? (
              <img
                src={props.unitAvatarUrl}
                alt={props.unitName}
                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #eab308', flexShrink: 0 }}
              />
            ) : (
              <span style={{ fontSize: '24px', flexShrink: 0 }}>👤</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {props.unitName}
              </div>
              <div style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 600 }}>
                {`${props.unitItems.length}/5 Items`}
              </div>
            </div>
          </div>
          {props.unitItems.length === 0 && (
            <div style={{ fontSize: '12px', color: '#94a3b8', padding: '12px 8px', fontStyle: 'italic', textAlign: 'center' }}>No items held</div>
          )}
          {props.unitItems.map((item, index) =>
            renderRow(item, index, `convoy-deposit-${index}`, () => props.onDeposit(index), 'Deposit ▶'))}
        </div>

        {/* Right Column: Convoy Items */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', padding: '8px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px 8px', borderBottom: '1px solid rgba(234, 179, 8, 0.35)', marginBottom: '4px' }}>
            <span style={{ fontWeight: 800, color: '#fde047', fontSize: '14px' }}>Supply Inventory</span>
            <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(234, 179, 8, 0.2)', border: '1px solid #eab308', color: '#fef08a' }}>
              {`Convoy ${props.convoyCount}/${props.convoyCapacity}`}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
            {props.convoyItems.length === 0 && (
              <div style={{ fontSize: '12px', color: '#94a3b8', padding: '12px 8px', fontStyle: 'italic', textAlign: 'center' }}>Convoy is empty</div>
            )}
            {props.convoyItems.map((item, index) =>
              renderRow(item, index, `convoy-withdraw-${index}`, () => props.onWithdraw(index), '◀ Withdraw'))}
          </div>
        </div>
      </div>
      <button
        type="button"
        data-testid="convoy-close"
        onClick={props.onClose}
        style={{
          width: '100%',
          minHeight: '42px',
          padding: '8px 14px',
          backgroundColor: 'rgba(69, 10, 10, 0.5)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#fca5a5',
          fontSize: '14px',
          fontWeight: 800,
          cursor: 'pointer',
          textAlign: 'center',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          borderRadius: '6px',
          marginTop: '4px',
          transition: 'background 0.1s ease',
        }}
      >
        Done
      </button>
    </div>
  );
};
