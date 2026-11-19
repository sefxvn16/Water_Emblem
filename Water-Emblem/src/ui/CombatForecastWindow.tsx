import React from 'react';
import type { CombatForecast } from '../core/combat/types';
import type { ExtendedUnitState } from '../core/data/chapterData';
import { DS_COLORS, DS_RADII, DS_Z, primaryButtonStyle, secondaryButtonStyle, sharedPanelStyle, statRowStyle, statValueStyle } from './designSystem';
import { useAnchoredOverlay } from './overlayAnchor';
import { getItemIcon } from './itemIcon';

interface CombatForecastWindowProps {
  forecast: CombatForecast;
  attacker: ExtendedUnitState;
  defender: ExtendedUnitState;
  onConfirm: () => void;
  onCancel: () => void;
}

/** FE3-styled combat forecast popup with visual HP delta transition, hit/avoid/crit, and weapon icons. */
export const CombatForecastWindow: React.FC<CombatForecastWindowProps> = ({
  forecast,
  attacker,
  defender,
  onConfirm,
  onCancel,
}) => {
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

  // Weapon icons
  const attWeaponIcon = getItemIcon(attacker.weapon.id, attacker.weapon.type);
  const defWeaponIcon = getItemIcon(defender.weapon.id, defender.weapon.type);

  // Top-left by default (FE3: forecast overlays the left edge); flips to
  // another corner when it would cover the attacker or defender tile (R6).
  const { ref, style: anchorStyle } = useAnchoredOverlay({
    tile: attacker.unit.position,
    avoidTiles: [defender.unit.position],
    width: 340,
    prefer: 'top-left',
    avoidHudCluster: true,
  });

  // One label–value row: labels share a left edge, values a right-aligned column (R5).
  const renderStatRow = (label: string, value: React.ReactNode, valueColor?: string) => (
    <div style={statRowStyle}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <strong style={{ ...statValueStyle, color: valueColor ?? '#ffffff' }}>{value}</strong>
    </div>
  );

  // Weapon uses
  const attUses = attacker.inventory.find((i) => i.itemId === attacker.weapon.id)?.uses ?? (attacker.weapon.maxUses ?? 40);
  const defUses = defender.inventory.find((i) => i.itemId === defender.weapon.id)?.uses ?? (defender.weapon.maxUses ?? 40);

  const renderSideCard = (
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

    return (
      <div
        style={{
          backgroundColor: isPlayer ? '#0f275c' : '#450a0a',
          border: `1.5px solid ${isPlayer ? '#3b82f6' : '#ef4444'}`,
          borderRadius: '6px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: 0,
        }}
      >
        {/* Header: Avatar + Name + Weapon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '4px',
              border: `1.5px solid ${isPlayer ? '#60a5fa' : '#f87171'}`,
              overflow: 'hidden',
              flexShrink: 0,
              backgroundColor: '#07123d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {u.avatarUrl ? (
              <img
                src={u.avatarUrl}
                alt={u.unit.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '24px' }}>👤</span>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.unit.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <img src={weaponIcon} alt="" style={{ width: '14px', height: '14px', imageRendering: 'pixelated', flexShrink: 0 }} />
              <span style={{ color: isPlayer ? '#93c5fd' : '#fca5a5', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.weapon.name}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '10px' }}>/{weaponUses}</span>
            </div>
          </div>
        </div>

        {/* HP Prediction & Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
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

        {/* Combat Stats Rows */}
        {!isPlayer && !canCounter ? (
          <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px', textAlign: 'center', padding: '12px 0' }}>
            Cannot counter
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', marginTop: '2px' }}>
            {renderStatRow('Dmg:', <>{damage} {attackCount > 1 ? `×${attackCount}` : ''}</>, '#fde047')}
            {renderStatRow('Hit:', `${hitRate}%`)}
            {renderStatRow('Avo:', `${avoidRate}%`, '#cbd5e1')}
            {renderStatRow('Crit:', `${critRate}%`, critRate > 0 ? '#fde047' : '#cbd5e1')}
            {renderStatRow('AS:', `${as}${attackCount > 1 ? ' · Double Attack' : ''}`, '#cbd5e1')}
          </div>
        )}
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
        width: '340px',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        zIndex: DS_Z.forecast,
        padding: '14px',
        borderRadius: DS_RADII.panel,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold', color: DS_COLORS.goldText, fontSize: '15px', letterSpacing: '0.03em' }}>
          ⚔️ COMBAT FORECAST
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {renderSideCard(
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
        {renderSideCard(
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

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onConfirm}
          style={{
            ...primaryButtonStyle(),
            flex: 1,
            padding: '9px 12px',
            fontSize: '14px',
          }}
        >
          ⚔️ Attack!
        </button>
        <button
          onClick={onCancel}
          style={{
            ...secondaryButtonStyle(),
            padding: '9px 16px',
            fontSize: '13px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
