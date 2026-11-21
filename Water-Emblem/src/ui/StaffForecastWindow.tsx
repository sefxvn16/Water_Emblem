import React, { useState } from 'react';
import type { StaffForecast } from '../core/combat/staff';
import { DS_COLORS, DS_RADII, DS_Z, sharedPanelStyle } from './designSystem';
import { useAnchoredOverlay } from './overlayAnchor';
import { getItemIcon } from './itemIcon';

interface StaffForecastWindowProps {
  forecast: StaffForecast;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Staff magic sparkle glyph for the confirm button */
const StaffGlyph: React.FC = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#064e3b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

/** Bold red X glyph for the cancel button */
const CrossGlyph: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={DS_COLORS.enemy} strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 5 L19 19" />
    <path d="M19 5 L5 19" />
  </svg>
);

export const StaffForecastWindow: React.FC<StaffForecastWindowProps> = ({
  forecast,
  onConfirm,
  onCancel,
}) => {
  const [castHover, setCastHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);

  const { healer, target, staff, healAmount, targetHpAfter, staffRemainingUses } = forecast;

  const healerStaffItem = healer.inventory.find((i) => i.itemId === staff.id);
  const currentUses = healerStaffItem?.uses ?? 1;

  const staffIcon = getItemIcon(staff.id, staff.type);

  const targetMaxHp = target.stats.maxHp || 1;
  const targetCurrentRatio = Math.max(0, Math.min(1, target.stats.hp / targetMaxHp));
  const targetAfterRatio = Math.max(0, Math.min(1, targetHpAfter / targetMaxHp));

  const { ref, style: anchorStyle } = useAnchoredOverlay({
    tile: healer.unit.position,
    avoidTiles: [target.unit.position],
    width: 900,
    prefer: 'bottom-center',
    avoidHudCluster: true,
  });

  const shieldClip = 'polygon(50% 0%, 100% 10%, 100% 68%, 50% 100%, 0% 68%, 0% 10%)';

  return (
    <div
      ref={ref}
      data-testid="staff-forecast-window"
      style={{
        ...sharedPanelStyle,
        ...anchorStyle,
        width: '900px',
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        zIndex: DS_Z.forecast,
        padding: '18px 12px',
        borderRadius: DS_RADII.panel,
      }}
    >
      <style>{`
        @keyframes staff-pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        @media (max-width: 640px) {
          .we-staff-panel { padding: 8px 6px !important; gap: 8px !important; }
          .we-staff-avatar { width: 62px !important; height: 100px !important; }
          .we-staff-avatar-inner { width: 55px !important; height: 93px !important; }
        }
      `}</style>

      {/* Header title */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold', color: '#6ee7b7', fontSize: '15px', letterSpacing: '0.03em' }}>
          ✨ STAFF FORECAST
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Left Side: Healer */}
        <div
          className="we-staff-panel"
          style={{
            position: 'relative',
            backgroundColor: '#0f275c',
            border: '1.5px solid #3b82f6',
            borderRadius: '6px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            flex: 1,
            minWidth: 0,
            alignItems: 'center',
          }}
        >
          {/* Avatar shield */}
          <div
            className="we-staff-avatar"
            style={{
              width: '84px',
              height: '130px',
              clipPath: shieldClip,
              backgroundColor: DS_COLORS.gold,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))',
            }}
          >
            <div
              className="we-staff-avatar-inner"
              style={{
                width: '76px',
                height: '122px',
                clipPath: shieldClip,
                backgroundColor: '#1e3a8a',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {healer.avatarUrl ? (
                <img
                  src={healer.avatarUrl}
                  alt={healer.unit.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ color: '#93c5fd', fontWeight: 'bold', fontSize: '20px' }}>
                  {healer.unit.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, fontSize: '18px', color: '#ffffff' }}>{healer.unit.name}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#93c5fd' }}>Lv. {healer.level}</span>
            </div>

            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              HP: <strong style={{ color: '#ffffff' }}>{healer.stats.hp}</strong> / {healer.stats.maxHp}
            </div>

            {/* Staff info */}
            <div
              style={{
                marginTop: '4px',
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(110, 231, 183, 0.4)',
                borderRadius: '6px',
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {staffIcon ? (
                <img src={staffIcon} alt={staff.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '18px' }}>✨</span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, color: '#6ee7b7', fontSize: '13px' }}>{staff.name}</span>
                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                  Uses: <strong style={{ color: '#fbbf24' }}>{currentUses}</strong> → {staffRemainingUses}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Action Buttons & Heal Projection */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0, padding: '0 4px' }}>
          {/* Heal Badge */}
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.5)',
              border: '1.5px solid #a7f3d0',
              whiteSpace: 'nowrap',
              animation: 'staff-pulse 2s ease-in-out infinite',
            }}
          >
            💚 +{healAmount} HP
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            data-testid="staff-confirm-btn"
            aria-label="Cast Staff"
            title="Confirm Heal"
            onClick={onConfirm}
            onMouseEnter={() => setCastHover(true)}
            onMouseLeave={() => setCastHover(false)}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(circle at 32% 28%, #a7f3d0 0%, #34d399 38%, #10b981 62%, #047857 100%)',
              border: '2px solid #6ee7b7',
              boxShadow: castHover
                ? 'inset 0 3px 5px rgba(255,255,255,0.85), inset 0 -8px 12px rgba(6,78,59,0.55), 0 0 18px rgba(16,185,129,0.85), 0 6px 14px rgba(0,0,0,0.65)'
                : 'inset 0 3px 5px rgba(255,255,255,0.75), inset 0 -8px 12px rgba(6,78,59,0.5), 0 0 10px rgba(16,185,129,0.5), 0 5px 12px rgba(0,0,0,0.6)',
              transform: castHover ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.12s ease, box-shadow 0.12s ease',
            }}
          >
            <StaffGlyph />
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            data-testid="staff-cancel-btn"
            aria-label="Cancel"
            title="Cancel"
            onClick={onCancel}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(circle at 32% 28%, #64748b 0%, #334155 45%, #1e293b 75%, #0f172a 100%)',
              border: `2px solid ${cancelHover ? DS_COLORS.enemy : '#94a3b8'}`,
              boxShadow: cancelHover
                ? 'inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -6px 9px rgba(0,0,0,0.6), 0 0 12px rgba(239,68,68,0.6), 0 5px 10px rgba(0,0,0,0.6)'
                : 'inset 0 2px 4px rgba(255,255,255,0.35), inset 0 -6px 9px rgba(0,0,0,0.55), 0 4px 8px rgba(0,0,0,0.5)',
              transform: cancelHover ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.12s ease, box-shadow 0.12s ease',
            }}
          >
            <CrossGlyph />
          </button>
        </div>

        {/* Right Side: Target Ally */}
        <div
          className="we-staff-panel"
          style={{
            position: 'relative',
            backgroundColor: '#0f275c',
            border: '1.5px solid #3b82f6',
            borderRadius: '6px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: '12px',
            flex: 1,
            minWidth: 0,
            alignItems: 'center',
          }}
        >
          {/* Avatar shield */}
          <div
            className="we-staff-avatar"
            style={{
              width: '84px',
              height: '130px',
              clipPath: shieldClip,
              backgroundColor: DS_COLORS.gold,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))',
            }}
          >
            <div
              className="we-staff-avatar-inner"
              style={{
                width: '76px',
                height: '122px',
                clipPath: shieldClip,
                backgroundColor: '#1e3a8a',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {target.avatarUrl ? (
                <img
                  src={target.avatarUrl}
                  alt={target.unit.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ color: '#93c5fd', fontWeight: 'bold', fontSize: '20px' }}>
                  {target.unit.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Info & HP Forecast */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, fontSize: '18px', color: '#ffffff' }}>{target.unit.name}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#93c5fd' }}>Lv. {target.level}</span>
            </div>

            {/* HP Numbers */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '14px' }}>
              <span style={{ color: '#94a3b8' }}>HP:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{target.stats.hp}</span>
              <span style={{ color: '#6ee7b7', fontWeight: 800 }}>➔ {targetHpAfter}</span>
              <span style={{ color: '#64748b', fontSize: '12px' }}>/ {target.stats.maxHp}</span>
            </div>

            {/* HP Bar with visual healing preview */}
            <div
              style={{
                position: 'relative',
                height: '16px',
                backgroundColor: '#090d16',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #1e293b',
              }}
            >
              {/* After-heal projected preview (light green) */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${targetAfterRatio * 100}%`,
                  backgroundColor: '#34d399',
                  transition: 'width 0.2s ease',
                }}
              />
              {/* Current HP (solid green) */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${targetCurrentRatio * 100}%`,
                  backgroundColor: '#059669',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
