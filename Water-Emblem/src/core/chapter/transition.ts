import type { ChapterData, ExtendedUnitState } from '../data/chapterData';
import { advanceSupportPoints } from '../combat/support';

export function placeDeployedUnits(
  units: readonly ExtendedUnitState[],
  chapter: ChapterData,
): ExtendedUnitState[] {
  if (chapter.deploymentSlots.length === 0) return units.map((entry) => structuredClone(entry));
  const activeIds = new Set(units
    .filter(({ unit }) => unit.faction === 'player' && !unit.isDead)
    .map(({ unit }) => unit.id));
  const positions = new Map<string, { x: number; y: number }>();
  let slotIndex = 0;
  for (const unitId of chapter.carryoverUnitIds) {
    if (!activeIds.has(unitId)) continue;
    const slot = chapter.deploymentSlots[slotIndex++];
    if (!slot) throw new Error(`Missing deployment slot for ${unitId}`);
    positions.set(unitId, slot);
  }
  return units.map((entry) => {
    const position = positions.get(entry.unit.id);
    return position
      ? { ...entry, unit: { ...entry.unit, position } }
      : entry;
  });
}

export function carryUnitsToChapter(
  currentUnits: readonly ExtendedUnitState[],
  nextChapter: ChapterData,
  participatingIds: ReadonlySet<string> = new Set(currentUnits
    .filter(({ unit }) => unit.faction === 'player' && !unit.isDead)
    .map(({ unit }) => unit.id)),
): ExtendedUnitState[] {
  const currentPlayers = new Map(currentUnits
    .filter(({ unit }) => unit.faction === 'player')
    .map((entry) => [entry.unit.id, entry]));

  const carried = [...nextChapter.units, ...nextChapter.optionalUnits].flatMap((entry) => {
    if (nextChapter.optionalUnits.includes(entry) && !currentPlayers.has(entry.unit.id)) return [];
    const next = structuredClone(entry);
    if (!nextChapter.carryoverUnitIds.includes(next.unit.id)) return [next];
    const previous = currentPlayers.get(next.unit.id);
    if (!previous) return [];
    return [{
      ...structuredClone(previous),
      unit: {
        ...previous.unit,
        position: next.unit.position,
        supportPoints: advanceSupportPoints(previous.unit, participatingIds),
        isDead: previous.unit.isDead,
        hasActed: false,
      },
    }];
  });
  return placeDeployedUnits(carried, nextChapter);
}
