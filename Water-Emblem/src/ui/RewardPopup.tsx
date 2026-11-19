import React from 'react';
import { DS_COLORS, DS_RADII, primaryButtonStyle, sharedPanelStyle } from './designSystem';

export interface RewardPopupData {
  kind: 'item' | 'gold' | 'recruit';
  title: string;
  name: string;
  /** Item icon or character avatar URL. */
  imageUrl?: string;
  detail?: string;
}

/**
 * Centered reward popup (PLAN item 131): shows the item icon or the
 * recruited character's avatar when a village is visited, a chest is
 * opened, or a unit joins the army.
 */
export const RewardPopup: React.FC<{ data: RewardPopupData; onClose: () => void }> = ({ data, onClose }) => (
  // Owner correction 2026-11-19: no full-screen dim layer. The catcher is
  // transparent; only the small centered panel is visible. Tapping
  // anywhere outside the panel (or the OK button) closes it.
  <div
    data-testid="reward-popup"
    onClick={onClose}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    }}
  >
    <div
      onClick={(event) => event.stopPropagation()}
      style={{
        ...sharedPanelStyle,
        borderRadius: DS_RADII.panel,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        minWidth: '220px',
        maxWidth: 'calc(100vw - 32px)',
        textAlign: 'center',
        boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
      }}
    >
      <div style={{ fontWeight: 'bold', color: DS_COLORS.goldText, fontSize: '16px', letterSpacing: '0.03em' }}>
        {data.title}
      </div>
      {data.imageUrl ? (
        <img
          src={data.imageUrl}
          alt=""
          style={{
            width: data.kind === 'recruit' ? '80px' : '60px',
            height: data.kind === 'recruit' ? '80px' : '60px',
            objectFit: 'cover',
            imageRendering: data.kind === 'item' ? 'pixelated' : 'auto',
            borderRadius: data.kind === 'recruit' ? '10px' : '8px',
            border: `2px solid ${DS_COLORS.gold}`,
            backgroundColor: '#07123d',
          }}
        />
      ) : (
        <div style={{ fontSize: '44px', lineHeight: 1 }}>{data.kind === 'gold' ? '💰' : '🎁'}</div>
      )}
      <div style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '15px' }}>{data.name}</div>
      {data.detail && <div style={{ color: '#cbd5e1', fontSize: '13px' }}>{data.detail}</div>}
      <button type="button" onClick={onClose} style={{ ...primaryButtonStyle, minWidth: '120px' }}>
        OK
      </button>
    </div>
  </div>
);
