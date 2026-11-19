import itemsJson from '../../data/items.json' with { type: 'json' };

const CUSTOM_ITEM_ICON_MAP: Record<string, string> = {
  wing_spear: 'killer_lance',
  hammer: 'steel_axe',
  master_seal: 'knight_crest',
  heal_staff: 'heal',
  mend_staff: 'mend',
  warp_staff: 'warp',
};

const WEAPON_TYPE_FALLBACK: Record<string, string> = {
  sword: 'iron_sword',
  lance: 'iron_lance',
  axe: 'iron_axe',
  bow: 'iron_bow',
  staff: 'heal',
  consumable: 'vulnerary',
  item: 'vulnerary',
};

/**
 * Returns the FE3 icon path for a given item id or weapon type.
 */
export function getItemIcon(itemId?: string | null, type?: string | null): string {
  if (itemId) {
    const directName = CUSTOM_ITEM_ICON_MAP[itemId] ?? itemId;
    return `/icons/items/Is_fe03_${directName}.png`;
  }
  if (type) {
    const fallback = WEAPON_TYPE_FALLBACK[type.toLowerCase()] ?? 'iron_sword';
    return `/icons/items/Is_fe03_${fallback}.png`;
  }
  return '/icons/items/Is_fe03_iron_sword.png';
}

/**
 * Gets human-readable name from items.json or falls back to the id.
 */
export function getItemDisplayName(itemId: string): string {
  const found = itemsJson.items.find((item) => item.id === itemId);
  return found?.name ?? itemId;
}
