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
    gap: '2px',
  };

  const renderSide = (side: TradeSide, sideKey: 'left' | 'right') => (
    <div style={panelStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px 6px',
          borderBottom: '1px solid rgba(234, 179, 8, 0.4)',
          marginBottom: '2px',
        }}
      >
        {side.avatarUrl ? (
          <img
            src={side.avatarUrl}
            alt={side.unitName}
            style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.6)', flexShrink: 0 }}
          />
        ) : (
          <span style={{ fontSize: '22px', flexShrink: 0 }}>👤</span>
        )}
        <span
          style={{
            fontWeight: 'bold',
            color: '#93c5fd',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {side.unitName}
        </span>
      </div>
      {side.items.map((item, index) => {
        const selected = selection?.side === sideKey && selection.index === index;
        const icon = getItemIcon(item.itemId, item.type);
        return (
          <button
            key={`${item.itemId}-${index}`}
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
              gap: '6px',
              width: '100%',
              padding: '5px 8px',
              backgroundColor: selected ? 'rgba(234, 179, 8, 0.35)' : item.equipped ? 'rgba(234, 179, 8, 0.14)' : 'transparent',
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
      })}
      <button
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
          padding: '5px 8px',
          backgroundColor: 'transparent',
          border: '1px dashed rgba(234, 179, 8, 0.5)',
          color: selection && selection.side !== sideKey ? '#fde047' : '#64748b',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: selection && selection.side !== sideKey ? 'pointer' : 'default',
          borderRadius: '4px',
          marginTop: '2px',
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
        width: '520px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 160px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 960,
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
        Trade
      </div>
      {props.right === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '13px', color: '#e2e8f0', padding: '2px 8px 6px' }}>
            Choose a partner:
          </div>
          {props.partnerChoices.map((choice) => (
            <button
              key={choice.unitId}
              data-testid={`trade-partner-${choice.unitId}`}
              onClick={() => props.onPickPartner(choice.unitId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 10px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textAlign: 'left',
                textShadow: '1px 1px 0 #000',
                borderRadius: '4px',
              }}
            >
              {choice.avatarUrl ? (
                <img
                  src={choice.avatarUrl}
                  alt={choice.unitName}
                  style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '5px', border: '1px solid rgba(234, 179, 8, 0.6)', flexShrink: 0 }}
                />
              ) : (
                <span style={{ fontSize: '18px', flexShrink: 0 }}>👤</span>
              )}
              <span>{choice.unitName}</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px' }}>
          {renderSide(props.left, 'left')}
          {renderSide(props.right, 'right')}
        </div>
      )}
      <button
        data-testid="trade-close"
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
