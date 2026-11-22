import type { ExtendedUnitState } from '../data/chapterData';

export interface AlternateEnding {
  readonly triggerIfDead: string;
  readonly title: string;
  readonly text: string;
}

export interface CharacterEndingDefinition {
  readonly id: string;
  readonly characterId: string;
  readonly name: string;
  readonly title: string;
  readonly text: string;
  readonly altEndings?: readonly AlternateEnding[];
}

export interface ResolvedEnding {
  readonly characterId: string;
  readonly name: string;
  readonly title: string;
  readonly text: string;
  readonly isAlt: boolean;
  readonly altReason?: string;
}

export interface EpilogueUnitEntry {
  readonly characterId: string;
  readonly name: string;
  readonly title: string;
  readonly level: number;
  readonly endingText: string;
  readonly isAltEnding: boolean;
}

export interface EpilogueSummary {
  readonly survivingCount: number;
  readonly fallenCount: number;
  readonly totalTurns: number;
  readonly units: readonly EpilogueUnitEntry[];
}

/**
 * Resolves the character's ending text based on whether trigger units have fallen.
 * Pure function: inspects deadUnitIds and picks the appropriate alternate ending if available.
 */
export function resolveCharacterEnding(
  characterId: string,
  deadUnitIds: readonly string[],
  endingsList: readonly CharacterEndingDefinition[],
): ResolvedEnding | undefined {
  const normId = characterId === 'samto' ? 'samuel' : characterId;
  const definition = endingsList.find(
    (e) => e.characterId === normId || e.id === normId || e.characterId === characterId || e.id === characterId,
  );
  if (!definition) return undefined;

  const deadSet = new Set(deadUnitIds);

  // Check if any alternate ending condition is satisfied
  if (definition.altEndings) {
    for (const alt of definition.altEndings) {
      if (deadSet.has(alt.triggerIfDead)) {
        return {
          characterId: definition.characterId,
          name: definition.name,
          title: alt.title || definition.title,
          text: alt.text,
          isAlt: true,
          altReason: `${alt.triggerIfDead} fallen`,
        };
      }
    }
  }

  // Default canonical ending
  return {
    characterId: definition.characterId,
    name: definition.name,
    title: definition.title,
    text: definition.text,
    isAlt: false,
  };
}

/**
 * Generates the epilogue victory roster summary.
 * Filters living units and attaches their resolved ending text and title.
 */
export function buildEpilogueSummary(
  allUnits: readonly ExtendedUnitState[],
  deadUnitIds: readonly string[],
  totalTurns: number,
  endingsList: readonly CharacterEndingDefinition[],
): EpilogueSummary {
  const deadSet = new Set(deadUnitIds);
  const surviving = allUnits.filter((u) => u.unit.faction === 'player' && !u.unit.isDead && !deadSet.has(u.unit.id));

  const unitEntries: EpilogueUnitEntry[] = [];

  for (const entry of surviving) {
    const resolved = resolveCharacterEnding(entry.unit.id, deadUnitIds, endingsList);
    unitEntries.push({
      characterId: entry.unit.id,
      name: entry.unit.name,
      title: resolved?.title ?? '',
      level: entry.level,
      endingText: resolved?.text ?? '',
      isAltEnding: resolved?.isAlt ?? false,
    });
  }

  return {
    survivingCount: surviving.length,
    fallenCount: deadUnitIds.length,
    totalTurns,
    units: unitEntries,
  };
}
