import React, { useState } from 'react';
import type { CombatForecast } from '../core/combat/types';
import type { ExtendedUnitState } from '../core/data/chapterData';
import { DS_COLORS, DS_RADII, DS_Z, sharedPanelStyle, statRowStyle, statValueStyle } from './designSystem';
import { useAnchoredOverlay } from './overlayAnchor';
import { getItemIcon } from './itemIcon';

export interface CombatForecastWindowProps {
  forecast: CombatForecast;
  attacker: ExtendedUnitState;
  defender: ExtendedUnitState;
  onConfirm: () => void;
  onCancel: () => void;
}

const SwordGlyph: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={DS_COLORS.navy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" />
  </svg>
);

const CrossGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={DS_COLORS.enemy} strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <path d="M5 5 L19 19M19 5 L5 19" />
  </svg>
);

/**
 * Modern Fire Emblem Combat Forecast Window (Three Houses / Engage inspired).
 * Features dual-sided cards (Player Royal Blue vs Enemy Crimson), prominent weapon
 * headers with durability and icons, dual-layer animated HP projection bars,
 * high-contrast tactical stat rows (Dmg, Hit, Crit, Avo, AS), and central tactile action buttons.
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

  const attDamagePerHit = forecast.attacker.damage;
  const attCount = forecast.attacker.attackCount;
  const defCanCounter = forecast.defender.canCounter;
  const defDamagePerHit = forecast.defender.damage;
  const defCount = forecast.defender.attackCount;

  // FE canon round-by-round HP projection (PLAN item 75 / M1):
  // Round 1: Attacker strikes.
  const defenderHpAfterHit1 = attCount > 0 ? Math.max(0, defender.stats.hp - attDamagePerHit) : defender.stats.hp;
  // Round 2: Defender counters if alive after round 1.
  const defCanCounterRound2 = defCanCounter && defCount > 0 && defenderHpAfterHit1 > 0;
  const attackerHpAfterCounter1 = defCanCounterRound2 ? Math.max(0, attacker.stats.hp - defDamagePerHit) : attacker.stats.hp;
  // Round 3: Double attack if both survive.
  let defenderHpAfter = defenderHpAfterHit1;
  let attackerHpAfter = attackerHpAfterCounter1;
  if (defenderHpAfterHit1 > 0 && attackerHpAfterCounter1 > 0) {
    if (attCount === 2) {
      defenderHpAfter = Math.max(0, defenderHpAfterHit1 - attDamagePerHit);
    } else if (defCanCounter && defCount === 2) {
      attackerHpAfter = Math.max(0, attackerHpAfterCounter1 - defDamagePerHit);
    }
  }
  const defenderHpLoss = defender.stats.hp - defenderHpAfter;
  const attackerHpLoss = attacker.stats.hp - attackerHpAfter;

  // Tactical avoid with terrain and support bonuses from core (PLAN item 75 / M2)
  const attAvoid = forecast.attacker.avoid ?? (forecast.attacker.attackSpeed + Math.floor(attacker.stats.lck / 2));
  const defAvoid = forecast.defender.avoid ?? (forecast.defender.attackSpeed + Math.floor(defender.stats.lck / 2));

  const attWeaponIcon = attacker.weapon ? getItemIcon(attacker.weapon.id, attacker.weapon.type) : '';
  const defWeaponIcon = defender.weapon ? getItemIcon(defender.weapon.id, defender.weapon.type) : '';

  const { ref, style: anchorStyle } = useAnchoredOverlay({
    tile: attacker.unit.position,
    avoidTiles: [defender.unit.position],
    width: 1020,
    prefer: 'bottom-center',
    avoidHudCluster: true,
  });

  const renderStatRow = (label: string, value: React.ReactNode, valueColor?: string, isKeyStat?: boolean) => (
    <div style={statRowStyle}>
      <span style={{ color: isKeyStat ? '#e2e8f0' : '#94a3b8', fontWeight: isKeyStat ? 600 : 400 }}>{`${label}:`}</span>
      <strong style={{ ...statValueStyle, color: valueColor ?? '#ffffff', fontSize: isKeyStat ? '14px' : '13px' }}>{value}</strong>
    </div>
  );

  const renderCountBadge = (count: number) => count > 1 ? (
    <span style={{ display: 'inline-block', marginLeft: '4px', padding: '0 5px', fontSize: '11px', fontWeight: 800, borderRadius: '3px', backgroundColor: '#f59e0b', color: '#0f172a', verticalAlign: 'middle', lineHeight: '16px' }}>
      ×{count}
    </span>
  ) : null;

  const renderCombatantCard = (
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
  ) => {
    const isPlayer = side === 'attacker';
    const maxHp = u.stats.maxHp || currentHp || 1;
    const hpAfterRatio = Math.max(0, Math.min(1, afterHp / maxHp));
    const hpCurRatio = Math.max(0, Math.min(1, currentHp / maxHp));
    const shieldClip = 'polygon(50% 0%, 100% 10%, 100% 68%, 50% 100%, 0% 68%, 0% 10%)';
    const weaponUses = u.weapon ? (u.inventory.find((i) => i.itemId === u.weapon?.id)?.uses ?? u.weapon.maxUses) : null;

    return (
      <div
        className="we-forecast-panel"
        data-side={side}
        style={{
          position: 'relative',
          background: isPlayer ? 'linear-gradient(145deg, #0b1e4a 0%, #132d69 55%, #0d2252 100%)' : 'linear-gradient(145deg, #3d0909 0%, #521111 55%, #380707 100%)',
          border: `1.5px solid ${isPlayer ? '#3b82f6' : '#ef4444'}`,
          borderRadius: '8px',
          boxShadow: isPlayer ? '0 6px 20px rgba(30, 58, 138, 0.35), inset 0 1px 0 rgba(147, 197, 253, 0.2)' : '0 6px 20px rgba(185, 28, 28, 0.35), inset 0 1px 0 rgba(252, 165, 165, 0.2)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: isPlayer ? 'row' : 'row-reverse',
          gap: '14px',
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Heraldic Shield Avatar Frame */}
        <div
          className="we-forecast-avatar"
          style={{
            position: 'relative', width: '90px', height: '142px', clipPath: shieldClip,
            backgroundColor: isPlayer ? '#facc15' : '#dc2626', flexShrink: 0, alignSelf: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.65))',
          }}
        >
          <div
            className="we-forecast-avatar-inner"
            style={{
              width: '82px', height: '134px', clipPath: shieldClip, overflow: 'hidden',
              backgroundColor: isPlayer ? '#172554' : '#450a0a', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt={u.unit.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '32px' }}>👤</span>
            )}
          </div>
          <div
            className="we-forecast-level"
            title={`Level ${u.level ?? 1}`}
            style={{
              position: 'absolute', bottom: '4px', padding: '1px 6px', borderRadius: '10px',
              backgroundColor: '#090d16', border: `1.5px solid ${isPlayer ? '#fde047' : '#f87171'}`,
              color: isPlayer ? '#fef08a' : '#fecaca', fontSize: '11px', fontWeight: 800, zIndex: 3,
            }}
          >
            Lv.{u.level ?? 1}
          </div>
        </div>

        {/* Content Details */}
        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isPlayer ? 'row' : 'row-reverse' }}>
            <span
              className="we-forecast-name"
              style={{ fontWeight: 800, color: '#ffffff', fontSize: '19px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {u.unit.name}
            </span>
            {hpLoss > 0 ? (
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#f87171', backgroundColor: 'rgba(239,68,68,0.22)', border: '1px solid #ef4444', padding: '1px 7px', borderRadius: '4px', flexShrink: 0 }}>
                -{hpLoss}{afterHp === 0 ? ' KO' : ''}
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>-0</span>
            )}
          </div>

          {/* Modern Fire Emblem Weapon Ribbon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexDirection: isPlayer ? 'row' : 'row-reverse',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              border: `1px solid ${isPlayer ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '5px',
              padding: '3px 8px',
            }}
          >
            {weaponIcon ? (
              <img src={weaponIcon} alt="" style={{ width: '20px', height: '20px', imageRendering: 'pixelated', flexShrink: 0 }} />
            ) : null}
            <span
              style={{
                fontWeight: 700,
                fontSize: '13px',
                color: isPlayer ? '#93c5fd' : '#fca5a5',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                textAlign: isPlayer ? 'left' : 'right',
              }}
            >
              {u.weapon?.name ?? 'Unarmed'}
            </span>
            {weaponUses !== null ? (
              <span style={{ fontSize: '11px', color: '#fde047', fontWeight: 700, flexShrink: 0 }}>
                {weaponUses}/{u.weapon?.maxUses}
              </span>
            ) : null}
          </div>

          {/* Dual-layer Modern HP Bar */}
          <div
            style={{
              width: '100%',
              height: '20px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              borderRadius: '4px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ width: `${hpCurRatio * 100}%`, height: '100%', backgroundColor: '#ef4444', position: 'absolute', left: 0, top: 0 }} />
            <div style={{ width: `${hpAfterRatio * 100}%`, height: '100%', backgroundColor: '#22c55e', position: 'absolute', left: 0, top: 0 }} />
            <span
              className="we-forecast-hp"
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                ...(isPlayer ? { left: '8px' } : { right: '8px' }),
                fontSize: '12.5px',
                fontWeight: 800,
                color: '#ffffff',
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                whiteSpace: 'nowrap',
              }}
            >
              {`HP: ${currentHp} → `}<span style={{ color: afterHp === 0 ? '#fca5a5' : afterHp < currentHp ? '#fde047' : '#ffffff' }}>{afterHp}</span>
            </span>
          </div>

          {/* Combat Statistics Grid */}
          {!isPlayer && !canCounter ? (
            <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px', textAlign: 'center', padding: '12px 0', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.15)' }}>
              Cannot counter
            </div>
          ) : (
            <div className="we-forecast-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px', fontSize: '13px', marginTop: '2px' }}>
              <div style={{ minWidth: 0 }}>{renderStatRow('Dmg', <>{damage}{renderCountBadge(attackCount)}</>, '#fde047', true)}</div>
              <div style={{ minWidth: 0 }}>{renderStatRow('Hit', `${hitRate}%`, hitRate >= 80 ? '#ffffff' : '#f87171', true)}</div>
              <div style={{ minWidth: 0 }}>{renderStatRow('Crit', `${critRate}%`, critRate > 0 ? '#fde047' : '#94a3b8', critRate > 0)}</div>
              <div style={{ minWidth: 0 }}>{renderStatRow('Avo', `${avoidRate}%`, '#cbd5e1')}</div>
              <div style={{ minWidth: 0 }}>{renderStatRow('AS', <>{as}{renderCountBadge(attackCount)}</>, '#cbd5e1')}</div>
              <div style={{ minWidth: 0 }} />
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
        width: '1020px',
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        zIndex: DS_Z.forecast,
        padding: '16px 14px 18px',
        borderRadius: DS_RADII.panel,
      }}
    >
      <style>{`
        @keyframes attack-glow {
          0%, 100% { box-shadow: 0 0 12px rgba(234, 179, 8, 0.5), inset 0 3px 5px rgba(255,255,255,0.75); }
          50% { box-shadow: 0 0 22px rgba(234, 179, 8, 0.85), inset 0 3px 5px rgba(255,255,255,0.9); }
        }
        @media (max-width: 640px) {
          .we-forecast-panel { padding: 8px 6px !important; gap: 8px !important; }
          .we-forecast-avatar { width: 62px !important; height: 100px !important; }
          .we-forecast-avatar-inner { width: 55px !important; height: 93px !important; }
          .we-forecast-hp { font-size: 11px !important; }
          .we-forecast-stats { font-size: 11px !important; }
          .we-forecast-name { font-size: 15px !important; }
          .we-forecast-level { font-size: 10px !important; padding: 1px 4px !important; }
        }
      `}</style>

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid rgba(234, 179, 8, 0.3)', paddingBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>⚔️</span>
          <span style={{ fontWeight: 800, color: DS_COLORS.goldText, fontSize: '15px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            COMBAT FORECAST
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
          Select action to proceed
        </div>
      </div>

      {/* Combatant Cards & Center Command Hub */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {renderCombatantCard(
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
        )}

        {/* Central Tactical Action Hub */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <button
            type="button"
            aria-label="⚔️ Attack!"
            title="Attack"
            onClick={onConfirm}
            onMouseEnter={() => setSwordHover(true)}
            onMouseLeave={() => setSwordHover(false)}
            style={{
              width: '64px', height: '64px', borderRadius: '50%', padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(circle at 32% 28%, #fef9c3 0%, #facc15 38%, #eab308 62%, #a16207 100%)',
              border: `2px solid ${DS_COLORS.goldText}`,
              boxShadow: swordHover
                ? 'inset 0 3px 5px rgba(255,255,255,0.85), inset 0 -8px 12px rgba(120,53,15,0.55), 0 0 20px rgba(234,179,8,0.9), 0 6px 14px rgba(0,0,0,0.65)'
                : 'inset 0 3px 5px rgba(255,255,255,0.75), inset 0 -8px 12px rgba(120,53,15,0.5), 0 0 12px rgba(234,179,8,0.5), 0 5px 12px rgba(0,0,0,0.6)',
              transform: swordHover ? 'scale(1.1) rotate(-6deg)' : 'scale(1)',
              transition: 'transform 0.12s ease, box-shadow 0.12s ease',
              animation: 'attack-glow 2.5s ease-in-out infinite',
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
              width: '44px', height: '44px', borderRadius: '50%', padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
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

        {renderCombatantCard(
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
        )}
      </div>
    </div>
  );
};
