import type { GameEvent } from '../core/chapter/events';

/** Reward line shown in the village dialogue and the combat log. */
export function villageRewardText(events: readonly GameEvent[]): string {
  for (const event of events) {
    if (event.type === 'gold_gained' && event.source === 'village') {
      return `Received ${event.amount.toLocaleString()} Gold from the villagers!`;
    }
    if (event.type === 'item_gained' && event.source === 'village') {
      return `Received item: ${event.itemName}!`;
    }
  }
  return '';
}

/** Combat log lines for chapter events, in event order. */
export function eventLogLines(events: readonly GameEvent[], indent = ''): string[] {
  const rewardText = villageRewardText(events);
  const lines: string[] = [];
  for (const event of events) {
    switch (event.type) {
      case 'gold_gained':
        if (event.source === 'seize') lines.push(`💰 Seized castle gate! Received ${event.amount.toLocaleString()} Gold!`);
        if (event.source === 'chest') lines.push(`🎁 Opened a chest! Received ${event.amount.toLocaleString()} Gold!`);
        break;
      case 'item_gained':
        if (event.source === 'seize') lines.push(`🎁 Seized castle gate! ${event.unitName} obtained: ${event.itemName}!`);
        if (event.source === 'chest') lines.push(`🎁 ${event.unitName} opened a chest and obtained: ${event.itemName}!`);
        if (event.source === 'loot') lines.push(`${indent}🎁 ${event.unitName} obtained loot: ${event.itemName} from ${event.fromUnitName ?? 'a fallen foe'}!`);
        break;
      case 'item_overflow':
        lines.push(`${indent}⚠️ ${event.unitName}'s inventory is full! ${event.itemName} needs a free slot.`);
        break;
      case 'village_visited':
        lines.push(`🏡 ${event.unitName} visited ${event.villageName}: ${rewardText}`);
        break;
      case 'village_destroyed':
        lines.push(`🔥 The thief raided ${event.villageName.toUpperCase()}! The village was destroyed!`);
        break;
      case 'chest_opened':
        break;
      case 'door_opened':
        lines.push(`🚪 ${event.unitName} opened a door!`);
        break;
      case 'dialogue':
        if (event.kind === 'recruit') {
          lines.push(...event.lines.map(({ speaker, text }) => `${speaker}: ${text}`));
        } else if (event.kind === 'boss_start' || event.kind === 'boss_death') {
          lines.push(...event.lines.map(({ speaker, text }) => `${indent}🗣️ ${speaker}: "${text}"`));
        }
        break;
      case 'unit_recruited':
      case 'chapter_seized':
        break;
    }
  }
  return lines;
}
