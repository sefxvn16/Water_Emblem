import React from 'react';

export interface PendingActions {
  unitName: string | undefined;
  canSeize: boolean;
  talkTargetName: string | null;
  canUseVulnerary: boolean;
  promotions: readonly { id: string; name: string }[];
  villageName: string | null;
  hasAttackTargets: boolean;
}

interface ActionMenuWindowProps {
  mountLabel: string | null;
  actions: PendingActions | null;
  onToggleMount: () => void;
  onSeize: () => void;
  onTalk: () => void;
  onUseVulnerary: () => void;
  onPromote: (classId: string) => void;
  onVisitVillage: () => void;
  onWait: () => void;
  onCancelMove: () => void;
}

const actionStyle = (backgroundColor: string, border: string, fontSize = '14px', glow?: string): React.CSSProperties => ({
  width: '100%',
  padding: '10px 14px',
  backgroundColor,
  border: `1px solid ${border}`,
  borderRadius: '6px',
  color: '#fff',
  fontWeight: 'bold',
  fontSize,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  boxShadow: glow,
});

const endStyle = (backgroundColor: string): React.CSSProperties => ({
  padding: '10px',
  backgroundColor,
  border: 'none',
  borderRadius: '6px',
  color: '#fff',
  fontWeight: 'bold',
  fontSize: '14px',
  cursor: 'pointer',
  minHeight: '40px',
});

export const ActionMenuWindow: React.FC<ActionMenuWindowProps> = (props) => {
  const { mountLabel, actions } = props;
  if (mountLabel === null && actions === null) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: '72px',
        right: '28px',
        width: '240px',
        maxHeight: 'calc(100vh - 160px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {mountLabel !== null && (
        <button onClick={props.onToggleMount} title="Toggle mount status before moving" style={actionStyle('#b45309', '#f59e0b', '13px', '0 2px 6px rgba(0,0,0,0.3)')}>
          <span aria-hidden="true">🏇 </span>
          {mountLabel}
        </button>
      )}
      {actions !== null && (
        <div
          style={{
            backgroundColor: '#2c3e50',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid #3498db',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#64B5F6', fontSize: '14px', marginBottom: '2px' }}>
            Actions ({actions.unitName})
          </div>
          {actions.canSeize && (
            <button onClick={props.onSeize} style={actionStyle('#d97706', '#fbbf24', '15px', '0 3px 10px rgba(217,119,6,0.5)')}>
              <span aria-hidden="true">👑 </span>Seize Gate
            </button>
          )}
          {actions.talkTargetName !== null && (
            <button onClick={props.onTalk} style={actionStyle('#0284c7', '#38bdf8', '14px', '0 2px 8px rgba(2,132,199,0.4)')}>
              <span aria-hidden="true">💬 </span>Talk: {actions.talkTargetName}
            </button>
          )}
          {actions.canUseVulnerary && (
            <button onClick={props.onUseVulnerary} title="Restores 10 HP, consumes one use" style={actionStyle('#16a34a', '#4ade80', '14px', '0 2px 8px rgba(22,163,74,0.4)')}>
              <span aria-hidden="true">🧪 </span>Use Vulnerary
            </button>
          )}
          {actions.promotions.map((promotion) => (
            <button
              key={promotion.id}
              onClick={() => props.onPromote(promotion.id)}
              title="Promote class using a Master Seal"
              style={actionStyle('#7c3aed', '#a78bfa', '14px', '0 2px 8px rgba(124,58,237,0.4)')}
            >
              <span aria-hidden="true">🎖️ </span>Promote: {promotion.name}
            </button>
          ))}
          {actions.villageName !== null && (
            <button onClick={props.onVisitVillage} style={actionStyle('#d97706', '#fbbf24')}>
              <span aria-hidden="true">🏡 </span>Visit Village ({actions.villageName})
            </button>
          )}
          {actions.hasAttackTargets && (
            <div style={{ fontSize: '12px', color: '#FFD54F', padding: '4px 0' }}>
              🎯 Click red target tile to view combat forecast!
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <button onClick={props.onWait} style={endStyle('#27ae60')}>✓ Wait</button>
            <button onClick={props.onCancelMove} style={endStyle('#c0392b')}>✕ Cancel Move</button>
          </div>
        </div>
      )}
    </div>
  );
};
