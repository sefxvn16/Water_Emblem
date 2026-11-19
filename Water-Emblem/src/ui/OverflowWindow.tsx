import React from 'react';
import { getItemIcon } from './itemIcon';

export interface OverflowChoice {
  itemId: string;
  name: string;
  uses: number;
  maxUses: number;
  type: string;
}

interface OverflowWindowProps {
  /** Full-inventory prompt (PLAN item 86): discard a held item or the new one. */
  unitName: string;
  newItemName: string;
  /** Held items of the same store (weapons or items) that can be discarded. */
  choices: readonly OverflowChoice[];
  onDiscard: (itemId: string) => void;
  onDiscardNew: () => void;
  /** Send the new item to the convoy instead (PLAN item 88); absent when full. */
  onSendToConvoy?: () => void;
}

export const OverflowWindow: React.FC<OverflowWindowProps> = (props) => {
  const rowStyle: React.CSSProperties = {
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
  };

  return (
    <div
      data-testid="overflow-window"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '300px',
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
        gap: '2px',
      }}
    >
      <div
        style={{
          fontWeight: 'bold',
          color: '#93c5fd',
          fontSize: '13px',
          padding: '4px 8px 6px',
          borderBottom: '1px solid rgba(234, 179, 8, 0.4)',
          marginBottom: '2px',
        }}
      >
        {`${props.unitName}'s inventory is full`}
      </div>
      <div style={{ fontSize: '13px', color: '#e2e8f0', padding: '2px 8px 6px' }}>
        {`Discard an item to make room for ${props.newItemName}, or discard ${props.newItemName}.`}
      </div>
      {props.choices.map((choice) => {
        const icon = getItemIcon(choice.itemId, choice.type);
        return (
          <button
            key={choice.itemId}
            data-testid={`overflow-discard-${choice.itemId}`}
            onClick={() => props.onDiscard(choice.itemId)}
            style={rowStyle}
          >
            {icon && (
              <img
                src={icon}
                alt=""
                style={{ width: '20px', height: '20px', imageRendering: 'pixelated', flexShrink: 0 }}
              />
            )}
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {`Discard ${choice.name}`}
            </span>
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{choice.uses}/{choice.maxUses}</span>
          </button>
        );
      })}
      {props.onSendToConvoy && (
        <button
          data-testid="overflow-send-convoy"
          onClick={props.onSendToConvoy}
          style={{ ...rowStyle, color: '#86efac' }}
        >
          {`Send ${props.newItemName} to convoy`}
        </button>
      )}
      <button
        data-testid="overflow-discard-new"
        onClick={props.onDiscardNew}
        style={{ ...rowStyle, color: '#fca5a5' }}
      >
        {`Discard ${props.newItemName}`}
      </button>
    </div>
  );
};
