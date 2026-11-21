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
  title?: string;
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
        width: 'clamp(220px, 18vw, 260px)',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 1050,
        background: 'linear-gradient(160deg, #0b1a42 0%, #11255e 60%, #0d1e4e 100%)',
        border: '2px solid #eab308',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.8), inset 0 1px 0 rgba(254, 240, 138, 0.25)',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px 6px',
          borderBottom: '1px solid rgba(234, 179, 8, 0.4)',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            fontWeight: 800,
            color: '#fde047',
            fontSize: '13px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          ⚔️ {props.title ?? 'Choose Weapon'}
        </span>
      </div>
      {props.weapons.map((weapon) => {
        const isHovered = hoveredId === weapon.itemId;
        const icon = getItemIcon(weapon.itemId, weapon.definition.type);
        return (
          <button
            key={weapon.itemId}
            type="button"
            data-testid={`weapon-pick-${weapon.itemId}`}
            onMouseEnter={() => setHoveredId(weapon.itemId)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => props.onPick(weapon.itemId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              minHeight: '44px',
              padding: '6px 10px',
              backgroundColor: isHovered
                ? 'rgba(234, 179, 8, 0.28)'
                : weapon.equipped
                  ? 'rgba(234, 179, 8, 0.16)'
                  : 'rgba(15, 23, 42, 0.65)',
              border: isHovered
                ? '1.5px solid #facc15'
                : weapon.equipped
                  ? '1.5px solid rgba(234, 179, 8, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              boxShadow: isHovered ? '0 0 10px rgba(250, 204, 21, 0.4)' : 'none',
              transform: isHovered ? 'translateX(3px)' : 'none',
              color: isHovered || weapon.equipped ? '#fde047' : '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'transform 0.1s ease, border-color 0.1s ease',
              boxSizing: 'border-box',
            }}
          >
            {icon ? (
              <img
                src={icon}
                alt=""
                style={{ width: '22px', height: '22px', imageRendering: 'pixelated', flexShrink: 0 }}
              />
            ) : null}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '13.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {weapon.definition.name}
                </span>
                {weapon.equipped && (
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', backgroundColor: '#eab308', color: '#0f172a' }}>
                    E
                  </span>
                )}
              </div>
            </div>
            <span style={{ fontSize: '11.5px', color: '#cbd5e1', fontWeight: 700, flexShrink: 0 }}>
              {rangeLabel(props.unit, weapon)} · <span style={{ color: '#fde047' }}>{weapon.uses}</span>/{weapon.definition.maxUses}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        data-testid="weapon-pick-cancel"
        onClick={props.onCancel}
        style={{
          width: '100%',
          minHeight: '38px',
          padding: '6px 10px',
          backgroundColor: 'rgba(69, 10, 10, 0.5)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#fca5a5',
          fontSize: '13px',
          fontWeight: 800,
          cursor: 'pointer',
          textAlign: 'center',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          borderRadius: '5px',
          marginTop: '4px',
          transition: 'background 0.1s ease',
        }}
      >
        Cancel
      </button>
    </div>
  );
};
