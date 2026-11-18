import { describe, expect, it } from 'vitest';
import itemsJson from '../../data/items.json';
import { getItemDisplayName, getItemIcon } from '../../src/ui/itemIcon';

describe('itemIcon helper', () => {
  it('maps every item in items.json to an icon path', () => {
    for (const item of itemsJson.items) {
      const icon = getItemIcon(item.id, item.type);
      expect(icon).toMatch(/^\/icons\/items\/Is_fe03_.*\.png$/);
    }
  });

  it('handles known special mappings correctly', () => {
    expect(getItemIcon('wing_spear')).toBe('/icons/items/Is_fe03_killer_lance.png');
    expect(getItemIcon('master_seal')).toBe('/icons/items/Is_fe03_knight_crest.png');
    expect(getItemIcon('heal_staff')).toBe('/icons/items/Is_fe03_heal.png');
  });

  it('falls back by weapon type when itemId is missing', () => {
    expect(getItemIcon(null, 'sword')).toBe('/icons/items/Is_fe03_iron_sword.png');
    expect(getItemIcon(null, 'bow')).toBe('/icons/items/Is_fe03_iron_bow.png');
    expect(getItemIcon(null, 'staff')).toBe('/icons/items/Is_fe03_heal.png');
    expect(getItemIcon(null, null)).toBe('/icons/items/Is_fe03_iron_sword.png');
  });

  it('resolves item display names properly', () => {
    expect(getItemDisplayName('iron_sword')).toBe('Iron Sword');
    expect(getItemDisplayName('vulnerary')).toBe('Vulnerary');
    expect(getItemDisplayName('unknown_custom_id')).toBe('unknown_custom_id');
  });
});
