import type { ExtendedUnitState } from '../data/chapterData';
import type { ItemDefinition } from '../combat/types';

/**
 * Multi-phase bosses (PLAN item 111, B11): when a boss's HP% falls to a
 * phase threshold, that phase's stat bonuses / weapon / AI role apply.
 * Each phase applies once; `bossPhase` on the unit records progress and
 * is saved with the unit. Pure.
 */

export interface BossPhaseEvent {
  unitId: string;
  unitName: string;
  phaseIndex: number;
}

export function applyBossPhases(
  units: readonly ExtendedUnitState[],
  itemById: ReadonlyMap<string, ItemDefinition>,
): { units: ExtendedUnitState[]; events: BossPhaseEvent[] } {
  const events: BossPhaseEvent[] = [];
  const next = units.map((entry) => {
    if (!entry.bossPhases || entry.unit.isDead || entry.stats.hp <= 0) return entry;
    const hpPercent = Math.floor((entry.stats.hp * 100) / Math.max(1, entry.stats.maxHp));
    let targetPhase = entry.bossPhase ?? 0;
    entry.bossPhases.forEach((phase, index) => {
      if (hpPercent <= phase.hpPercent) targetPhase = Math.max(targetPhase, index + 1);
    });
    if (targetPhase <= (entry.bossPhase ?? 0)) return entry;

    let updated = entry;
    for (let index = entry.bossPhase ?? 0; index < targetPhase; index++) {
      const phase = entry.bossPhases[index];
      if (!phase) continue;
      const stats = { ...updated.stats };
      if (phase.statBonus) {
        for (const [key, bonus] of Object.entries(phase.statBonus)) {
          if (typeof bonus === 'number') {
            const statKey = key as keyof typeof stats;
            if (typeof stats[statKey] === 'number') {
              (stats as Record<string, number>)[statKey] = (stats[statKey] as number) + bonus;
            }
          }
        }
      }
      const weapon = phase.weaponId ? itemById.get(phase.weaponId) : undefined;
      updated = {
        ...updated,
        stats,
        ...(weapon ? { weapon } : {}),
        ...(phase.aiRole ? { aiRole: phase.aiRole } : {}),
      };
      events.push({ unitId: entry.unit.id, unitName: entry.unit.name, phaseIndex: index + 1 });
    }
    return { ...updated, bossPhase: targetPhase };
  });
  return { units: next, events };
}
