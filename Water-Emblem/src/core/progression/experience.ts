import type { ExtendedUnitState } from '../data/chapterData';
import type { SeededRNG } from '../combat/rng';
import type { CombatResult } from '../combat/types';
import { getClassDefinition } from '../class/classRules';
import charactersJson from '../../../data/characters.json' with { type: 'json' };
import balanceConfig from '../../../data/balance.json';

const STAT_KEYS = ['str', 'mag', 'skill', 'spd', 'lck', 'def', 'res'] as const;
const GROWTH_KEYS = ['hp', ...STAT_KEYS] as const;
const personalGrowthById = new Map(
  (charactersJson.characters as readonly { id: string; personalGrowths?: Readonly<Record<string, number>> }[])
    .filter((character) => character.personalGrowths !== undefined)
    .map((character) => [character.id, character.personalGrowths!] as const),
);

export function getEffectiveGrowthRates(entry: ExtendedUnitState): Readonly<Record<string, number>> {
  const personal = personalGrowthById.get(entry.unit.id);
  const classId = entry.unit.mountedClassId ?? entry.unit.classId;
  const classGrowths = getClassDefinition(classId)?.growths;
  if (!personal || !classGrowths) return entry.growths ?? {};
  return Object.fromEntries(GROWTH_KEYS.map((key) => [key, Math.max(0, (personal[key] ?? 0) + (classGrowths[key] ?? 0))]));
}

function isPromoted(entry: ExtendedUnitState): boolean {
  const classId = entry.unit.mountedClassId ?? entry.unit.classId;
  return getClassDefinition(classId)?.tier === 'promoted';
}

export function calculateCombatExp(
  actor: ExtendedUnitState,
  target: ExtendedUnitState,
  dealtDamage: boolean,
  defeatedTarget: boolean,
): number {
  const expConfig = balanceConfig.experience;
  if (actor.unit.faction !== 'player' || actor.unit.isDead || actor.stats.hp === 0 || actor.level >= expConfig.maxLevel) return 0;
  if (!dealtDamage) return expConfig.noDamageExp;

  // FE8 bmbattle.c GetUnitRoundExp/GetUnitKillExpBonus: common classRelativePower = 3.
  // Formula constants live in data/balance.json (PLAN item 134).
  const actorLevel = actor.level + (isPromoted(actor) ? expConfig.promotedLevelOffset : 0);
  const targetLevel = target.level + (isPromoted(target) ? expConfig.promotedLevelOffset : 0);
  const roundExp = Math.max(0, Math.floor((expConfig.roundExpBase - (actorLevel - targetLevel)) / expConfig.roundExpDivisor));
  // PLAN item 134: class kill bonus from classes.json, boss bonus from balance.json.
  const classKillBonus = (getClassDefinition(target.unit.classId)?.killExpBonus ?? 0)
    + (target.isBoss ? expConfig.bossKillBonus : 0);
  const killExp = defeatedTarget ? Math.max(0, (targetLevel - actorLevel) * expConfig.killExpLevelMultiplier + expConfig.killExpBase + classKillBonus) : 0;
  return Math.max(expConfig.minExp, Math.min(expConfig.maxExp, roundExp + killExp));
}

function rollGrowth(rate: number, rng: SeededRNG): number {
  // FE8 bmbattle.c GetStatIncrease: guaranteed point for each full 100%, then 1RN.
  const guaranteed = Math.floor(rate / 100);
  const remainder = rate % 100;
  return guaranteed + (rng.roll1RN(remainder) ? 1 : 0);
}

export function awardExperience(
  entry: ExtendedUnitState,
  amount: number,
  rng: SeededRNG,
): { entry: ExtendedUnitState; gainedLevel: boolean } {
  const expConfig = balanceConfig.experience;
  if (entry.unit.faction !== 'player' || entry.stats.hp === 0 || entry.level >= expConfig.maxLevel || amount <= 0) {
    return { entry, gainedLevel: false };
  }
  const next = structuredClone(entry);
  next.exp += amount;
  if (next.exp < expConfig.expPerLevel) return { entry: next, gainedLevel: false };
  next.exp -= expConfig.expPerLevel;
  next.level += 1;
  const growths = getEffectiveGrowthRates(next);
  for (const key of STAT_KEYS) {
    next.stats[key] = Math.min(balanceConfig.statCaps.stat, next.stats[key] + rollGrowth(growths[key] ?? 0, rng));
  }
  const hpGain = rollGrowth(growths.hp ?? 0, rng);
  next.stats.maxHp = Math.min(balanceConfig.statCaps.hp, next.stats.maxHp + hpGain);
  next.stats.hp = Math.min(next.stats.maxHp, next.stats.hp + hpGain);
  if (next.level >= expConfig.maxLevel) next.exp = 0;
  return { entry: next, gainedLevel: true };
}

export function applyCombatExperience(
  entries: readonly ExtendedUnitState[],
  combat: CombatResult,
  rng: SeededRNG,
): { entries: ExtendedUnitState[]; messages: string[] } {
  const next = [...entries];
  const messages: string[] = [];
  const attackerId = combat.forecast.attacker.unit.id;
  const defenderId = combat.forecast.defender.unit.id;
  for (const actorId of [attackerId, defenderId]) {
    const actorIndex = next.findIndex(({ unit }) => unit.id === actorId);
    const target = next.find(({ unit }) => unit.id === (actorId === attackerId ? defenderId : attackerId));
    const actor = next[actorIndex];
    if (!actor || !target || !combat.events.some((event) => event.attackerId === actorId)) continue;
    const dealtDamage = combat.events.some((event) => event.attackerId === actorId && event.damageDealt > 0);
    const amount = calculateCombatExp(actor, target, dealtDamage, combat.unitDefeatedId === target.unit.id);
    if (amount === 0) continue;
    const awarded = awardExperience(actor, amount, rng);
    next[actorIndex] = awarded.entry;
    messages.push(`${actor.unit.name} +${amount} EXP${awarded.gainedLevel ? ` — Level Up! Lv.${awarded.entry.level}` : ''}`);
  }
  return { entries: next, messages };
}
