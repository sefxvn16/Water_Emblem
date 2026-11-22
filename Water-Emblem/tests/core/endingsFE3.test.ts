import { describe, it, expect } from 'vitest';
import endingsJson from '../../data/endings.json';
import {
  resolveCharacterEnding,
  buildEpilogueSummary,
  type CharacterEndingDefinition,
} from '../../src/core/chapter/endings';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';

const endingsList = endingsJson.endings as unknown as CharacterEndingDefinition[];

describe('character endings and epilogue resolution match FE3 canon', () => {
  it('data/endings.json contains endings for all main FE3 characters', () => {
    const ids = endingsList.map((e) => e.characterId);
    expect(ids).toContain('marth');
    expect(ids).toContain('caeda');
    expect(ids).toContain('abel');
    expect(ids).toContain('julian');
    expect(ids).toContain('samuel');
    expect(ids).toContain('catria');
    expect(ids).toContain('est');

    expect(endingsList.length).toBeGreaterThanOrEqual(100);
  });

  it('Abel receives default wedding ending when Est is alive', () => {
    const ending = resolveCharacterEnding('abel', [], endingsList);
    expect(ending).toBeDefined();
    expect(ending?.isAlt).toBe(false);
    expect(ending?.title).toBe('Knight of Altea');
    expect(ending?.text).toContain('small shop');
  });

  it('Abel receives grief alternate ending when Est is dead', () => {
    const ending = resolveCharacterEnding('abel', ['est'], endingsList);
    expect(ending).toBeDefined();
    expect(ending?.isAlt).toBe(true);
    expect(ending?.text).toContain('grief of losing Est');
    expect(ending?.altReason).toContain('est fallen');
  });

  it('Julian receives orphanage alternate ending when Lena is dead', () => {
    const ending = resolveCharacterEnding('julian', ['lena'], endingsList);
    expect(ending).toBeDefined();
    expect(ending?.isAlt).toBe(true);
    expect(ending?.text).toContain("cared for orphans");
  });

  it('Samto receives Navarre fame alternate ending when Navarre is dead', () => {
    const ending = resolveCharacterEnding('samto', ['navarre'], endingsList);
    expect(ending).toBeDefined();
    expect(ending?.isAlt).toBe(true);
    expect(ending?.text).toContain("inherit the fame of the fallen Navarre");
  });

  it('Catria receives Macedon dedication alternate ending when Palla is dead', () => {
    const ending = resolveCharacterEnding('catria', ['palla'], endingsList);
    expect(ending).toBeDefined();
    expect(ending?.isAlt).toBe(true);
    expect(ending?.text).toContain("older sister Palla");
  });

  it('Est vanishes alternate ending when Abel is dead', () => {
    const ending = resolveCharacterEnding('est', ['abel'], endingsList);
    expect(ending).toBeDefined();
    expect(ending?.isAlt).toBe(true);
    expect(ending?.text).toContain("Unable to bear the loss of Abel");
  });

  it('buildEpilogueSummary compiles surviving roster with resolved ending text and stats', () => {
    const mockMarth: ExtendedUnitState = {
      unit: { id: 'marth', name: 'Marth', faction: 'player', position: { x: 0, y: 0 }, mov: 5, moveType: 'foot' },
      stats: { hp: 25, maxHp: 25, str: 10, mag: 0, skill: 8, spd: 12, lck: 15, def: 8, res: 1 },
      level: 10,
      exp: 40,
      inventory: [],
    };

    const mockAbel: ExtendedUnitState = {
      unit: { id: 'abel', name: 'Abel', faction: 'player', position: { x: 1, y: 0 }, mov: 7, moveType: 'cavalry' },
      stats: { hp: 22, maxHp: 22, str: 9, mag: 0, skill: 10, spd: 11, lck: 5, def: 8, res: 0 },
      level: 7,
      exp: 10,
      inventory: [],
    };

    const summary = buildEpilogueSummary([mockMarth, mockAbel], ['est'], 24, endingsList);

    expect(summary.survivingCount).toBe(2);
    expect(summary.fallenCount).toBe(1);
    expect(summary.totalTurns).toBe(24);
    expect(summary.units).toHaveLength(2);

    const abelSummary = summary.units.find((u) => u.characterId === 'abel');
    expect(abelSummary?.isAltEnding).toBe(true);
    expect(abelSummary?.endingText).toContain('grief of losing Est');
  });
});
