import type { ChapterData, ExtendedUnitState } from '../data/chapterData';

export function carryUnitsToChapter(
  currentUnits: readonly ExtendedUnitState[],
  nextChapter: ChapterData,
): ExtendedUnitState[] {
  const currentPlayers = new Map(currentUnits
    .filter(({ unit }) => unit.faction === 'player')
    .map((entry) => [entry.unit.id, entry]));

  return [...nextChapter.units, ...nextChapter.optionalUnits].flatMap((entry) => {
    if (nextChapter.optionalUnits.includes(entry) && !currentPlayers.has(entry.unit.id)) return [];
    const next = structuredClone(entry);
    if (!nextChapter.carryoverUnitIds.includes(next.unit.id)) return [next];
    const previous = currentPlayers.get(next.unit.id);
    if (!previous) return [];
    return [{
      ...structuredClone(previous),
      unit: {
        ...next.unit,
        isDead: previous.unit.isDead,
        hasActed: false,
      },
    }];
  });
}
