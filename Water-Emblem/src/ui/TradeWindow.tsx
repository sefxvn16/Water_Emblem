import React, { useState } from 'react';
import { getItemIcon } from './itemIcon';

export interface TradeItemRow {
  itemId: string;
  name: string;
  uses: number;
  maxUses: number;
  type: string;
  equipped: boolean;
}

export interface TradeSide {
  unitId: string;
  unitName: string;
  avatarUrl?: string;
  items: readonly TradeItemRow[];
}

interface TradeWindowProps {
  /** Two-window trade screen (PLAN item 87, FE3 layout). */
  left: TradeSide;
  right: TradeSide | null;
  /** Adjacent allies the player can pick as the trade partner. */
  partnerChoices: readonly { unitId: string; unitName: string; avatarUrl?: string }[];
  onPickPartner: (unitId: string) => void;
  onSwap: (leftIndex: number, rightIndex: number) => void;
  onMove: (fromSide: 'left' | 'right', index: number) => void;
  onClose: () => void;
}

type Selection = { side: 'left' | 'right'; index: number } | null;

export const TradeWindow: React.FC<TradeWindowProps> = (props) => {
  const [selection, setSelection] = useState<Selection>(null);

  const panelStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '8px',
    padding: '8px',
    border: '1px solid rgba(234, 179, 8, 0.3)',
  };

  const renderSide = (side: TradeSide, sideKey: 'left' | 'right') => (
    <div style={panelStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 8px 8px',
          borderBottom: '1px solid rgba(234, 179, 8, 0.35)',
          marginBottom: '4px',
        }}
      >
        {side.avatarUrl ? (
          <img
            src={side.avatarUrl}
            alt={side.unitName}
            style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #eab308', flexShrink: 0 }}
          />
        ) : (
          <span style={{ fontSize: '26px', flexShrink: 0 }}>👤</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              color: '#ffffff',
              fontSize: '15px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {side.unitName}
          </div>
          <div style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 600 }}>
            {`${side.items.length}/5 Items`}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minHeight: '180px' }}>
        {side.items.map((item, index) => {
          const selected = selection?.side === sideKey && selection.index === index;
          const icon = getItemIcon(item.itemId, item.type);
          return (
            <button
              key={`${item.itemId}-${index}`}
              type="button"
              data-testid={`trade-${sideKey}-${index}`}
              onClick={() => {
                if (selection && selection.side !== sideKey) {
                  props.onSwap(
                    selection.side === 'left' ? selection.index : index,
                    selection.side === 'right' ? selection.index : index,
                  );
                  setSelection(null);
                } else {
                  setSelection(selected ? null : { side: sideKey, index });
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                minHeight: '40px',
                padding: '6px 10px',
                backgroundColor: selected
                  ? 'rgba(234, 179, 8, 0.35)'
                  : item.equipped
                    ? 'rgba(234, 179, 8, 0.16)'
                    : 'rgba(15, 23, 42, 0.5)',
                border: selected
                  ? '1.5px solid #fde047'
                  : item.equipped
                    ? '1.5px solid rgba(234, 179, 8, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: selected ? '0 0 10px rgba(253, 224, 71, 0.5)' : 'none',
                color: selected || item.equipped ? '#fde047' : '#ffffff',
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
            </button>
          );
        })}
      </div>
      <button
        type="button"
        data-testid={`trade-move-to-${sideKey}`}
        disabled={!selection || selection.side === sideKey}
        onClick={() => {
          if (selection && selection.side !== sideKey) {
            props.onMove(selection.side, selection.index);
            setSelection(null);
          }
        }}
        style={{
          width: '100%',
          minHeight: '38px',
          padding: '6px 10px',
          backgroundColor: selection && selection.side !== sideKey ? 'rgba(234, 179, 8, 0.22)' : 'rgba(15, 23, 42, 0.3)',
          border: selection && selection.side !== sideKey ? '1.5px solid #facc15' : '1px dashed rgba(255, 255, 255, 0.15)',
          color: selection && selection.side !== sideKey ? '#fde047' : '#64748b',
          fontSize: '12.5px',
          fontWeight: 800,
          cursor: selection && selection.side !== sideKey ? 'pointer' : 'default',
          borderRadius: '5px',
          marginTop: '6px',
          transition: 'all 0.12s ease',
          boxShadow: selection && selection.side !== sideKey ? '0 0 10px rgba(250, 204, 21, 0.3)' : 'none',
        }}
      >
        {sideKey === 'left' ? '◀ Move here' : 'Move here ▶'}
      </button>
    </div>
  );

  return (
    <div
      data-testid="trade-window"
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
        zIndex: 960,
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
          <span style={{ fontSize: '18px' }}>🔁</span>
          <span style={{ fontWeight: 800, color: '#fde047', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Trade / Trao đổi vật phẩm
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
          Click an item to select, then transfer or swap
        </div>
      </div>
      {props.right === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '13px', color: '#e2e8f0', padding: '2px 8px' }}>
            Choose a companion to trade with:
          </div>
          {props.partnerChoices.map((choice) => (
            <button
              key={choice.unitId}
              type="button"
              data-testid={`trade-partner-${choice.unitId}`}
              onClick={() => props.onPickPartner(choice.unitId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                minHeight: '48px',
                padding: '8px 14px',
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                textAlign: 'left',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                borderRadius: '6px',
                transition: 'all 0.12s ease',
              }}
            >
              {choice.avatarUrl ? (
                <img
                  src={choice.avatarUrl}
                  alt={choice.unitName}
                  style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '5px', border: '1.5px solid #eab308', flexShrink: 0 }}
                />
              ) : (
                <span style={{ fontSize: '22px', flexShrink: 0 }}>👤</span>
              )}
              <span style={{ flex: 1 }}>{choice.unitName}</span>
              <span style={{ fontSize: '12px', color: '#93c5fd' }}>Select ▶</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px' }}>
          {renderSide(props.left, 'left')}
          {renderSide(props.right, 'right')}
        </div>
      )}
      <button
        type="button"
        data-testid="trade-close"
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
