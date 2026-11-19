import React, { useState } from 'react';
import { getClassDefinition } from '../core/class/classRules';
import type { ExtendedUnitState } from '../core/data/chapterData';

interface BattlePreparationModalProps {
  chapterName: string;
  lordName: string;
  lordUnitId: string;
  /** Every player unit: deployed and reserve. */
  units: readonly ExtendedUnitState[];
  deployedIds: ReadonlySet<string>;
  deployedCount: number;
  deploymentLimit: number;
  onToggle: (unitId: string) => void;
  onStart: () => void;
}

/** FE3 unit-select layout: start bar on top, 3-column roster grid, info panel for the focused unit below. */
export const BattlePreparationModal: React.FC<BattlePreparationModalProps> = (props) => {
  const { units, lordUnitId } = props;
  const [infoId, setInfoId] = useState<string>(lordUnitId);
  const info = units.find(({ unit }) => unit.id === infoId) ?? units[0];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.85)', display: 'grid', placeItems: 'center' }}>
      <section
        style={{
          width: 'min(760px, 94vw)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxSizing: 'border-box',
          background: '#172033',
          color: '#fff',
          padding: '18px',
          borderRadius: '12px',
          border: '1px solid #334155',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: '#60a5fa', fontSize: '20px' }}>⚔️ Battle Preparation: {props.chapterName}</h2>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0 0' }}>
              Select units for deployment. {props.lordName} is required commander; unselected units remain in reserve.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>
              Deployed: {props.deployedCount}/{props.deploymentLimit} units
            </div>
            <button
              onClick={props.onStart}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
              }}
            >
              Start Chapter ➔
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '6px',
            overflowY: 'auto',
            padding: '4px',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155',
          }}
        >
          {units.map((entry) => {
            const isLord = entry.unit.id === lordUnitId;
            const locked = isLord || entry.unit.isDead;
            const deployed = props.deployedIds.has(entry.unit.id);
            return (
              <label
                key={entry.unit.id}
                onMouseEnter={() => setInfoId(entry.unit.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: deployed ? '#1e3a8a' : '#1e293b',
                  border: `1px solid ${entry.unit.id === info?.unit.id ? '#fbbf24' : '#334155'}`,
                  cursor: locked ? 'default' : 'pointer',
                  fontSize: '12px',
                }}
              >
                <input
                  type="checkbox"
                  checked={deployed}
                  disabled={locked}
                  onChange={() => props.onToggle(entry.unit.id)}
                  onFocus={() => setInfoId(entry.unit.id)}
                  style={{ width: '16px', height: '16px', flexShrink: 0, cursor: 'inherit' }}
                />
                <span style={{ color: entry.unit.isDead ? '#94a3b8' : '#f8fafc', fontWeight: isLord ? 'bold' : 'normal', minWidth: 0 }}>
                  <span>{entry.unit.name} — HP {entry.stats.hp}/{entry.stats.maxHp}</span>
                  {isLord && <span style={{ display: 'block', color: '#fbbf24', fontSize: '11px' }}>Commander - Required</span>}
                  {entry.unit.isDead && <span style={{ display: 'block', fontSize: '11px' }}>Fallen</span>}
                </span>
              </label>
            );
          })}
        </div>

        {info && (
          <div
            style={{
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              padding: '10px 14px',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #334155',
              minHeight: '84px',
            }}
          >
            {info.avatarUrl && (
              <img
                src={info.avatarUrl}
                alt={info.unit.name}
                style={{ width: '72px', height: '72px', borderRadius: '8px', border: '2px solid #42a5f5', objectFit: 'cover', backgroundColor: '#020617', flexShrink: 0 }}
              />
            )}
            <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff' }}>{info.unit.name}</div>
              <div>{getClassDefinition(info.unit.classId)?.name ?? info.unit.classId ?? '—'} · LV {info.level}</div>
              <div>HP {info.stats.hp} / {info.stats.maxHp} · {info.weapon?.name ?? 'Unarmed'}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
