import type { ExtendedUnitState } from '../data/chapterData';
import { calculateCombatForecast, executeCombat } from './calculator';
import { applyCombatDurability } from './durability';
import { applyCombatWeaponExp } from './weaponExp';
import { awardExperience, calculateCombatExp } from '../progression/experience';
import { defaultTerrainRegistry } from '../grid/terrain';
import { getClassDefinition } from '../class/classRules';
import type { ItemDefinition, SingleAttackEvent } from './types';
import type { SeededRNG } from './rng';
import balanceConfig from '../../../data/balance.json';
import charactersJson from '../../../data/characters.json' with { type: 'json' };

/**
 * Arena (PLAN items 93/151): wager gold, fight a randomly generated
 * opponent (owner 2026-11-20: no longer a mirror of the player). FE3 lets
 * the player adjust the wager — a higher wager fields a stronger foe for
 * a higher payout. Defeat is non-lethal (modern style, PLAN 93): the unit
 * keeps 1 HP and loses the wager. The player strikes first each round
 * (FE3 decides first strike by Attack Speed — simplification). Wager
 * tiers and round cap are declared in data/balance.json (PLAN item 134).
 */
export interface ArenaTier {
  readonly wager: number;
  /** Added to the opponent's level and combat stats. */
  readonly bonus: number;
}

export const ARENA_TIERS: readonly ArenaTier[] = balanceConfig.arena.tiers;

const MAX_ROUNDS: number = balanceConfig.arena.maxRounds;

/** Weapon by type and tier bonus (0 iron, 1 steel, 2 silver where it exists). */
const WEAPON_BY_TYPE_AND_TIER: Readonly<Record<string, readonly string[]>> = {
  sword: ['iron_sword', 'steel_sword', 'steel_sword'],
  lance: ['iron_lance', 'steel_lance', 'silver_lance'],
  axe: ['iron_axe', 'steel_axe', 'steel_axe'],
  bow: ['iron_bow', 'steel_bow', 'steel_bow'],
};

interface ArenaTemplate {
  readonly id: string;
  readonly classId: string;
  readonly baseStats: Readonly<Record<string, number>>;
  readonly growths?: Readonly<Record<string, number>>;
  readonly startingWeapons?: readonly string[];
}

/** Enemy templates from data/characters.json (PLAN item 151): the generic
 * enemy_* entries, excluding the curate (staves cannot fight). */
const ARENA_TEMPLATES: readonly ArenaTemplate[] = (charactersJson.characters as ArenaTemplate[])
  .filter((entry) => entry.id.startsWith('enemy_') && entry.classId !== 'curate');

/** A unit can enter the arena only with a damage-dealing weapon equipped. */
export function canEnterArena(entry: ExtendedUnitState): boolean {
  return entry.weapon !== undefined && entry.weapon.type !== 'staff' && entry.weapon.type !== 'consumable';
}

/**
 * Random opponent (PLAN item 151, owner-approved generation rule): pick a
 * random enemy template from data/characters.json, level = player level +
 * tier bonus, stats = template base + growth × (level − 1) capped at the
 * stat caps, weapon iron/steel/silver by tier from existing items.
 */
export function generateArenaOpponent(
  player: ExtendedUnitState,
  tier: ArenaTier,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
): ExtendedUnitState | undefined {
  if (!canEnterArena(player)) return undefined;
  if (ARENA_TEMPLATES.length === 0) return undefined;
  const template = ARENA_TEMPLATES[Math.floor(rng.next() * ARENA_TEMPLATES.length)]!;
  const classDef = getClassDefinition(template.classId);
  if (!classDef) return undefined;
  const level = Math.min(balanceConfig.experience.maxLevel, player.level + tier.bonus);
  const growths = template.growths ?? classDef.growths ?? {};
  const grown = (key: string): number => (template.baseStats[key] ?? 0)
    + Math.floor(((growths[key] ?? 0) * (level - 1)) / 100);
  const capStat = (value: number): number => Math.min(balanceConfig.statCaps.stat, value);
  const maxHp = Math.min(balanceConfig.statCaps.hp, grown('hp'));
  const stats = {
    hp: maxHp,
    maxHp,
    str: capStat(grown('str')),
    mag: capStat(grown('mag')),
    skill: capStat(grown('skill')),
    spd: capStat(grown('spd')),
    lck: capStat(grown('lck')),
    def: capStat(grown('def')),
    res: capStat(grown('res')),
  };
  const templateWeapon = itemById.get(template.startingWeapons?.[0] ?? '');
  const weaponType = templateWeapon?.type ?? 'sword';
  const tierIndex = Math.min(tier.bonus, 2);
  const weapon = itemById.get(WEAPON_BY_TYPE_AND_TIER[weaponType]?.[tierIndex] ?? '') ?? templateWeapon;
  if (!weapon) return undefined;
  return {
    unit: {
      id: 'arena_opponent',
      name: 'Arena Gladiator',
      faction: 'enemy',
      position: { x: player.unit.position.x + 1, y: player.unit.position.y },
      classId: template.classId,
      mov: classDef.baseMov,
      moveType: classDef.moveType,
      weaponRanks: { [weapon.type]: weapon.requiredRank ?? 'E' },
      isDead: false,
      hasActed: false,
    },
    stats,
    weapon,
    inventory: [{ itemId: weapon.id, uses: weapon.maxUses ?? 40 }],
    level,
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
