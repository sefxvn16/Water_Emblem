import React from 'react';
import { DS_COLORS, DS_RADII, DS_SPACING, statRowStyle, statValueStyle } from './designSystem';

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

/** One inner box (Weapons, Items, Vitals): soft navy on the panel. */
export const StatBox: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      backgroundColor: DS_COLORS.inspectorBox,
      border: `1px solid ${DS_COLORS.inspectorHairline}`,
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
export const StatRow: React.FC<{ label: string; value: React.ReactNode; valueColor?: string; divider?: boolean }> = ({
  label,
  value,
  valueColor,
  divider = true,
}) => (
  <div
    style={{
      ...statRowStyle,
      padding: '6px 0',
      borderBottom: divider ? `1px solid ${DS_COLORS.inspectorHairline}` : 'none',
    }}
  >
    <span style={{ color: DS_COLORS.inspectorLabel }}>{label}</span>
    <strong style={{ ...statValueStyle, color: valueColor ?? '#f8fafc' }}>{value}</strong>
  </div>
);

/** Soft tile holding one 26px FE3 icon. */
export const IconTile: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
  <div
    style={{
      width: 40,
      height: 40,
      flexShrink: 0,
      backgroundColor: DS_COLORS.inspectorTile,
      border: `1px solid ${DS_COLORS.inspectorHairline}`,
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
export const WeaponCell: React.FC<{ name: string; uses: number | string; icon: string }> = ({ name, uses, icon }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: DS_SPACING.lg,
      backgroundColor: DS_COLORS.inspectorPanel,
      border: `1px solid ${DS_COLORS.inspectorHairline}`,
      borderRadius: DS_RADII.panel,
      padding: '8px 12px',
      minWidth: 0,
    }}
  >
    <IconTile src={icon} alt={name} />
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ fontSize: 11, color: DS_COLORS.inspectorLabel, marginTop: 1 }}>/{uses}</div>
    </div>
  </div>
);

const itemSlotStyle: React.CSSProperties = {
  flex: 1,
  height: 58,
  minWidth: 0,
  backgroundColor: DS_COLORS.inspectorPanel,
  border: `1px solid ${DS_COLORS.inspectorHairline}`,
  borderRadius: DS_RADII.panel,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  padding: '4px 2px',
  boxSizing: 'border-box',
};

/** One item slot: icon + name + uses; a dashed empty slot when nothing is carried. */
export const ItemSlot: React.FC<{ item?: { name: string; uses: number | string; icon: string } }> = ({ item }) => {
  if (!item) {
    return <div style={{ ...itemSlotStyle, borderStyle: 'dashed', color: '#5b6b85', fontSize: 11 }}>—</div>;
  }
  return (
    <div style={itemSlotStyle} title={item.name}>
      <img src={item.icon} alt={item.name} style={{ width: 26, height: 26, imageRendering: 'pixelated' }} />
      <div
        style={{
          fontSize: 10,
          lineHeight: 1.2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {item.name}
      </div>
      <div style={{ fontSize: 10, lineHeight: 1.2, color: DS_COLORS.inspectorLabel }}>/{item.uses}</div>
    </div>
  );
};
