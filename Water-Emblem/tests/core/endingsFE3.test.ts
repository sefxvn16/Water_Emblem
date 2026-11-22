import { describe, it, expect } from 'vitest';
import endingsJson from '../../data/endings.json';
import palettesJson from '../../data/character_palettes.json';
import charactersJson from '../../data/characters.json';
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
    expect(ids).toContain('cain');
    expect(ids).toContain('draug');
    expect(ids).toContain('gordin');

    expect(endingsList.length).toBeGreaterThanOrEqual(25);
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
    const mockEndings: CharacterEndingDefinition[] = [
      {
        id: 'samto',
        characterId: 'samto',
        name: 'Samto',
        title: 'Freelance Swordsman',
        text: 'He roamed the continent as a wandering sellsword.',
        altEndings: [
          {
            triggerIfDead: 'navarre',
            title: 'Navarre the Second',
            text: 'He decided to inherit the fame of the fallen Navarre and toured the world.',
          },
        ],
      },
    ];
    const ending = resolveCharacterEnding('samto', ['navarre'], mockEndings);
    expect(ending).toBeDefined();
    expect(ending?.isAlt).toBe(true);
    expect(ending?.text).toContain("inherit the fame of the fallen Navarre");
  });

  it('Catria receives Macedon dedication alternate ending when Palla is dead', () => {
    const mockEndings: CharacterEndingDefinition[] = [
      {
        id: 'catria',
        characterId: 'catria',
        name: 'Catria',
        title: 'Middle Pegasus Knight',
        text: 'She remained in Macedon.',
        altEndings: [
          {
            triggerIfDead: 'palla',
            title: 'Macedon Defender',
            text: 'To honor her older sister Palla, she dedicated her life to rebuilding Macedon.',
          },
        ],
      },
    ];
    const ending = resolveCharacterEnding('catria', ['palla'], mockEndings);
    expect(ending).toBeDefined();
    expect(ending?.isAlt).toBe(true);
    expect(ending?.text).toContain("older sister Palla");
  });

  it('Est vanishes alternate ending when Abel is dead', () => {
    const mockEndings: CharacterEndingDefinition[] = [
      {
        id: 'est',
        characterId: 'est',
        name: 'Est',
        title: 'Youngest Pegasus Knight',
        text: 'She lived with Abel.',
        altEndings: [
          {
            triggerIfDead: 'abel',
            title: 'Wandering Pegasus Knight',
            text: 'Unable to bear the loss of Abel, she vanished into the sunset.',
          },
        ],
      },
    ];
    const ending = resolveCharacterEnding('est', ['abel'], mockEndings);
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

  it('every ending and palette id resolves to a character in characters.json', () => {
    const validCharacterIds = new Set(charactersJson.characters.map((c: { id: string }) => c.id));

    // Check endings.json
    for (const ending of endingsList) {
      expect(validCharacterIds.has(ending.characterId), `Unknown ending characterId: ${ending.characterId}`).toBe(true);
      expect(ending.id).not.toMatch(/[\n'"]/);
    }

    // Check character_palettes.json
    const paletteCharacters = Object.keys(palettesJson.characters);
    expect(paletteCharacters.length).toBeGreaterThan(0);
    for (const palKey of paletteCharacters) {
      expect(validCharacterIds.has(palKey), `Unknown palette key: ${palKey}`).toBe(true);
    }
  });
});
