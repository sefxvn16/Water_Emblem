import React, { useEffect, useRef } from 'react';
import itemsJson from '../../data/items.json';
import { calculateDisplayedCombatStats } from '../core/combat/calculator';
import { calculateSupportBonus } from '../core/combat/support';
import { getClassDefinition } from '../core/class/classRules';
import type { ExtendedUnitState } from '../core/data/chapterData';
import type { Position } from '../core/grid/types';
import { defaultTerrainRegistry } from '../core/grid/terrain';
import { getItemDisplayName, getItemIcon } from './itemIcon';

interface UnitInspectorWindowProps {
  unit: ExtendedUnitState;
  allUnits: readonly ExtendedUnitState[];
  terrainId: string;
  tile: Position;
  onClose: () => void;
}

const StatBox: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      backgroundColor: '#141418',
      border: '1px solid #2e2e38',
      borderRadius: '6px',
      padding: '8px 10px',
      boxSizing: 'border-box',
      ...style,
    }}
  >
    {children}
  </div>
);

export const UnitInspectorWindow: React.FC<UnitInspectorWindowProps> = ({
  unit: u,
  allUnits,
  terrainId,
  tile,
  onClose,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shownAt = performance.now();
    const onMouseDown = (event: MouseEvent | TouchEvent) => {
      if (event.timeStamp < shownAt) return;
      if (event.target instanceof Node && rootRef.current && !rootRef.current.contains(event.target)) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('touchstart', onMouseDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('touchstart', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const units = allUnits.map((item) => item.unit);
  const combat = calculateDisplayedCombatStats(u.unit, u.stats, u.weapon, terrainId, defaultTerrainRegistry, units);
  const hoveredTerrain = defaultTerrainRegistry.get(terrainId);
  const sup = u.unit.faction === 'player' ? calculateSupportBonus(u.unit, units) : null;
  const className = getClassDefinition(u.unit.classId)?.name ?? u.unit.classId ?? '—';
  const isPlayer = u.unit.faction === 'player';

  // Separate inventory into weapons and items
  const inventoryItems = u.inventory.map((entry) => {
    const def = itemsJson.items.find((item) => item.id === entry.itemId);
    return {
      id: entry.itemId,
      name: def?.name ?? getItemDisplayName(entry.itemId),
      type: def?.type ?? 'item',
      uses: entry.uses,
    };
  });

  const equippedInv = u.inventory.find((inv) => inv.itemId === u.weapon.id);
  const weaponList: Array<{ name: string; uses: number | string; icon: string }> = [
    {
      name: u.weapon.name,
      uses: equippedInv ? equippedInv.uses : (u.weapon.maxUses ?? 40),
      icon: getItemIcon(u.weapon.id, u.weapon.type),
    },
  ];

  const itemList: Array<{ name: string; uses: number | string; icon: string }> = [];

  for (const inv of inventoryItems) {
    const isWeapon = ['sword', 'lance', 'axe', 'bow', 'staff'].includes(inv.type);
    const entry = {
      name: inv.name,
      uses: inv.uses,
      icon: getItemIcon(inv.id, inv.type),
    };
    if (isWeapon && weaponList.length < 4) {
      weaponList.push(entry);
    } else {
      itemList.push(entry);
    }
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={`${u.unit.name} details`}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(460px, 94vw)',
        maxHeight: 'calc(100vh - 24px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 960,
        backgroundColor: '#1b1b22',
        padding: '12px',
        borderRadius: '10px',
        border: `1px solid ${isPlayer ? '#3b82f6' : '#ef4444'}`,
        boxShadow: '0 12px 32px rgba(0,0,0,0.75)',
        color: '#f3f4f6',
        fontSize: '13px',
        lineHeight: 1.45,
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#f3f4f6', fontWeight: 600 }}>Unit Details</h3>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 500,
              backgroundColor: isPlayer ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: isPlayer ? '#93c5fd' : '#fca5a5',
              border: `1px solid ${isPlayer ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            }}
          >
            {isPlayer ? 'Player' : 'Enemy'}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close unit details"
          style={{
            minWidth: '32px',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            backgroundColor: '#27272e',
            border: '1px solid #3f3f46',
            color: '#d1d5db',
            fontSize: '15px',
            cursor: 'pointer',
            borderRadius: '6px',
            lineHeight: 1,
            transition: 'background-color 0.15s ease',
          }}
        >
          ✕
        </button>
      </div>

      {/* Top Section: Identity, Portrait, Weapons */}
      <StatBox style={{ marginBottom: '8px', padding: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Unit Identity */}
          <div style={{ minWidth: '105px', lineHeight: 1.5, fontSize: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>{u.unit.name}</div>
            <div style={{ color: '#93c5fd' }}>{className}</div>
            <div style={{ color: '#9ca3af' }}>
              LV {u.level} · EXP {u.exp < 100 ? u.exp : '--'}
            </div>
            <div style={{ color: '#4ade80', fontWeight: 'bold', marginTop: '2px' }}>
              HP {u.stats.hp} / {u.stats.maxHp}
            </div>
          </div>

          {/* Avatar Portrait */}
          <div
            style={{
              width: '64px',
              height: '64px',
              flexShrink: 0,
              backgroundColor: '#0f172a',
              borderRadius: '6px',
              border: `2px solid ${isPlayer ? '#3b82f6' : '#ef4444'}`,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {u.avatarUrl ? (
              <img
                src={u.avatarUrl}
                alt={u.unit.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span style={{ fontSize: '22px' }}>👤</span>
            )}
          </div>

          {/* Weapons List */}
          <div style={{ flex: 1, minWidth: 0, fontSize: '12px', lineHeight: 1.6 }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>Weapons</div>
            {weaponList.map((w, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.name}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <span style={{ color: '#9ca3af' }}>/{w.uses}</span>
                  <img
                    src={w.icon}
                    alt=""
                    style={{ width: '16px', height: '16px', imageRendering: 'pixelated', verticalAlign: 'middle' }}
                  />
                </span>
              </div>
            ))}
            {weaponList.length < 4 &&
              Array.from({ length: 4 - weaponList.length }).map((_, idx) => (
                <div key={`empty-w-${idx}`} style={{ color: '#4b5563', fontSize: '11px' }}>
                  —
                </div>
              ))}
          </div>
        </div>
      </StatBox>

      {/* Bottom 3-Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
        {/* Panel 1: Combat Stats */}
        <StatBox style={{ fontSize: '12px', lineHeight: 1.65 }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>Combat</div>
          <div>Atk: <strong style={{ color: '#facc15' }}>{combat.atk}</strong></div>
          <div>Hit: <strong style={{ color: '#facc15' }}>{combat.hit}</strong></div>
          <div>Avo: <strong style={{ color: '#facc15' }}>{combat.avoid}</strong></div>
          <div>Crit: <strong style={{ color: '#facc15' }}>{combat.crit}</strong></div>
          <div>AS: <strong style={{ color: '#facc15' }}>{combat.as}</strong></div>
          <div>Eff: <span style={{ color: '#9ca3af' }}>{u.weapon.effectiveAgainst?.length ? u.weapon.effectiveAgainst.join(',') : '—'}</span></div>
        </StatBox>

        {/* Panel 2: Base Stats */}
        <StatBox style={{ fontSize: '12px', lineHeight: 1.65 }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>Attributes</div>
          <div>Str: <strong>{u.stats.str}</strong></div>
          <div>Skl: <strong>{u.stats.skill}</strong></div>
          <div>Spd: <strong>{u.stats.spd}</strong></div>
          <div>Lck: <strong>{u.stats.lck}</strong></div>
          <div>Mag: <strong>{u.stats.mag}</strong></div>
          <div>Def: <strong>{u.stats.def}</strong></div>
          <div>Res: <strong>{u.stats.res}</strong></div>
        </StatBox>

        {/* Panel 3: Items & Movement */}
        <StatBox style={{ fontSize: '12px', lineHeight: 1.65, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>Items</div>
            {itemList.slice(0, 4).map((it, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.name}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <span style={{ color: '#9ca3af' }}>/{it.uses}</span>
                  <img
                    src={it.icon}
                    alt=""
                    style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }}
                  />
                </span>
              </div>
            ))}
            {itemList.length === 0 && (
              <div style={{ color: '#6b7280', fontSize: '11px' }}>No items</div>
            )}
          </div>
          <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #27272a' }}>
            <div>Max HP: <strong>{u.stats.maxHp}</strong></div>
            <div>Move: <strong>{u.unit.mov}</strong></div>
          </div>
        </StatBox>
      </div>

      {/* Support Bonus if active */}
      {sup && (sup.hit > 0 || sup.avoid > 0 || sup.crit > 0) && (
        <div
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#bfdbfe',
            marginBottom: '6px',
          }}
        >
          💙 Support Bonus: +{sup.hit}% Hit · +{sup.avoid}% Avo · +{sup.crit}% Crit
        </div>
      )}

      {/* Terrain info if available */}
      {hoveredTerrain && (
        <div style={{ fontSize: '11px', color: '#86efac', textAlign: 'center', marginTop: '4px' }}>
          🗺️ Tile ({tile.x}, {tile.y}): {hoveredTerrain.name} · Avoid +{hoveredTerrain.avoidBonus}% · Def +{hoveredTerrain.defenseBonus}
        </div>
      )}
    </div>
  );
};
