import React from 'react';

export interface PhaseBannerProps {
  phase: 'player' | 'enemy' | 'reinforcements' | null;
  turnNumber?: number;
}

/**
 * Phase transition banner (PLAN item 188):
 * Displays "PLAYER PHASE", "ENEMY PHASE", or "REINFORCEMENTS!" banner
 * across the screen following FE3 / Akaneia Refined visual direction.
 */
export const PhaseBanner: React.FC<PhaseBannerProps> = ({ phase, turnNumber }) => {
  if (!phase) return null;

  const config = {
    player: {
      text: turnNumber ? `PLAYER PHASE · TURN ${turnNumber}` : 'PLAYER PHASE',
      bg: 'linear-gradient(90deg, transparent, rgba(30, 58, 138, 0.95) 20%, rgba(30, 58, 138, 0.95) 80%, transparent)',
      border: '#60a5fa',
      glow: 'rgba(96, 165, 250, 0.6)',
    },
    enemy: {
      text: turnNumber ? `ENEMY PHASE · TURN ${turnNumber}` : 'ENEMY PHASE',
      bg: 'linear-gradient(90deg, transparent, rgba(153, 27, 27, 0.95) 20%, rgba(153, 27, 27, 0.95) 80%, transparent)',
      border: '#f87171',
      glow: 'rgba(248, 113, 113, 0.6)',
    },
    reinforcements: {
      text: '⚔️ REINFORCEMENTS! ⚔️',
      bg: 'linear-gradient(90deg, transparent, rgba(126, 34, 206, 0.95) 20%, rgba(126, 34, 206, 0.95) 80%, transparent)',
      border: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.6)',
    },
  }[phase];

  return (
    <div
      data-testid={`phase-banner-${phase}`}
      role="status"
      style={{
        position: 'fixed',
        top: '40%',
        left: 0,
        right: 0,
        transform: 'translateY(-50%)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          padding: '16px 24px',
          background: config.bg,
          borderTop: `2px solid ${config.border}`,
          borderBottom: `2px solid ${config.border}`,
          boxShadow: `0 0 24px ${config.glow}`,
          textAlign: 'center',
          color: '#ffffff',
          fontSize: '22px',
          fontWeight: 900,
          letterSpacing: '4px',
          textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 12px rgba(255,255,255,0.4)',
          textTransform: 'uppercase',
          animation: 'fadeSlideInOut 1.5s ease forwards',
        }}
      >
        {config.text}
      </div>
    </div>
  );
};
