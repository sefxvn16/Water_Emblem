import React from 'react';
import { FACTION_TONES, type FactionTone } from '../core/grid/factionTones';
import { DS_COLORS, DS_RADII, DS_SPACING, statRowStyle, statValueStyle } from './designSystem';
import type { ExtendedUnitState } from '../core/data/chapterData';
import { skillIdsOf } from '../core/class/classRules';
import { SKILLS } from '../core/combat/skills';
import { getItemIcon } from './itemIcon';
import supportsData from '../../data/supports.json' with { type: 'json' };
import charactersJson from '../../data/characters.json' with { type: 'json' };
import balanceConfig from '../../data/balance.json' with { type: 'json' };

const WEX_THRESHOLDS: Record<string, number> = balanceConfig.weaponExp.thresholds;
const CHAR_NAME_BY_ID = new Map((charactersJson.characters as readonly { id: string; name: string }[]).map((c) => [c.id, c.name]));

/** Muted-gold section title (mockup J2): small, letter-spaced, uppercase. */
export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3
    style={{
      margin: 0,
      marginBottom: DS_SPACING.lg,
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: DS_COLORS.mutedGold,
    }}
  >
    {children}
  </h3>
);

/** One inner box (Weapons, Items, Vitals): the faction tone's box colour. */
export const StatBox: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  tone?: FactionTone;
}> = ({ children, style, tone = FACTION_TONES.player }) => (
  <div
    style={{
      backgroundColor: tone.box,
      border: `1px solid ${tone.hairline}`,
      borderRadius: DS_RADII.large,
      padding: '14px 16px',
      boxSizing: 'border-box',
      ...style,
    }}
  >
    {children}
  </div>
);

/** One label–value row: the value sits in a right-aligned column. */
export const StatRow: React.FC<{
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  divider?: boolean;
  tone?: FactionTone;
}> = ({ label, value, valueColor, divider = true, tone = FACTION_TONES.player }) => (
  <div
    style={{
      ...statRowStyle,
      padding: '6px 0',
      borderBottom: divider ? `1px solid ${tone.hairline}` : 'none',
    }}
  >
    <span style={{ color: DS_COLORS.inspectorLabel }}>{label}</span>
    <strong style={{ ...statValueStyle, color: valueColor ?? '#f8fafc' }}>{value}</strong>
  </div>
);

/** Soft tile holding one 26px FE3 icon. */
export const IconTile: React.FC<{ src: string; alt: string; tone?: FactionTone }> = ({
  src,
  alt,
  tone = FACTION_TONES.player,
}) => (
  <div
    style={{
      width: 40,
      height: 40,
      flexShrink: 0,
      backgroundColor: tone.tile,
      border: `1px solid ${tone.hairline}`,
      borderRadius: DS_RADII.panel,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <img src={src} alt={alt} style={{ width: 26, height: 26, imageRendering: 'pixelated' }} />
  </div>
);

/** One weapon in the 2×2 grid: icon leading, name + uses beside it. */
export const WeaponCell: React.FC<{
  name: string;
  uses: number | string;
  icon: string;
  tone?: FactionTone;
}> = ({ name, uses, icon, tone = FACTION_TONES.player }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: DS_SPACING.lg,
      backgroundColor: tone.panel,
      border: `1px solid ${tone.hairline}`,
      borderRadius: DS_RADII.panel,
      padding: '8px 12px',
      minWidth: 0,
    }}
  >
    <IconTile src={icon} alt={name} tone={tone} />
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ fontSize: 11, color: DS_COLORS.inspectorLabel, marginTop: 1 }}>/{uses}</div>
    </div>
  </div>
);

const itemSlotStyle = (tone: FactionTone): React.CSSProperties => ({
  flex: 1,
  height: 58,
  minWidth: 0,
  backgroundColor: tone.panel,
  border: `1px solid ${tone.hairline}`,
  borderRadius: DS_RADII.panel,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  padding: '4px 2px',
  boxSizing: 'border-box',
});

/** One item slot: icon + name + uses; a dashed empty slot when nothing is carried. */
export const ItemSlot: React.FC<{
  item?: { name: string; uses: number | string; icon: string };
  tone?: FactionTone;
}> = ({ item, tone = FACTION_TONES.player }) => {
  if (!item) {
    return <div style={{ ...itemSlotStyle(tone), borderStyle: 'dashed', color: '#5b6b85', fontSize: 11 }}>—</div>;
  }
  return (
    <div style={itemSlotStyle(tone)} title={item.name}>
      <img src={item.icon} alt={item.name} style={{ width: 26, height: 26, imageRendering: 'pixelated' }} />
      <div style={{ fontSize: 10, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
        {item.name}
      </div>
      <div style={{ fontSize: 10, lineHeight: 1.2, color: DS_COLORS.inspectorLabel }}>/{item.uses}</div>
    </div>
  );
};

const WEAPON_TYPES = [
  { id: 'sword', label: 'Sword', icon: '⚔️' },
  { id: 'lance', label: 'Lance', icon: '🍢' },
  { id: 'axe', label: 'Axe', icon: '🪓' },
  { id: 'bow', label: 'Bow', icon: '🏹' },
  { id: 'tome', label: 'Tome', icon: '📖' },
  { id: 'staff', label: 'Staff', icon: '🪄' },
] as const;

export const WeaponRanksTab: React.FC<{
  unit: ExtendedUnitState;
  tone: FactionTone;
  inventoryItems: Array<{ id: string; name: string; type: string; uses: number | string }>;
}> = ({ unit: u, tone, inventoryItems }) => {
  const ranks = u.unit.weaponRanks ?? {};
  const wexMap = u.unit.weaponExp ?? {};

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <StatBox tone={tone}>
        <SectionTitle>Weapon Proficiencies</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {WEAPON_TYPES.map((wt) => {
            const rank = ranks[wt.id];
            const wex = wexMap[wt.id] ?? 0;
            const threshold = rank ? (WEX_THRESHOLDS[rank] ?? 50) : 50;
            const pct = rank === 'A' ? 100 : Math.min(100, (wex / threshold) * 100);

            return (
              <div
                key={wt.id}
                style={{
                  backgroundColor: tone.panel,
                  border: `1px solid ${tone.hairline}`,
                  borderRadius: DS_RADII.panel,
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{wt.icon} {wt.label}</span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: rank ? DS_COLORS.goldText : '#64748b',
                      backgroundColor: rank ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: rank ? '1px solid rgba(234, 179, 8, 0.3)' : 'none',
                    }}
                  >
                    {rank ? `Rank ${rank}` : '—'}
                  </span>
                </div>
                {rank && (
                  <div>
                    <div style={{ height: '4px', backgroundColor: tone.track, borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: DS_COLORS.gold }} />
                    </div>
                    <div style={{ fontSize: '10px', color: DS_COLORS.inspectorLabel, textAlign: 'right', marginTop: '2px' }}>
                      {rank === 'A' ? 'MAX' : `${wex}/${threshold} WEx`}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </StatBox>

      <StatBox tone={tone}>
        <SectionTitle>Full Inventory ({inventoryItems.length}/5)</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {inventoryItems.map((inv, idx) => {
            const isEquipped = u.weapon?.id === inv.id && idx === 0;
            const icon = getItemIcon(inv.id, inv.type);
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: tone.panel,
                  border: `1px solid ${isEquipped ? DS_COLORS.gold : tone.hairline}`,
                  borderRadius: DS_RADII.panel,
                  padding: '8px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <img src={icon} alt="" style={{ width: 22, height: 22, imageRendering: 'pixelated' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: isEquipped ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.name} {isEquipped && <span style={{ color: DS_COLORS.gold, fontSize: '11px' }}>(E)</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: DS_COLORS.inspectorLabel }}>{inv.type}</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: DS_COLORS.inspectorLabel, flexShrink: 0 }}>
                  Uses: <strong style={{ color: '#f8fafc' }}>{inv.uses}</strong>
                </div>
              </div>
            );
          })}
          {inventoryItems.length === 0 && (
            <div style={{ color: DS_COLORS.inspectorLabel, fontStyle: 'italic', fontSize: '12px' }}>Inventory is empty.</div>
          )}
        </div>
      </StatBox>
    </div>
  );
};

export const SkillsTab: React.FC<{
  unit: ExtendedUnitState;
  tone: FactionTone;
}> = ({ unit: u, tone }) => {
  const skillList = skillIdsOf(u).map((id) => SKILLS[id]).filter((s) => s !== undefined);

  return (
    <div style={{ padding: '16px' }}>
      <StatBox tone={tone}>
        <SectionTitle>Equipped Skills & Combat Arts</SectionTitle>
        {skillList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {skillList.map((skill) => (
              <div
                key={skill.id}
                style={{
                  backgroundColor: tone.panel,
                  border: `1px solid ${tone.hairline}`,
                  borderRadius: DS_RADII.panel,
                  padding: '10px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: DS_COLORS.goldText }}>✦ {skill.name}</span>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                    PASSIVE
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.4 }}>{skill.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: DS_COLORS.inspectorLabel, fontStyle: 'italic', fontSize: '13px', padding: '8px 0' }}>
            No personal skills or combat arts learned yet.
          </div>
        )}
      </StatBox>
    </div>
  );
};

export const SupportsTab: React.FC<{
  unit: ExtendedUnitState;
  allUnits: readonly ExtendedUnitState[];
  tone: FactionTone;
}> = ({ unit: u, allUnits, tone }) => {
  const rels = supportsData.relationships.filter(
    (r: any) => r.supportedId === u.unit.id || r.supporterId === u.unit.id
  );

  return (
    <div style={{ padding: '16px' }}>
      <StatBox tone={tone}>
        <SectionTitle>Support Bonds & Affinities</SectionTitle>
        {rels.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rels.map((rel: any, idx: number) => {
              const partnerId = rel.supportedId === u.unit.id ? rel.supporterId : rel.supportedId;
              const partnerName = CHAR_NAME_BY_ID.get(partnerId) ?? partnerId;
              const partnerUnit = allUnits.find((ent) => ent.unit.id === partnerId);
              const points = u.unit.supportPoints?.[partnerId] ?? rel.startingPoints;
              const rank = points >= rel.pointsA ? 'A' : points >= rel.pointsB ? 'B' : points >= rel.pointsC ? 'C' : 'None';

              let dist: number | null = null;
              let inRange = false;
              if (partnerUnit && !partnerUnit.unit.isDead) {
                dist = Math.abs(u.unit.position.x - partnerUnit.unit.position.x) + Math.abs(u.unit.position.y - partnerUnit.unit.position.y);
                inRange = dist <= supportsData.activationRange;
              }

              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: tone.panel,
                    border: `1px solid ${inRange ? DS_COLORS.gold : tone.hairline}`,
                    borderRadius: DS_RADII.panel,
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px' }}>🤝</span>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#f8fafc' }}>{partnerName}</span>
                    </div>
                    <span
                      style={{
                        fontWeight: 'bold',
                        fontSize: '12px',
                        color: rank !== 'None' ? DS_COLORS.goldText : '#64748b',
                        backgroundColor: rank !== 'None' ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: rank !== 'None' ? '1px solid rgba(234, 179, 8, 0.3)' : 'none',
                      }}
                    >
                      {rank !== 'None' ? `Rank ${rank}` : 'No Rank'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: DS_COLORS.inspectorLabel }}>
                    <span>Bond Points: {points} / {rel.pointsA}</span>
                    {dist !== null ? (
                      <span style={{ color: inRange ? '#4ade80' : DS_COLORS.inspectorLabel }}>
                        {inRange ? `Active (${dist} tiles)` : `Deployed (${dist} tiles away)`}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>Not on battlefield</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: DS_COLORS.inspectorLabel, fontStyle: 'italic', fontSize: '13px', padding: '8px 0' }}>
            No support relations recorded for this character.
          </div>
        )}
      </StatBox>
    </div>
  );
};
