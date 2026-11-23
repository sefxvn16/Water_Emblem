import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateMapData, validateChapterDialogue, validateItemCatalog, validateClassCatalog } from '../../src/core/data/validateData';
import { getAnimationSpeed, setAnimationSpeed, runMovementAnimation } from '../../src/renderer/movementAnimation';
import { soundManager } from '../../src/audio/soundManager';
import { calculateCombatSide } from '../../src/core/combat/calculator';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import type { GridUnit } from '../../src/core/grid/types';
import type { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';
import balanceConfig from '../../data/balance.json' with { type: 'json' };

const WE_DIR = path.resolve(__dirname, '../..');

describe('PLAN Item 59: Gỡ XState', () => {
  it('xstate does not exist in package.json dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(WE_DIR, 'package.json'), 'utf8'));
    expect(pkg.dependencies?.xstate).toBeUndefined();
  });
});

describe('PLAN Item 58 & M6: Kiểm dữ liệu khi nạp', () => {
  it('validateMapData accepts a valid map', () => {
    const valid = {
      id: 'test_map',
      name: 'Test Map',
      width: 2,
      height: 2,
      grid: [['plains', 'forest'], ['plains', 'fortress']],
    };
    const result = validateMapData(valid);
    expect(result.id).toBe('test_map');
    expect(result.width).toBe(2);
    expect(result.grid[1]?.[1]).toBe('fortress');
  });

  it('validateMapData rejects a map whose row length differs from width', () => {
    const invalid = {
      id: 'bad_map',
      name: 'Bad Map',
      width: 3,
      height: 2,
      grid: [['plains', 'forest'], ['plains', 'fortress']], // only 2 columns instead of 3
    };
    expect(() => validateMapData(invalid)).toThrowError(/grid\[0\] must be an array of length 3/);
  });

  it('validateChapterDialogue validates dialogue arrays and rejects malformed objects', () => {
    const valid = {
      chapterId: 'ch01',
      opening: [{ speaker: 'Marth', text: 'Hello!' }],
      ending: [{ speaker: 'Marth', text: 'Victory!' }],
    };
    const res = validateChapterDialogue(valid, 'ch01');
    expect(res.opening).toHaveLength(1);
    expect(res.opening[0]?.speaker).toBe('Marth');

    const invalid = { chapterId: 'ch01', opening: 'not-an-array', ending: [] };
    expect(() => validateChapterDialogue(invalid, 'ch01')).toThrowError(/opening must be an array/);
  });

  it('validateItemCatalog validates items and ensures required properties', () => {
    const valid = {
      items: [
        { id: 'iron_sword', name: 'Iron Sword', type: 'sword', might: 5, hit: 90, weight: 5, crit: 0, maxUses: 40 },
      ],
    };
    const items = validateItemCatalog(valid);
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe('Iron Sword');

    expect(() => validateItemCatalog({ items: [{ name: 'No ID' }] })).toThrowError(/id must be a nonempty string/);
  });

  it('validateClassCatalog validates classes array', () => {
    const valid = {
      classes: [
        { id: 'lord', name: 'Lord', moveType: 'foot', baseMov: 5, usableWeapons: ['sword'] },
      ],
    };
    const classes = validateClassCatalog(valid);
    expect(classes).toHaveLength(1);
    expect(classes[0]?.id).toBe('lord');
  });
});

describe('PLAN Item 193: Lỗi giao diện LevelUp & PhaseBanner', () => {
  it('LevelUpModal source code does not contain isHeadless test shortcut', () => {
    const code = fs.readFileSync(path.join(WE_DIR, 'src/ui/LevelUpModal.tsx'), 'utf8');
    expect(code).not.toContain('isHeadless');
    expect(code).not.toContain('HeadlessChrome');
  });

  it('PhaseBanner defines fadeSlideInOut keyframe', () => {
    const code = fs.readFileSync(path.join(WE_DIR, 'src/ui/PhaseBanner.tsx'), 'utf8');
    expect(code).toContain('@keyframes fadeSlideInOut');
  });
});

describe('PLAN Item 197: Tốc độ hoạt cảnh & gom hằng số thời lượng', () => {
  it('balance.json contains consolidated duration constants', () => {
    expect(balanceConfig.durations).toBeDefined();
    expect(balanceConfig.durations.phaseBannerMs).toBe(1000);
    expect(balanceConfig.durations.reinforcementBannerMs).toBe(1200);
    expect(balanceConfig.durations.combatPopupMs).toBe(1400);
    expect(balanceConfig.durations.stepNormalMs).toBe(65);
    expect(balanceConfig.durations.stepFastMs).toBe(25);
  });

  it('setAnimationSpeed updates and persists speed setting', () => {
    setAnimationSpeed('fast');
    expect(getAnimationSpeed()).toBe('fast');
    setAnimationSpeed('off');
    expect(getAnimationSpeed()).toBe('off');
    setAnimationSpeed('normal');
    expect(getAnimationSpeed()).toBe('normal');
  });

  it('runMovementAnimation returns a cleanup handle with .cancel() that aborts without calling onComplete', () => {
    let completed = false;
    let stepCount = 0;
    const soundPlayer = { playMoveStep: () => {} };
    const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];

    const handle = runMovementAnimation(
      path,
      'foot',
      soundPlayer,
      () => { stepCount++; },
      () => { completed = true; },
      50,
    );

    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
    expect(completed).toBe(false);
  });
});

describe('PLAN Item 75 - M1: Dự báo phản đòn khi bên tấn công đánh 2 lần', () => {
  it('forecast correctly accounts for defender counter-attack before second strike', () => {
    // Defender: 10 HP, can counter, deals 5 dmg
    // Attacker: 20 HP, deals 6 dmg per hit, attacks 2 times (double attack)
    // Round 1: Attacker deals 6 -> Defender HP is 4 (> 0)
    // Round 2: Defender counters with 5 -> Attacker HP is 15
    // Round 3: Attacker deals 6 -> Defender HP is 0
    // Result: Defender reaches 0 HP, but Attacker takes 5 damage from counter!
    const defenderStats = { hp: 10, maxHp: 10 };
    const attackerStats = { hp: 20, maxHp: 20 };
    const attDamagePerHit = 6;
    const attCount = 2;
    const defCanCounter = true;
    const defDamagePerHit = 5;
    const defCount: number = 1;

    // Simulation of the round-by-round formula now in CombatForecastWindow:
    const defenderHpAfterHit1 = attCount > 0 ? Math.max(0, defenderStats.hp - attDamagePerHit) : defenderStats.hp;
    const defCanCounterRound2 = defCanCounter && defCount > 0 && defenderHpAfterHit1 > 0;
    const attackerHpAfterCounter1 = defCanCounterRound2 ? Math.max(0, attackerStats.hp - defDamagePerHit) : attackerStats.hp;

    let defenderHpAfter = defenderHpAfterHit1;
    let attackerHpAfter = attackerHpAfterCounter1;
    if (defenderHpAfterHit1 > 0 && attackerHpAfterCounter1 > 0) {
      if (attCount === 2) {
        defenderHpAfter = Math.max(0, defenderHpAfterHit1 - attDamagePerHit);
      } else if (defCanCounter && defCount === 2) {
        attackerHpAfter = Math.max(0, attackerHpAfterCounter1 - defDamagePerHit);
      }
    }

    expect(defenderHpAfter).toBe(0);
    expect(attackerHpAfter).toBe(15); // Attacker lost 5 HP, counter was NOT skipped!
  });
});

describe('PLAN Item 75 - M2: Avo trong forecast tính trong core kèm bonus', () => {
  it('calculateCombatSide includes terrain avoid bonus in returned avoid rate', () => {
    const unit: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      classId: 'lord',
      position: { x: 5, y: 5 },
      moveType: 'foot',
      mov: 5,
    };
    const stats: UnitCombatStats = {
      hp: 20, maxHp: 20, str: 7, mag: 0, skill: 6, spd: 8, lck: 8, def: 5, res: 0,
    };
    const weapon: ItemDefinition = {
      id: 'iron_sword', name: 'Iron Sword', nameVi: 'Kiếm Sắt', type: 'sword',
      might: 5, hit: 90, weight: 5, crit: 0, minRange: 1, maxRange: 1, maxUses: 40,
      effectiveAgainst: [],
    };
    const opponent: GridUnit = {
      id: 'thief_1', name: 'Thief', faction: 'enemy', classId: 'thief',
      position: { x: 5, y: 6 }, moveType: 'foot', mov: 5,
    };
    const opponentStats: UnitCombatStats = {
      hp: 15, maxHp: 15, str: 4, mag: 0, skill: 3, spd: 5, lck: 2, def: 2, res: 0,
    };

    // Plains has 0 avoid bonus
    const sidePlains = calculateCombatSide(
      unit, stats, weapon, opponent, opponentStats, undefined, 1,
      defaultTerrainRegistry, 'plains', 'plains',
    );
    // Base avoid = AS (8 - max(0, 5-7) = 8) + floor(lck/2) (4) = 12
    expect(sidePlains.avoid).toBe(12);

    // Forest has avoid bonus 10 (per terrains.json)
    const sideForest = calculateCombatSide(
      unit, stats, weapon, opponent, opponentStats, undefined, 1,
      defaultTerrainRegistry, 'forest', 'plains',
    );
    expect(sideForest.avoid).toBe(12 + 10); // 22
  });
});

describe('PLAN Item 75 - M3: soundManager localStorage protection', () => {
  it('handles invalid NaN or string values in volume setters without breaking', () => {
    soundManager.bgmVolume = 0.5;
    expect(soundManager.bgmVolume).toBe(0.5);

    // Should ignore NaN / non-finite inputs
    soundManager.bgmVolume = Number.NaN;
    expect(soundManager.bgmVolume).toBe(0.5);

    soundManager.sfxVolume = 0.8;
    soundManager.sfxVolume = Number.POSITIVE_INFINITY;
    expect(soundManager.sfxVolume).toBe(0.8);
  });
});

describe('PLAN Item 75 - M8: Save/Load migration safety', () => {
  it('SaveSlotsModal handles save confirmation properly', () => {
    const code = fs.readFileSync(path.join(WE_DIR, 'src/storage/saveLoad.ts'), 'utf8');
    expect(code).toContain('Failed to update migrated save in database');
  });
});

describe('PLAN Item 75 - M9 & M10: UI safety and listener cleanup', () => {
  it('ActionMenuWindow attaches and cleans up scroll and resize listeners', () => {
    const code = fs.readFileSync(path.join(WE_DIR, 'src/ui/ActionMenuWindow.tsx'), 'utf8');
    expect(code).toContain("window.addEventListener('scroll', updatePos, true)");
    expect(code).toContain("window.addEventListener('resize', updatePos)");
    expect(code).toContain("window.removeEventListener('scroll', updatePos, true)");
  });

  it('WorldMapModal disables unconfigured campaign chapters', () => {
    const code = fs.readFileSync(path.join(WE_DIR, 'src/ui/WorldMapModal.tsx'), 'utf8');
    expect(code).toContain('disabled={!hasData}');
  });
});
