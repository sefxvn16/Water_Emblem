import React from 'react';
import itemsJson from '../../data/items.json';
import { calculateDisplayedCombatStats } from '../core/combat/calculator';
import { calculateSupportBonus } from '../core/combat/support';
import { getClassDefinition } from '../core/class/classRules';
import type { ExtendedUnitState } from '../core/data/chapterData';
import type { Position } from '../core/grid/types';
import { defaultTerrainRegistry } from '../core/grid/terrain';
import { getEffectiveGrowthRates } from '../core/progression/experience';

interface UnitInspectorWindowProps {
  unit: ExtendedUnitState;
  allUnits: readonly ExtendedUnitState[];
  terrainId: string;
  tile: Position;
}

export const UnitInspectorWindow: React.FC<UnitInspectorWindowProps> = ({ unit: u, allUnits, terrainId, tile }) => {
  const units = allUnits.map((item) => item.unit);
  const combat = calculateDisplayedCombatStats(u.unit, u.stats, u.weapon, terrainId, defaultTerrainRegistry, units);
  const hoveredTerrain = defaultTerrainRegistry.get(terrainId);
  const growths = u.growths ? getEffectiveGrowthRates(u) : null;
  const sup = u.unit.faction === 'player' ? calculateSupportBonus(u.unit, units) : null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        width: '300px',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 800,
        pointerEvents: 'none',
        backgroundColor: '#2a2a2a',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #444',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#FFD54F' }}>
        👤 Unit & Terrain Info
      </h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
        {u.avatarUrl && (
          <img
            src={u.avatarUrl}
            alt={u.unit.name}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '8px',
              border: `2px solid ${u.unit.faction === 'player' ? '#42a5f5' : '#ef5350'}`,
              boxShadow: '0 3px 10px rgba(0,0,0,0.6)',
              objectFit: 'cover',
              flexShrink: 0,
              backgroundColor: '#0f172a',
            }}
          />
        )}
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{u.unit.name}</div>
          {u.title && <div style={{ fontSize: '11px', color: '#aaa' }}>{u.title}</div>}
          <div style={{ fontSize: '11px', color: u.unit.faction === 'player' ? '#64b5f6' : '#ef9a9a' }}>
            {u.unit.faction === 'player' ? '🛡️ Player Faction' : '⚔️ Enemy Faction'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '13px', lineHeight: '1.55' }}>
        <div><strong>Weapon:</strong> {u.weapon.name} ({u.weapon.type.toUpperCase()}, Mt:{u.weapon.might}, Wt:{u.weapon.weight})</div>
        {u.inventory.length > 0 && <div><strong>Inventory:</strong> {u.inventory.map((entry) => `${itemsJson.items.find((item) => item.id === entry.itemId)?.name ?? entry.itemId} ×${entry.uses}`).join(' · ')}</div>}
        <div><strong>HP:</strong> {u.stats.hp} / {u.stats.maxHp} | <strong>Mov:</strong> {u.unit.mov} ({u.unit.moveType})</div>
        <div><strong>Class:</strong> {getClassDefinition(u.unit.classId)?.name ?? u.unit.classId ?? '—'} | <strong>Lv:</strong> {u.level} | <strong>EXP:</strong> {u.exp}/100</div>
        <div style={{ color: '#90caf9', fontWeight: 'bold' }}>Atk {combat.atk} · Hit {combat.hit} · Avo {combat.avoid} · Crit {combat.crit} · AS {combat.as}</div>
        <div style={{ backgroundColor: '#18181b', padding: '8px', borderRadius: '6px', margin: '6px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center', fontSize: '12px', border: '1px solid #3f3f46' }}>
          <div>Str: <strong style={{ color: '#facc15' }}>{u.stats.str}</strong></div>
          <div>Mag: <strong style={{ color: '#facc15' }}>{u.stats.mag}</strong></div>
          <div>Skl: <strong style={{ color: '#facc15' }}>{u.stats.skill}</strong></div>
          <div>Spd: <strong style={{ color: '#facc15' }}>{u.stats.spd}</strong></div>
          <div>Lck: <strong style={{ color: '#facc15' }}>{u.stats.lck}</strong></div>
          <div>Def: <strong style={{ color: '#facc15' }}>{u.stats.def}</strong></div>
          <div>Res: <strong style={{ color: '#facc15' }}>{u.stats.res}</strong></div>
          <div>Mov: <strong style={{ color: '#facc15' }}>{u.unit.mov}</strong></div>
        </div>

        {growths && (
          <div style={{ fontSize: '12px', color: '#90caf9', marginTop: '6px' }}>
            <strong>Effective Growths:</strong>
            <div style={{ color: '#cbd5e1' }}>
              HP {growths.hp}% | Str {growths.str}% | Skill {growths.skill}% | Spd {growths.spd}% | Def {growths.def}%
            </div>
          </div>
        )}

        {sup && (sup.hit > 0 || sup.avoid > 0 || sup.crit > 0) && (
          <div style={{ backgroundColor: '#1e3a8a', padding: '6px 10px', borderRadius: '6px', marginTop: '6px', fontSize: '12px', color: '#bfdbfe', border: '1px solid #3b82f6' }}>
            💙 <strong>Support Bonus:</strong>
            <div style={{ marginTop: '2px' }}>+{sup.hit}% Hit | +{sup.avoid}% Avo | +{sup.crit}% Crit</div>
          </div>
        )}
      </div>
      {hoveredTerrain && (
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444', fontSize: '13px', color: '#86efac' }}>
          <div><strong>Tile ({tile.x}, {tile.y}):</strong> {hoveredTerrain.name}</div>
          <div>Avoid: +{hoveredTerrain.avoidBonus}% | Defense: +{hoveredTerrain.defenseBonus}</div>
        </div>
      )}
    </div>
  );
};
