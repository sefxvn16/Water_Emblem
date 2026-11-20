import React, { useLayoutEffect, useRef, useState } from 'react';
import type { Position } from '../core/grid/types';
import type { UsableWeapon } from '../core/combat/equip';
import { getAttackRange } from '../core/class/classRules';
import type { GridUnit } from '../core/grid/types';
import { getItemIcon } from './itemIcon';
import {
  ACTION_MENU_WIDTH,
  computeActionMenuPosition,
  getTileRect,
} from './tileAnchor';

interface WeaponPickerWindowProps {
  /** Tile of the acting unit; the picker opens beside it (PLAN item 85). */
  anchorTile: Position | null;
  unit: GridUnit | null;
  weapons: readonly UsableWeapon[];
  onPick: (itemId: string) => void;
  onCancel: () => void;
}

function rangeLabel(unit: GridUnit | null, weapon: UsableWeapon): string {
  if (!unit) return '';
  const range = getAttackRange(unit, weapon.definition);
  if (range.max <= 0) return 'Staff';
  return range.min === range.max ? `Rng ${range.min}` : `Rng ${range.min}-${range.max}`;
}

export const WeaponPickerWindow: React.FC<WeaponPickerWindowProps> = (props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const anchor = getTileRect(props.anchorTile);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(() => {
    if (!anchor) return null;
    return computeActionMenuPosition(
      anchor,
      [],
      ACTION_MENU_WIDTH,
      160,
      typeof window !== 'undefined' ? window.innerWidth : 1280,
      typeof window !== 'undefined' ? window.innerHeight : 720,
    );
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const box = rootRef.current;
    let next: { left: number; top: number } | null = null;
    if (box && anchor) {
      next = computeActionMenuPosition(
        anchor,
        [],
        ACTION_MENU_WIDTH,
        box.offsetHeight || 160,
        window.innerWidth,
        window.innerHeight,
      );
    }
    setPos((prev) => (prev?.left === next?.left && prev?.top === next?.top ? prev : next));
  });

  if (props.weapons.length === 0) return null;

  return (
    <div
      ref={rootRef}
      data-testid="weapon-picker"
      style={{
        position: 'fixed',
        ...(pos ? { top: `${pos.top}px`, left: `${pos.left}px` } : { bottom: '80px', right: '16px' }),
        width: `${ACTION_MENU_WIDTH}px`,
        maxHeight: 'calc(100vh - 160px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 1050,
        backgroundColor: '#0c1e5b',
        border: '2px solid #eab308',
        borderRadius: '6px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.7)',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      <div
        style={{
          fontWeight: 'bold',
          color: '#93c5fd',
          fontSize: '13px',
          padding: '4px 8px 6px',
          borderBottom: '1px solid rgba(234, 179, 8, 0.4)',
          marginBottom: '2px',
          letterSpacing: '0.02em',
        }}
      >
        Choose weapon
      </div>
      {props.weapons.map((weapon) => {
        const isHovered = hoveredId === weapon.itemId;
        const icon = getItemIcon(weapon.itemId, weapon.definition.type);
        return (
          <button
            key={weapon.itemId}
            data-testid={`weapon-pick-${weapon.itemId}`}
            onMouseEnter={() => setHoveredId(weapon.itemId)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => props.onPick(weapon.itemId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '6px 10px',
              backgroundColor: weapon.equipped ? 'rgba(234, 179, 8, 0.18)' : 'transparent',
              border: 'none',
              color: isHovered ? '#fde047' : '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              textAlign: 'left',
              textShadow: '1px 1px 0 #000',
              borderRadius: '4px',
              transition: 'color 0.1s ease',
            }}
          >
            {icon && (
              <img
                src={icon}
                alt=""
                style={{ width: '20px', height: '20px', imageRendering: 'pixelated', flexShrink: 0 }}
              />
            )}
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {weapon.definition.name}
            </span>
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
              {rangeLabel(props.unit, weapon)} · {weapon.uses}/{weapon.definition.maxUses}
            </span>
          </button>
        );
      })}
      <button
        data-testid="weapon-pick-cancel"
        onClick={props.onCancel}
        style={{
          width: '100%',
          padding: '6px 10px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#fca5a5',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          textAlign: 'left',
          textShadow: '1px 1px 0 #000',
          borderRadius: '4px',
        }}
      >
        Cancel
      </button>
    </div>
  );
};
