import React from 'react';
import type { CombatForecast } from '../core/combat/types';
import type { ExtendedUnitState } from '../core/data/chapterData';
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', fontSize: '12px', marginTop: '2px' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Dmg: </span>
              <strong style={{ color: '#fde047' }}>
                {damage} {attackCount > 1 ? `×${attackCount}` : ''}
              </strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Hit: </span>
              <strong style={{ color: '#ffffff' }}>{hitRate}%</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Avo: </span>
              <strong style={{ color: '#cbd5e1' }}>{avoidRate}%</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Crit: </span>
              <strong style={{ color: critRate > 0 ? '#fde047' : '#cbd5e1' }}>{critRate}%</strong>
            </div>
            <div style={{ gridColumn: 'span 2', fontSize: '11px', color: '#64748b' }}>
              AS: {as} {attackCount > 1 ? '· Double Attack' : ''}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        width: '340px',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 900,
        backgroundColor: '#0c1e5b',
        padding: '14px',
        borderRadius: '8px',
        border: '2px solid #eab308',
        boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
        color: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold', color: '#fde047', fontSize: '15px', letterSpacing: '0.03em' }}>
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
            flex: 1,
            padding: '9px 12px',
            backgroundColor: '#dc2626',
            border: '1px solid #ef4444',
            borderRadius: '5px',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(220,38,38,0.4)',
            transition: 'background-color 0.15s ease',
          }}
        >
          ⚔️ Attack!
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '9px 16px',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '5px',
            color: '#cbd5e1',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
