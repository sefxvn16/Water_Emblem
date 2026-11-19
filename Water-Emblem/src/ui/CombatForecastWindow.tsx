import React, { useState } from 'react';
import type { CombatForecast } from '../core/combat/types';
import type { ExtendedUnitState } from '../core/data/chapterData';
import { DS_COLORS, DS_RADII, DS_Z, sharedPanelStyle, statRowStyle, statValueStyle } from './designSystem';
import { useAnchoredOverlay } from './overlayAnchor';
import { getItemIcon } from './itemIcon';

interface CombatForecastWindowProps {
  forecast: CombatForecast;
  attacker: ExtendedUnitState;
  defender: ExtendedUnitState;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Sword glyph (Lucide "sword" outline) drawn in navy on the gold confirm button. */
const SwordGlyph: React.FC = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={DS_COLORS.navy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
    <path d="M13 19l6-6" />
    <path d="M16 16l4 4" />
    <path d="M19 21l2-2" />
  </svg>
);

/** Bold red X glyph for the cancel button. */
const CrossGlyph: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={DS_COLORS.enemy} strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 5 L19 19" />
    <path d="M19 5 L5 19" />
  </svg>
);

/**
 * Combat forecast as a two-panel versus bar (PLAN item 96): attacker panel
 * left, defender panel right (mirrored), a gold sword button between them
 * confirms the attack and a red X at the top-right cancels. All numbers
 * still come verbatim from the core forecast.
 */
export const CombatForecastWindow: React.FC<CombatForecastWindowProps> = ({
  forecast,
  attacker,
  defender,
  onConfirm,
  onCancel,
}) => {
  const [swordHover, setSwordHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);

  // Attacker projected combat
  const attDamagePerHit = forecast.attacker.damage;
  const attCount = forecast.attacker.attackCount;
  const attTotalDamage = attDamagePerHit * attCount;
  const defenderHpAfter = Math.max(0, defender.stats.hp - attTotalDamage);
  const defenderHpLoss = defender.stats.hp - defenderHpAfter;

  // Defender projected combat counter (only counters if alive and canCounter)
  const defCanCounter = forecast.defender.canCounter;
  const defDamagePerHit = forecast.defender.damage;
  const defCount = forecast.defender.attackCount;
  const defTotalDamage = defCanCounter && defenderHpAfter > 0 ? defDamagePerHit * defCount : 0;
  const attackerHpAfter = Math.max(0, attacker.stats.hp - defTotalDamage);
  const attackerHpLoss = attacker.stats.hp - attackerHpAfter;

  // Avoid rates: attackSpeed + Math.floor(stats.lck / 2)
  const attAvoid = forecast.attacker.attackSpeed + Math.floor(attacker.stats.lck / 2);
  const defAvoid = forecast.defender.attackSpeed + Math.floor(defender.stats.lck / 2);

  // Weapon icons (empty when unarmed — PLAN item 84)
  const attWeaponIcon = attacker.weapon ? getItemIcon(attacker.weapon.id, attacker.weapon.type) : '';
  const defWeaponIcon = defender.weapon ? getItemIcon(defender.weapon.id, defender.weapon.type) : '';

  // Bottom-center by default (PLAN item 100); slides left (or right when
  // the left side has no room) so it never covers attacker/defender tiles.
  const { ref, style: anchorStyle } = useAnchoredOverlay({
    tile: attacker.unit.position,
    avoidTiles: [defender.unit.position],
    width: 660,
    prefer: 'bottom-center',
    avoidHudCluster: true,
  });

  // One label–value row: labels share a left edge, values a right-aligned column (R5).
  const renderStatRow = (label: string, value: React.ReactNode, valueColor?: string) => (
    <div style={statRowStyle}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <strong style={{ ...statValueStyle, color: valueColor ?? '#ffffff' }}>{value}</strong>
    </div>
  );

  // Weapon uses (0 when unarmed)
  const attUses = attacker.weapon
    ? attacker.inventory.find((i) => i.itemId === attacker.weapon!.id)?.uses ?? (attacker.weapon.maxUses ?? 40)
    : 0;
  const defUses = defender.weapon
    ? defender.inventory.find((i) => i.itemId === defender.weapon!.id)?.uses ?? (defender.weapon.maxUses ?? 40)
    : 0;

  const renderSidePanel = (
    u: ExtendedUnitState,
    side: 'attacker' | 'defender',
    currentHp: number,
    afterHp: number,
    hpLoss: number,
    damage: number,
    attackCount: number,
    hitRate: number,
    avoidRate: number,
    critRate: number,
    as: number,
    canCounter: boolean,
    weaponIcon: string,
    weaponUses: number,
  ) => {
    const isPlayer = side === 'attacker';
    const maxHp = u.stats.maxHp || currentHp || 1;
    const hpAfterRatio = Math.max(0, Math.min(1, afterHp / maxHp));
    const hpCurRatio = Math.max(0, Math.min(1, currentHp / maxHp));
    const align = isPlayer ? 'left' : 'right';

    return (
      <div
        style={{
          backgroundColor: isPlayer ? '#0f275c' : '#450a0a',
          border: `1.5px solid ${isPlayer ? '#3b82f6' : '#ef4444'}`,
          borderRadius: '6px',
          padding: '10px',
          display: 'flex',
          flexDirection: isPlayer ? 'row' : 'row-reverse',
          gap: '10px',
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Avatar at the outer edge (mirrored for the defender) */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '4px',
            border: `1.5px solid ${isPlayer ? '#60a5fa' : '#f87171'}`,
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: '#07123d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-start',
          }}
        >
          {u.avatarUrl ? (
            <img
              src={u.avatarUrl}
              alt={u.unit.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '28px' }}>👤</span>
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ textAlign: align }}>
            <div style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.unit.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexDirection: isPlayer ? 'row' : 'row-reverse' }}>
              <img src={weaponIcon} alt="" style={{ width: '14px', height: '14px', imageRendering: 'pixelated', flexShrink: 0 }} />
              <span style={{ color: isPlayer ? '#93c5fd' : '#fca5a5', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.weapon?.name ?? 'Unarmed'}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '10px' }}>/{weaponUses}</span>
            </div>
          </div>

          {/* HP Prediction & Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', flexDirection: isPlayer ? 'row' : 'row-reverse' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e2e8f0' }}>
                {`HP: ${currentHp} → `}<span style={{ color: afterHp === 0 ? '#ef4444' : afterHp < currentHp ? '#fde047' : '#4ade80' }}>{afterHp}</span>
              </span>
              {hpLoss > 0 ? (
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f87171', backgroundColor: 'rgba(239,68,68,0.2)', padding: '0 4px', borderRadius: '3px' }}>
                  -{hpLoss}{afterHp === 0 ? ' KO' : ''}
                </span>
              ) : (
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>-0</span>
              )}
            </div>
            <div style={{ width: '100%', height: '7px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
              {/* Depleted loss portion */}
              <div style={{ width: `${hpCurRatio * 100}%`, height: '100%', backgroundColor: '#ef4444', position: 'absolute', left: 0, top: 0 }} />
              {/* Retained remaining HP portion */}
              <div style={{ width: `${hpAfterRatio * 100}%`, height: '100%', backgroundColor: '#22c55e', position: 'absolute', left: 0, top: 0 }} />
            </div>
          </div>

          {/* Combat Stats */}
          {!isPlayer && !canCounter ? (
            <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px', textAlign: 'center', padding: '8px 0' }}>
              Cannot counter
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px' }}>
                {renderStatRow('Dmg:', <>{damage} {attackCount > 1 ? `×${attackCount}` : ''}</>, '#fde047')}
                {renderStatRow('Hit:', `${hitRate}%`)}
                {renderStatRow('Avo:', `${avoidRate}%`, '#cbd5e1')}
                {renderStatRow('Crit:', `${critRate}%`, critRate > 0 ? '#fde047' : '#cbd5e1')}
              </div>
              {renderStatRow('AS:', `${as}${attackCount > 1 ? ' · Double Attack' : ''}`, '#cbd5e1')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={ref}
      data-testid="forecast-window"
      style={{
        ...sharedPanelStyle,
        ...anchorStyle,
        width: '660px',
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        zIndex: DS_Z.forecast,
        padding: '10px',
        borderRadius: DS_RADII.panel,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', color: DS_COLORS.goldText, fontSize: '15px', letterSpacing: '0.03em' }}>
          ⚔️ COMBAT FORECAST
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {renderSidePanel(
          attacker,
          'attacker',
          attacker.stats.hp,
          attackerHpAfter,
          attackerHpLoss,
          forecast.attacker.damage,
          forecast.attacker.attackCount,
          forecast.attacker.hitRate,
          attAvoid,
          forecast.attacker.critRate,
          forecast.attacker.attackSpeed,
          true,
          attWeaponIcon,
          attUses,
        )}

        {/* PLAN item 125: round 3D glossy buttons — Attack on top, Cancel
            directly below it in the center column. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <button
            type="button"
            aria-label="⚔️ Attack!"
            title="Attack"
            onClick={onConfirm}
            onMouseEnter={() => setSwordHover(true)}
            onMouseLeave={() => setSwordHover(false)}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(circle at 32% 28%, #fef9c3 0%, #facc15 38%, #eab308 62%, #a16207 100%)',
              border: `2px solid ${DS_COLORS.goldText}`,
              boxShadow: swordHover
                ? 'inset 0 3px 5px rgba(255,255,255,0.85), inset 0 -8px 12px rgba(120,53,15,0.55), 0 0 18px rgba(234,179,8,0.85), 0 6px 14px rgba(0,0,0,0.65)'
                : 'inset 0 3px 5px rgba(255,255,255,0.75), inset 0 -8px 12px rgba(120,53,15,0.5), 0 0 10px rgba(234,179,8,0.5), 0 5px 12px rgba(0,0,0,0.6)',
              transform: swordHover ? 'scale(1.1) rotate(-6deg)' : 'scale(1)',
              transition: 'transform 0.12s ease, box-shadow 0.12s ease',
            }}
          >
            <SwordGlyph />
          </button>
          <button
            type="button"
            aria-label="Cancel"
            title="Cancel"
            onClick={onCancel}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
            style={{
              width: '46px',
              height: '46px',
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
                : 'inset 0 2px 4px rgba(255,255,255,0.45), inset 0 -6px 9px rgba(0,0,0,0.55), 0 4px 9px rgba(0,0,0,0.55)',
              transform: cancelHover ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease',
            }}
          >
            <CrossGlyph />
          </button>
        </div>

        {renderSidePanel(
          defender,
          'defender',
          defender.stats.hp,
          defenderHpAfter,
          defenderHpLoss,
          forecast.defender.damage,
          forecast.defender.attackCount,
          forecast.defender.hitRate,
          defAvoid,
          forecast.defender.critRate,
          forecast.defender.attackSpeed,
          defCanCounter,
          defWeaponIcon,
          defUses,
        )}
      </div>
    </div>
  );
};
