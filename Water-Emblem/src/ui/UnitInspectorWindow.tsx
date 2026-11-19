import React, { useEffect, useRef } from 'react';
import itemsJson from '../../data/items.json';
import { calculateDisplayedCombatStats } from '../core/combat/calculator';
import { calculateSupportBonus } from '../core/combat/support';
import { getClassDefinition, skillIdsOf } from '../core/class/classRules';
import { SKILLS } from '../core/combat/skills';
import type { ExtendedUnitState } from '../core/data/chapterData';
import { getFactionTone } from '../core/grid/factionTones';
import type { Position } from '../core/grid/types';
import { defaultTerrainRegistry } from '../core/grid/terrain';
import { DS_COLORS, DS_FONTS, DS_RADII, DS_SPACING, DS_Z } from './designSystem';
import { getItemDisplayName, getItemIcon } from './itemIcon';
import { ItemSlot, SectionTitle, StatBox, StatRow, WeaponCell } from './UnitInspectorParts';

interface UnitInspectorWindowProps {
  unit: ExtendedUnitState;
  allUnits: readonly ExtendedUnitState[];
  terrainId: string;
  tile: Position;
  onClose: () => void;
}

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
  const skillNames = skillIdsOf(u).map((id) => SKILLS[id]).filter((s) => s !== undefined);
  // Faction tone (treatment B): muted faction-tinted panel + accent + chip.
  const tone = getFactionTone(u.unit.faction, u.unit.isReinforcement);

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

  const equippedInv = u.weapon ? u.inventory.find((inv) => inv.itemId === u.weapon!.id) : undefined;
  const weaponList: Array<{ name: string; uses: number | string; icon: string }> = u.weapon
    ? [
        {
          name: u.weapon.name,
          uses: equippedInv ? equippedInv.uses : (u.weapon.maxUses ?? 40),
          icon: getItemIcon(u.weapon.id, u.weapon.type),
        },
      ]
    : [];

  const itemList: Array<{ name: string; uses: number | string; icon: string }> = [];

  let equippedSkipped = false;
  for (const inv of inventoryItems) {
    const isWeapon = ['sword', 'lance', 'axe', 'bow', 'staff'].includes(inv.type);
    // The equipped weapon already heads the list; skip its own inventory
    // entry so slot 1 is not shown twice (PLAN item 82). A second copy of
    // the same weapon still shows.
    if (isWeapon && !equippedSkipped && inv.id === u.weapon?.id) {
      equippedSkipped = true;
      continue;
    }
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

  const hpPct = u.stats.maxHp > 0 ? Math.min(100, (u.stats.hp / u.stats.maxHp) * 100) : 0;

  return (
    <div
      ref={rootRef}
      data-testid="inspector"
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
        zIndex: DS_Z.inspector,
        // Mockup J2 + treatment B (PLAN item 79): panel background tinted by
        // faction (muted), thin muted-gold frame, 3px faction accent bar + chip.
        backgroundColor: tone.panel,
        border: `1px solid ${DS_COLORS.inspectorFrame}`,
        borderRadius: DS_RADII.xlarge,
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        color: '#f8fafc',
        fontSize: '13px',
        lineHeight: 1.45,
      }}
    >
      {/* Faction accent bar */}
      <div data-testid="inspector-accent" style={{ height: 3, backgroundColor: tone.accent }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 12px', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: DS_COLORS.mutedGold }}>
            Unit Details
          </h3>
          <span
            data-testid="inspector-chip"
            style={{
              fontSize: '11px',
              padding: '2px 9px',
              borderRadius: '10px',
              fontWeight: 500,
              backgroundColor: tone.chipBg,
              color: tone.chipText,
              border: `1px solid ${tone.chipBorder}`,
              flexShrink: 0,
            }}
          >
            {tone.label}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close unit details"
          style={{
            width: '44px',
            height: '44px',
            minWidth: '44px',
            padding: 0,
            flexShrink: 0,
            fontSize: '15px',
            lineHeight: 1,
            backgroundColor: 'transparent',
            border: `1px solid ${tone.hairline}`,
            borderRadius: DS_RADII.panel,
            color: DS_COLORS.inspectorLabel,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          ✕
        </button>
      </div>

      {/* Hero: portrait + identity + HP bar */}
      <div style={{ display: 'flex', gap: DS_SPACING.xxxl, padding: '4px 16px 16px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '112px',
            height: '112px',
            flexShrink: 0,
            backgroundColor: tone.track,
            borderRadius: DS_RADII.large,
            border: `1px solid ${DS_COLORS.inspectorFrame}`,
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
        <div style={{ minWidth: 0, flex: 1, paddingTop: '4px' }}>
          <div style={{ fontFamily: DS_FONTS.serif, fontSize: '23px', fontWeight: 'bold', lineHeight: 1.15, overflowWrap: 'break-word' }}>
            {u.unit.name}
          </div>
          <div style={{ fontSize: '13px', color: DS_COLORS.inspectorLabel, marginTop: '5px' }}>{className}</div>
          <div style={{ fontSize: '12px', color: DS_COLORS.inspectorLabel, marginTop: '4px' }}>
            LV {u.level} · EXP {u.exp < 100 ? u.exp : '--'}
          </div>
          <div
            style={{
              marginTop: '12px',
              height: '10px',
              backgroundColor: tone.track,
              border: `1px solid ${tone.hairline}`,
              borderRadius: DS_RADII.medium,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div style={{ height: '100%', width: `${hpPct}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)' }} />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#fff',
              }}
            >
              HP {u.stats.hp} / {u.stats.maxHp}
            </span>
          </div>
        </div>
      </div>

      {/* Weapons box */}
      <StatBox tone={tone} style={{ margin: '0 16px 16px' }}>
        <SectionTitle>Weapons</SectionTitle>
        <div data-testid="inspector-weapons" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: DS_SPACING.lg }}>
          {weaponList.map((w, idx) => (
            <WeaponCell key={idx} name={w.name} uses={w.uses} icon={w.icon} tone={tone} />
          ))}
          {weaponList.length < 4 &&
            Array.from({ length: 4 - weaponList.length }).map((_, idx) => (
              <div
                key={`empty-w-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tone.panel,
                  border: `1px solid ${tone.hairline}`,
                  borderRadius: DS_RADII.panel,
                  padding: '8px 12px',
                  color: '#5b6b85',
                  fontSize: '12px',
                }}
              >
                —
              </div>
            ))}
        </div>
      </StatBox>

      {/* Combat + Attributes columns */}
      <div style={{ display: 'flex', gap: DS_SPACING.xxxl, padding: '0 16px 16px' }}>
        <div data-testid="inspector-col-combat" style={{ flex: 1, minWidth: 0 }}>
          <SectionTitle>Combat</SectionTitle>
          <StatRow label="Atk:" value={combat.atk} tone={tone} />
          <StatRow label="Hit:" value={combat.hit} tone={tone} />
          <StatRow label="Avo:" value={combat.avoid} tone={tone} />
          <StatRow label="Crit:" value={combat.crit} tone={tone} />
          <StatRow label="AS:" value={combat.as} tone={tone} />
          <StatRow
            label="Eff:"
            value={u.weapon?.effectiveAgainst?.length ? u.weapon.effectiveAgainst.join(', ') : '—'}
            valueColor="#9ca3af"
            divider={false}
            tone={tone}
          />
        </div>
        <div data-testid="inspector-col-attributes" style={{ flex: 1, minWidth: 0 }}>
          <SectionTitle>Attributes</SectionTitle>
          <StatRow label="Str:" value={u.stats.str} tone={tone} />
          <StatRow label="Skl:" value={u.stats.skill} tone={tone} />
          <StatRow label="Spd:" value={u.stats.spd} tone={tone} />
          <StatRow label="Lck:" value={u.stats.lck} tone={tone} />
          <StatRow label="Mag:" value={u.stats.mag} tone={tone} />
          <StatRow label="Def:" value={u.stats.def} tone={tone} />
          <StatRow label="Res:" value={u.stats.res} divider={false} tone={tone} />
        </div>
      </div>

      {/* Skills (PLAN items 112/113) */}
      {skillNames.length > 0 && (
        <StatBox tone={tone} style={{ margin: '0 16px 16px' }}>
          <SectionTitle>Skills</SectionTitle>
          <div data-testid="inspector-skills" style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>
            {skillNames.map((skill) => (
              <div key={skill.id} title={skill.description}>✦ {skill.name}</div>
            ))}
          </div>
        </StatBox>
      )}

      {/* Items + Vitals boxes */}
      <div style={{ display: 'flex', gap: DS_SPACING.xl, padding: '0 16px 16px' }}>
        <StatBox tone={tone} style={{ flex: 2, minWidth: 0 }}>
          <SectionTitle>Items</SectionTitle>
          <div data-testid="inspector-items" style={{ display: 'flex', gap: DS_SPACING.lg }}>
            {itemList.slice(0, 4).map((it, idx) => (
              <ItemSlot key={idx} item={it} tone={tone} />
            ))}
            {itemList.length < 4 &&
              Array.from({ length: 4 - itemList.length }).map((_, idx) => <ItemSlot key={`empty-i-${idx}`} tone={tone} />)}
          </div>
        </StatBox>
        <StatBox tone={tone} style={{ flex: 1, minWidth: 0 }}>
          <div data-testid="inspector-box-vitals">
            <SectionTitle>Vitals</SectionTitle>
            <StatRow label="Max HP:" value={u.stats.maxHp} tone={tone} />
            <StatRow label="Move:" value={u.unit.mov} divider={false} tone={tone} />
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
            borderRadius: DS_RADII.medium,
            fontSize: '12px',
            color: '#bfdbfe',
            margin: '0 16px 12px',
          }}
        >
          Support Bonus: +{sup.hit}% Hit · +{sup.avoid}% Avo · +{sup.crit}% Crit
        </div>
      )}

      {/* Terrain info if available */}
      {hoveredTerrain && (
        <div
          style={{
            fontSize: '11.5px',
            color: '#7c8db0',
            padding: '12px 16px 14px',
            borderTop: `1px solid ${tone.hairline}`,
          }}
        >
          Tile ({tile.x}, {tile.y}): {hoveredTerrain.name} · Avoid +{hoveredTerrain.avoidBonus}% · Def +{hoveredTerrain.defenseBonus}
        </div>
      )}
    </div>
  );
};
