import type { CombatResult } from './types';
import type { ChapterData, ExtendedUnitState } from '../data/chapterData';
import type { SeededRNG } from './rng';
import type { ItemDefinition } from './types';
import type { DialogueTable, GameEvent, VillageState } from '../chapter/events';
import { resolveDefeat } from '../chapter/events';
import { applyCombatExperience } from '../progression/experience';
import { applyCombatDurability } from './durability';
import { applyCombatWeaponExp } from './weaponExp';
import { applyBossPhases } from '../chapter/bossPhases';

export interface CombatSoundCue {
  type: 'miss' | 'crit' | 'nodamage' | 'weapon' | 'death';
  weaponType?: string;
}

export interface CombatResolutionResult {
  units: ExtendedUnitState[];
  logs: string[];
  soundCues: CombatSoundCue[];
  defeatEvents: readonly GameEvent[];
  gold: number;
  villageStates: Record<string, VillageState>;
  defeatedUnitId: string | null;
}

export interface ResolveCombatOptions {
  units: readonly ExtendedUnitState[];
  result: CombatResult;
  rng: SeededRNG;
  itemById: ReadonlyMap<string, ItemDefinition>;
  itemsList: readonly ItemDefinition[];
  chapter?: ChapterData;
  dialogues: DialogueTable;
  gold: number;
  villageStates: Record<string, VillageState>;
}

/**
 * Resolves all consequences of a combat result (PLAN item 135):
 * - HP updates for attacker and defender
 * - Audio sound cues and strike log lines
 * - Defeat resolution (unit dead flag, killer drops, recruitments)
 * - Experience and level up progression
 * - Weapon durability deduction
 * - Weapon proficiency (WEx) gain
 * - Boss phase transitions
 *
 * Pure, stateless core function.
 */
export function resolveCombatConsequences(options: ResolveCombatOptions): CombatResolutionResult {
  const {
    units,
    result,
    rng,
    itemById,
    itemsList,
    dialogues,
    gold: initialGold,
    villageStates: initialVillageStates,
  } = options;

  const attackerId = result.forecast.attacker.unit.id;
  const defenderId = result.forecast.defender.unit.id;

  const logs: string[] = [];
  const soundCues: CombatSoundCue[] = [];

  // 1. Strike logs and sound cues
  for (const ev of result.events) {
    const atkEntry = units.find((u) => u.unit.id === ev.attackerId);
    const defEntry = units.find((u) => u.unit.id === ev.defenderId);
    const atk = atkEntry?.unit.name || '';
    const def = defEntry?.unit.name || '';

    if (!ev.isHit) {
      soundCues.push({ type: 'miss' });
      logs.push(`  ${atk} missed ${def}!`);
    } else {
      if (ev.isCrit) {
        soundCues.push({ type: 'crit' });
      } else if (ev.damageDealt === 0) {
        soundCues.push({ type: 'nodamage' });
      } else {
        soundCues.push({ type: 'weapon', weaponType: atkEntry?.weapon?.type ?? 'sword' });
      }
      const critText = ev.isCrit ? ' [CRITICAL HIT!]' : '';
      const dmgText = ev.damageDealt === 0 ? '0 damage (No Damage)' : `${ev.damageDealt} damage`;
      logs.push(`  ${atk} strikes ${def} for ${dmgText}!${critText}`);
    }
  }

  // 2. Update post-combat HP
  let currentUnits: ExtendedUnitState[] = units.map((entry) => {
    if (entry.unit.id === attackerId) {
      return { ...entry, stats: { ...entry.stats, hp: result.forecast.attacker.stats.hp } };
    }
    if (entry.unit.id === defenderId) {
      return { ...entry, stats: { ...entry.stats, hp: result.forecast.defender.stats.hp } };
    }
    return entry;
  });

  let currentGold = initialGold;
  let currentVillageStates = { ...initialVillageStates };
  let defeatEvents: readonly GameEvent[] = [];

  // 3. Handle defeat if any unit died
  if (result.unitDefeatedId) {
    soundCues.push({ type: 'death' });
    const defeatedUnit = currentUnits.find((u) => u.unit.id === result.unitDefeatedId);
    if (defeatedUnit) {
      defeatedUnit.unit.isDead = true;
      logs.push(`  💀 ${defeatedUnit.unit.name} has fallen!`);
    }

    const killerId = result.unitDefeatedId === attackerId ? defenderId : attackerId;
    const defeat = resolveDefeat(
      { units: currentUnits, gold: currentGold, villageStates: currentVillageStates },
      result.unitDefeatedId,
      killerId,
      itemsList as ItemDefinition[],
      dialogues,
    );

    defeatEvents = defeat.events;
    currentGold = defeat.state.gold;
    currentVillageStates = defeat.state.villageStates;
    currentUnits = [...defeat.state.units] as ExtendedUnitState[];
  }

  // 4. Experience progression
  const expResult = applyCombatExperience(currentUnits, result, rng);
  currentUnits = expResult.entries;
  if (expResult.messages.length > 0) {
    logs.push(...expResult.messages.map((m) => `  ⭐ ${m}`));
  }

  // 5. Durability deduction
  currentUnits = applyCombatDurability(currentUnits, result, itemById);

  // 6. Weapon EXP (WEx)
  currentUnits = applyCombatWeaponExp(currentUnits, result);

  // 7. Boss phases
  const bossPhaseResult = applyBossPhases(currentUnits, itemById);
  currentUnits = bossPhaseResult.units;
  for (const event of bossPhaseResult.events) {
    logs.push(`  👹 ${event.unitName} enters phase ${event.phaseIndex}!`);
  }

  return {
    units: currentUnits,
    logs,
    soundCues,
    defeatEvents,
    gold: currentGold,
    villageStates: currentVillageStates,
    defeatedUnitId: result.unitDefeatedId ?? null,
  };
}
