import type { ExtendedUnitState } from '../data/chapterData';
import { calculateCombatForecast, executeCombat } from './calculator';
import { applyCombatDurability } from './durability';
import { applyCombatWeaponExp } from './weaponExp';
import { awardExperience, calculateCombatExp } from '../progression/experience';
import { defaultTerrainRegistry } from '../grid/terrain';
import type { ItemDefinition, SingleAttackEvent } from './types';
import type { SeededRNG } from './rng';
import balanceConfig from '../../../data/balance.json';

/**
 * Arena (PLAN item 93): wager gold, fight a generated mirror opponent.
 * FE3 lets the player adjust the wager — a higher wager fields a stronger
 * foe for a higher payout. Defeat is non-lethal (modern style, PLAN 93):
 * the unit keeps 1 HP and loses the wager. The player strikes first each
 * round (FE3 decides first strike by Attack Speed — simplification).
 * Wager tiers and round cap are declared in data/balance.json (PLAN
 * item 134).
 */
export interface ArenaTier {
  readonly wager: number;
  /** Added to the opponent's level and combat stats. */
  readonly bonus: number;
}

export const ARENA_TIERS: readonly ArenaTier[] = balanceConfig.arena.tiers;

const MAX_ROUNDS: number = balanceConfig.arena.maxRounds;

const IRON_WEAPON_BY_TYPE: Readonly<Record<string, string>> = {
  sword: 'iron_sword',
  lance: 'iron_lance',
  axe: 'iron_axe',
  bow: 'iron_bow',
};

/** A unit can enter the arena only with a damage-dealing weapon equipped. */
export function canEnterArena(entry: ExtendedUnitState): boolean {
  return entry.weapon !== undefined && entry.weapon.type !== 'staff' && entry.weapon.type !== 'consumable';
}

/** Mirror opponent: the player's own build, toughened by the wager tier. */
export function generateArenaOpponent(
  player: ExtendedUnitState,
  tier: ArenaTier,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ExtendedUnitState | undefined {
  if (!canEnterArena(player)) return undefined;
  const weapon = itemById.get(IRON_WEAPON_BY_TYPE[player.weapon!.type] ?? '') ?? player.weapon!;
  const bonus = tier.bonus;
  const stats = {
    ...player.stats,
    maxHp: Math.min(balanceConfig.statCaps.hp, player.stats.maxHp + balanceConfig.arena.opponentHpPerBonus * bonus),
    str: Math.min(balanceConfig.statCaps.stat, player.stats.str + bonus),
    mag: Math.min(balanceConfig.statCaps.stat, player.stats.mag + bonus),
    skill: Math.min(balanceConfig.statCaps.stat, player.stats.skill + bonus),
    spd: Math.min(balanceConfig.statCaps.stat, player.stats.spd + bonus),
    def: Math.min(balanceConfig.statCaps.stat, player.stats.def + bonus),
    res: Math.min(balanceConfig.statCaps.stat, player.stats.res + bonus),
  };
  stats.hp = stats.maxHp;
  return {
    unit: {
      ...player.unit,
      id: 'arena_opponent',
      name: 'Arena Gladiator',
      faction: 'enemy',
      position: { x: player.unit.position.x + 1, y: player.unit.position.y },
      isDead: false,
      hasActed: false,
    },
    stats,
    weapon,
    inventory: [{ itemId: weapon.id, uses: weapon.maxUses ?? 40 }],
    level: Math.min(balanceConfig.experience.maxLevel, player.level + bonus),
    exp: 0,
  };
}

export interface ArenaFightOutcome {
  readonly won: boolean;
  readonly rounds: number;
  /** Player entry after the fight (HP, EXP/level, durability, WEx applied). */
  readonly playerAfter: ExtendedUnitState;
  readonly expGained: number;
  readonly events: readonly SingleAttackEvent[];
}

/**
 * Fight rounds until one side falls (cap MAX_ROUNDS; no decision = loss).
 * Gold is settled by the caller: wager deducted before the fight, on a win
 * the caller pays back twice the wager (stake + equal profit).
 */
export function runArenaFight(
  player: ExtendedUnitState,
  opponent: ExtendedUnitState,
  rng: SeededRNG,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ArenaFightOutcome {
  let working = structuredClone(player);
  let opponentHp = opponent.stats.hp;
  const events: SingleAttackEvent[] = [];
  let won = false;
  let rounds = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    rounds = round + 1;
    const forecast = calculateCombatForecast(
      working.unit,
      structuredClone(working.stats),
      working.weapon,
      opponent.unit,
      { ...opponent.stats, hp: opponentHp },
      opponent.weapon,
      1,
      defaultTerrainRegistry,
      'arena',
      'arena',
    );
    const result = executeCombat(forecast, rng);
    events.push(...result.events);
    // PLAN item 133: post-combat HP comes from the result forecast.
    working = { ...working, stats: { ...result.forecast.attacker.stats } };
    opponentHp = result.forecast.defender.stats.hp;
    working = applyCombatDurability([working], result, itemById)[0] ?? working;
    working = applyCombatWeaponExp([working], result)[0] ?? working;
    if (opponentHp <= 0) {
      won = true;
      break;
    }
    if (working.stats.hp <= 0) break;
  }

  // Non-lethal defeat: the unit walks away with 1 HP.
  if (working.stats.hp <= 0) working = { ...working, stats: { ...working.stats, hp: 1 } };

  const dealtDamage = events.some((event) => event.attackerId === player.unit.id && event.damageDealt > 0);
  const expGained = calculateCombatExp(working, opponent, dealtDamage, won);
  const awarded = awardExperience(working, expGained, rng);
  return { won, rounds, playerAfter: awarded.entry, expGained, events };
}
