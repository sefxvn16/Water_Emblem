import itemsJson from '../../../data/items.json' with { type: 'json' };
import type { ItemDefinition } from '../../core/combat/types';

export const ITEM_BY_ID: ReadonlyMap<string, ItemDefinition> = new Map(
  (itemsJson.items as ItemDefinition[]).map((item) => [item.id, item]),
);
