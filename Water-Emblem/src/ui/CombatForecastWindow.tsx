import React from 'react';
import type { CombatForecast } from '../core/combat/types';
import type { ExtendedUnitState } from '../core/data/chapterData';

interface CombatForecastWindowProps {
  forecast: CombatForecast;
  attacker: ExtendedUnitState;
  defender: ExtendedUnitState;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CombatForecastWindow: React.FC<CombatForecastWindowProps> = ({ forecast, attacker, defender, onConfirm, onCancel }) => (
  <div
    style={{
      position: 'fixed',
      top: '16px',
      left: '16px',
      width: '300px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      zIndex: 900,
      backgroundColor: '#1b2a47',
      padding: '14px',
      borderRadius: '8px',
      border: '2px solid #42a5f5',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    }}
  >
    <div style={{ fontWeight: 'bold', color: '#90caf9', marginBottom: '8px', fontSize: '15px' }}>
      ⚔️ COMBAT FORECAST
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '12px' }}>
      <div style={{ backgroundColor: '#0d47a1', padding: '8px', borderRadius: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          {attacker.avatarUrl && (
            <img
              src={attacker.avatarUrl}
              alt={attacker.unit.name}
              style={{ width: '54px', height: '54px', borderRadius: '6px', border: '2px solid #90caf9', objectFit: 'cover', flexShrink: 0, backgroundColor: '#0f172a' }}
            />
          )}
          <div>
            <div style={{ fontWeight: 'bold', color: '#fff' }}>{attacker.unit.name}</div>
            <div style={{ color: '#90caf9', fontSize: '11px' }}>{attacker.weapon.name}</div>
          </div>
        </div>
        <div>HP: <strong>{attacker.stats.hp}</strong></div>
        <div>Damage: <strong style={{ color: '#ffca28' }}>{forecast.attacker.damage} {forecast.attacker.attackCount > 1 ? `×${forecast.attacker.attackCount}` : ''}</strong></div>
        <div>Hit: <strong>{forecast.attacker.hitRate}%</strong></div>
        <div>Crit: <strong>{forecast.attacker.critRate}%</strong></div>
      </div>

      <div style={{ backgroundColor: '#b71c1c', padding: '8px', borderRadius: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          {defender.avatarUrl && (
            <img
              src={defender.avatarUrl}
              alt={defender.unit.name}
              style={{ width: '54px', height: '54px', borderRadius: '6px', border: '2px solid #ef9a9a', objectFit: 'cover', flexShrink: 0, backgroundColor: '#450a0a' }}
            />
          )}
          <div>
            <div style={{ fontWeight: 'bold', color: '#fff' }}>{defender.unit.name}</div>
            <div style={{ color: '#ef9a9a', fontSize: '11px' }}>{defender.weapon.name}</div>
          </div>
        </div>
        <div>HP: <strong>{defender.stats.hp}</strong></div>
        {forecast.defender.canCounter ? (
          <>
            <div>Damage: <strong style={{ color: '#ffca28' }}>{forecast.defender.damage} {forecast.defender.attackCount > 1 ? `×${forecast.defender.attackCount}` : ''}</strong></div>
            <div>Hit: <strong>{forecast.defender.hitRate}%</strong></div>
            <div>Crit: <strong>{forecast.defender.critRate}%</strong></div>
          </>
        ) : (
          <div style={{ color: '#aaa', fontStyle: 'italic', marginTop: '6px' }}>Cannot counter</div>
        )}
      </div>
    </div>

    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={onConfirm}
        style={{ flex: 1, padding: '8px', backgroundColor: '#e53935', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
      >
        ⚔️ Attack!
      </button>
      <button
        onClick={onCancel}
        style={{ padding: '8px 12px', backgroundColor: '#555', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
      >
        Cancel
      </button>
    </div>
  </div>
);
