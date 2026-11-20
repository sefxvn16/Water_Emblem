import { expect, test, type Page } from '@playwright/test';
import { SEED, recordOn, saveRecording } from './recorder';
import { closeSettings, dismissRewardPopup, expectPlayerPhase, expectTurnNumber, openSettings } from '../../tests/browser/settingsMenu';
test.beforeEach(async ({ page }) => { await recordOn(page); });
test.afterEach(async ({ page }, info) => { await saveRecording(page, info, 'chapter3'); });
import mapJson from '../../data/maps/chapter_03_devil_mountain.json' with { type: 'json' };
import type { MapData, Position } from '../../src/core/grid/types';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import { calculateMovementRange } from '../../src/core/grid/pathfinding';

const map = mapJson as MapData;
const gate = { x: 2, y: 8 };
const terrains = new TerrainRegistry();

function movementRange(actor: ExtendedUnitState, units: ExtendedUnitState[]): Position[] {
  return Array.from(calculateMovementRange(actor.unit, {
    map,
    terrains,
    units: units.map(({ unit }) => unit),
  }).values(), ({ position }) => position);
}

async function readBattle(page: Page): Promise<{ units: ExtendedUnitState[]; turn: number }> {
  return page.evaluate(async () => {
    const winState = (window as any).__WATER_EMBLEM_STATE__;
    if (winState?.extendedUnits && winState?.turnState) {
      return {
        units: winState.extendedUnits,
        turn: winState.turnState.turnNumber,
      };
    }
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('water_emblem');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state = await new Promise<{ units: ExtendedUnitState[]; turn: number }>((resolve, reject) => {
      const request = db.transaction('saves').objectStore('saves').get('main');
      request.onsuccess = () => {
        if (!request.result) return reject(new Error('Save not found'));
        resolve({
          units: request.result.extendedUnits,
          turn: request.result.turnState.turnNumber,
        });
      };
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state;
  });
}

function routeDistance(start: Position, goal: Position, moveType: ExtendedUnitState['unit']['moveType'], classId?: string): number {
  const queue = [{ ...start, steps: 0 }];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.y === goal.y) return current.steps;
    const key = `${current.x},${current.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = current.x + dx;
      const y = current.y + dy;
      const terrain = map.grid[y]?.[x];
      if (terrain && terrains.getMovementCost(terrain, moveType, classId) !== null) {
        queue.push({ x, y, steps: current.steps + 1 });
      }
    }
  }
  return 999;
}


// The unit walks to its destination (item 98); wait for the action bar
// before clicking further, otherwise clicks land mid-walk.
async function waitActionMenu(page: Page): Promise<void> {
  await page.getByTestId('action-menu').waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
}

async function confirmAttack(page: Page, target: Position): Promise<void> {
  const forecast = page.getByTestId('forecast-window');
  const opened = await forecast.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
  if (!opened) {
    await page.getByRole('button', { name: /(?:Attack|Tấn công)/i }).click().catch(() => undefined);
    await page.getByText(`${target.x},${target.y}`, { exact: true }).dispatchEvent('click');
    // PLAN item 158: after the target is chosen, the weapon picker may
    // open (several usable weapons) before the forecast.
    const picker = page.getByTestId('weapon-picker');
    const pickerOpened = await picker.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
    if (pickerOpened) {
      await picker.locator('[data-testid^="weapon-pick-"]:not([data-testid="weapon-pick-cancel"])').first().click();
    }
    await forecast.waitFor({ state: 'visible', timeout: 8000 });
  }
  await forecast.getByRole('button', { name: /(?:Attack|Tấn công)/i }).click();
}

test('Chapter 3 can be played from opening, recruit Navarre, defeat Hyman, and seize gate', async ({ page }) => {
  test.setTimeout(360_000);
  await page.goto('/?seed=' + SEED);
  const resumeBtn = page.getByRole('button', { name: /RESUME BATTLE/i });
  if (await resumeBtn.isVisible()) await resumeBtn.click();

  // Switch to Chapter 3
  await openSettings(page);
  await page.locator('select').first().selectOption('chapter_03');
  await page.getByRole('button', { name: /(?:Start Chapter|Bắt đầu chương)/i }).click();
  await expect(page.getByRole('heading', { name: /Chapter 3: The Devil Mountain/i })).toBeVisible();

  await page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i }).click();
  await openSettings(page);
  await page.getByRole('button', { name: /2D Grid/ }).click();
  await closeSettings(page);
  const tile = (position: Position) => page.getByText(`${position.x},${position.y}`, { exact: true }).dispatchEvent('click');

  const order = [
    'jagen', 'ogma', 'barst', 'bord', 'cord', 'cain', 'abel',
    'draug', 'gordin', 'castor', 'julian', 'lena', 'caeda', 'navarre', 'marth',
  ];

  for (let turn = 1; turn <= 40; turn++) {
    for (const id of order) {
      await dismissRewardPopup(page);
      const { units } = await readBattle(page);
      const actor = units.find(({ unit }) => unit.id === id);
      if (!actor || actor.unit.isDead || actor.unit.hasActed || actor.unit.faction !== 'player') continue;

      const enemies = units.filter(({ unit }) => unit.faction === 'enemy' && !unit.isDead);
      const fieldEnemies = enemies.filter((e) => e.unit.id !== 'hyman');
      const destinations = movementRange(actor, units);

      // Special priority: Caeda talks to Navarre if Navarre is an enemy
      const navarreEnemy = enemies.find((e) => e.unit.id === 'navarre');
      let isTalkMove = false;
      let talkDest: Position | null = null;
      if (id === 'caeda' && navarreEnemy) {
        const talkTiles = destinations.filter((pos) => {
          const dist = Math.abs(pos.x - navarreEnemy.unit.position.x) + Math.abs(pos.y - navarreEnemy.unit.position.y);
          return dist === 1;
        });
        if (talkTiles.length > 0) {
          talkDest = talkTiles[0] ?? null;
          isTalkMove = true;
        }
      }

      // Attack candidates (excluding Navarre if we can recruit him, and staff users cannot attack)
      const caedaAlive = units.some((u) => u.unit.id === 'caeda' && !u.unit.isDead);
      const targetableEnemies = caedaAlive ? enemies.filter((e) => e.unit.id !== 'navarre') : enemies;
      const canAttack = actor.weapon && actor.weapon.type !== 'staff' && (actor.weapon.might ?? 0) > 0;
      const attacks = canAttack ? destinations.flatMap((position) => targetableEnemies
        .filter(({ unit }) => {
          const distance = Math.abs(position.x - unit.position.x) + Math.abs(position.y - unit.position.y);
          return distance >= actor.weapon.minRange && distance <= actor.weapon.maxRange;
        })
        .map((target) => {
          const distance = Math.abs(position.x - target.unit.position.x) + Math.abs(position.y - target.unit.position.y);
          const attackerTerrain = map.grid[position.y]?.[position.x] ?? 'plains';
          const isLethal = Math.max(1, actor.stats.str + actor.weapon.might - target.stats.def) >= target.stats.hp;
          const canCounter = distance >= target.weapon.minRange && distance <= target.weapon.maxRange;
          const counterDmg = canCounter ? Math.max(0, target.stats.str + target.weapon.might - actor.stats.def) : 0;

          // Marth stays safe and never attacks while field enemies exist
          if (id === 'marth') {
            if (fieldEnemies.length > 0) return null;
            if (isLethal || !canCounter) {
              return { position, target, score: 300 - target.stats.hp };
            }
            return null;
          }

          if (isLethal) {
            let score = 300 - target.stats.hp;
            if (target.unit.id.includes('thief')) score += 100;
            if (target.unit.id === 'hyman') score += 50;
            return { position, target, score };
          }

          if (canCounter && enemies.length > 1) {
            if (counterDmg >= actor.stats.hp) return null;
            if (actor.stats.hp <= 8 && counterDmg > 0) return null;
          }

          let score = 100 - target.stats.hp;
          if (target.unit.id.includes('thief')) score += 50;
          if (target.unit.id === 'hyman') score += 20;
          if (canCounter) {
            score -= counterDmg * 4;
          } else {
            score += 30; // free ranged damage
          }
          if (attackerTerrain === 'fort') score += 25;
          if (id !== 'marth' && position.x === gate.x && position.y === gate.y) score -= 200;
          if (attackerTerrain === 'forest') score += 15;
          if (position.x === actor.unit.position.x && position.y === actor.unit.position.y) score += 20;

          return { position, target, score };
        }))
        .filter((a): a is { position: Position; target: ExtendedUnitState; score: number } => a !== null) : [];

      attacks.sort((a, b) => b.score - a.score);
      const bestAttack = attacks[0];

      let destination: Position;
      let attackCandidate: { position: Position; target: ExtendedUnitState } | null = null;
      if (isTalkMove && talkDest) {
        destination = talkDest;
      } else if (bestAttack) {
        destination = bestAttack.position;
        attackCandidate = bestAttack;
      } else if (id === 'caeda' && navarreEnemy) {
        // Caeda advances towards Navarre safely, avoiding bow threats
        const scored = destinations.map((pos) => {
          const dist = Math.abs(pos.x - navarreEnemy.unit.position.x) + Math.abs(pos.y - navarreEnemy.unit.position.y);
          const threats = enemies.filter((e) => {
            const dist = Math.abs(pos.x - e.unit.position.x) + Math.abs(pos.y - e.unit.position.y);
            return dist <= (e.unit.mov ?? 5) + (e.weapon.maxRange ?? 1);
          });
          const bowThreats = threats.filter((e) => e.weapon.type === 'bow' || e.unit.id.includes('hunter'));
          const penalty = threats.length * 100 + bowThreats.length * 500;
          return { pos, score: -dist * 10 - penalty };
        });
        scored.sort((a, b) => b.score - a.score);
        destination = scored[0]?.pos ?? actor.unit.position;
      } else if (id === 'marth') {
        if (fieldEnemies.length > 0) {
          // Marth stays in backline away from threats
          const scored = destinations.map((pos) => {
            const threats = fieldEnemies.filter((e) => {
              const dist = Math.abs(pos.x - e.unit.position.x) + Math.abs(pos.y - e.unit.position.y);
              return dist <= (e.unit.mov ?? 5) + (e.weapon.maxRange ?? 1);
            });
            const minDist = Math.min(...fieldEnemies.map((e) => Math.abs(pos.x - e.unit.position.x) + Math.abs(pos.y - e.unit.position.y)));
            const cornerDist = Math.abs(pos.x - 27) + Math.abs(pos.y - 19);
            const score = -threats.length * 1000 + minDist * 10 - cornerDist;
            return { pos, score };
          });
          scored.sort((a, b) => b.score - a.score);
          destination = scored[0]?.pos ?? actor.unit.position;
        } else {
          // Field cleared, Marth heads straight to gate
          destination = destinations.sort((a, b) => {
            const distA = routeDistance(a, gate, actor.unit.moveType, actor.unit.classId);
            const distB = routeDistance(b, gate, actor.unit.moveType, actor.unit.classId);
            return distA - distB;
          })[0] ?? actor.unit.position;
        }
      } else if (id === 'lena') {
        // Lena is a fragile staff user, keep her safe near allies
        const allies = units.filter((u) => u.unit.faction === 'player' && u.unit.id !== 'lena');
        destination = destinations.sort((a, b) => {
          const threatsA = enemies.filter((e) => Math.abs(a.x - e.unit.position.x) + Math.abs(a.y - e.unit.position.y) <= (e.unit.mov ?? 5) + 1).length;
          const threatsB = enemies.filter((e) => Math.abs(b.x - e.unit.position.x) + Math.abs(b.y - e.unit.position.y) <= (e.unit.mov ?? 5) + 1).length;
          const distAlliesA = Math.min(...allies.map((u) => Math.abs(a.x - u.unit.position.x) + Math.abs(a.y - u.unit.position.y)));
          const distAlliesB = Math.min(...allies.map((u) => Math.abs(b.x - u.unit.position.x) + Math.abs(b.y - u.unit.position.y)));
          return (threatsA * 100 + distAlliesA) - (threatsB * 100 + distAlliesB);
        })[0] ?? actor.unit.position;
      } else if (enemies.length === 0) {
        if (id !== 'marth' && actor.unit.position.x === gate.x && actor.unit.position.y === gate.y) {
          destination = destinations.find((pos) => pos.x !== gate.x || pos.y !== gate.y) ?? actor.unit.position;
        } else {
          destination = actor.unit.position;
        }
      } else if (actor.stats.hp <= 8) {
        const scored = destinations.map((pos) => {
          const threats = enemies.filter((e) => {
            const dist = Math.abs(pos.x - e.unit.position.x) + Math.abs(pos.y - e.unit.position.y);
            return dist <= (e.unit.mov ?? 5) + (e.weapon.maxRange ?? 1);
          });
          const terrain = map.grid[pos.y]?.[pos.x];
          const fortBonus = terrain === 'fort' ? 40 : (terrain === 'forest' ? 20 : 0);
          return { pos, score: -threats.length * 100 + fortBonus };
        });
        scored.sort((a, b) => b.score - a.score);
        destination = scored[0]?.pos ?? actor.unit.position;
      } else {
        // Move towards nearest enemy or Navarre if Caeda
        // Attack positions are tiles next to an enemy (see recordChapter1).
        const goals = (id === 'caeda' && navarreEnemy)
          ? [navarreEnemy.unit.position]
          : enemies.flatMap(({ unit }) => [
              { x: unit.position.x + 1, y: unit.position.y },
              { x: unit.position.x - 1, y: unit.position.y },
              { x: unit.position.x, y: unit.position.y + 1 },
              { x: unit.position.x, y: unit.position.y - 1 },
            ]);

        destination = destinations.sort((a, b) => {
          const distA = Math.min(...goals.map((goal) => routeDistance(a, goal, actor.unit.moveType, actor.unit.classId)));
          const distB = Math.min(...goals.map((goal) => routeDistance(b, goal, actor.unit.moveType, actor.unit.classId)));
          const terrainA = map.grid[a.y]?.[a.x];
          const terrainB = map.grid[b.y]?.[b.x];
          const bonusA = terrainA === 'fort' ? -5 : (terrainA === 'forest' ? -2 : 0);
          const bonusB = terrainB === 'fort' ? -5 : (terrainB === 'forest' ? -2 : 0);
          return (distA + bonusA) - (distB + bonusB);
        })[0] ?? actor.unit.position;
      }

      await tile(actor.unit.position);
      await tile(destination);
      await waitActionMenu(page);
      console.log(`[CH3-T${turn}] ${id} -> (${destination.x},${destination.y}) ${isTalkMove ? 'talking to Navarre' : attackCandidate ? `attacks ${attackCandidate.target.unit.id}` : 'waits'}`);

      // Seize check
      if (id === 'marth' && destination.x === gate.x && destination.y === gate.y && !enemies.some(({ unit }) => unit.id === 'hyman')) {
        await page.getByRole('button', { name: /(?:Seize|Chiếm cổng thành)/i }).click();
        await expect(page.getByRole('heading', { name: /(?:STAGE CLEAR|CHIẾN THẮNG)/i })).toBeVisible();
        console.log(`[CH3] Stage Cleared! Chapter 3 completed successfully!`);
        return;
      }

      // Check Talk button
      const talkButton = page.getByRole('button', { name: /(?:Talk|Nói chuyện)/i });
      if (isTalkMove && await talkButton.isVisible()) {
        await talkButton.click();
        console.log(`[CH3-T${turn}] Navarre recruited by Caeda!`);
      } else if (attackCandidate) {
        await tile(attackCandidate.target.unit.position);
        await confirmAttack(page, attackCandidate.target.unit.position);
      } else {
        await page.getByRole('button', { name: /(?:Wait|Chờ)/i }).click();
      }
    }

    if (await page.getByRole('heading', { name: /(?:GAME OVER|THẤT BẠI)/i }).isVisible()) {
      throw new Error(`Marth was defeated in Chapter 3 on turn ${turn}`);
    }
    const phase = await page.evaluate(() => (window as any).__WATER_EMBLEM_STATE__?.turnState?.activePhase);
    if (phase === 'player_phase') {
      await dismissRewardPopup(page);
      await page.getByRole('button', { name: /(?:End Turn|Kết thúc lượt)/i }).click();
    }
    await expectTurnNumber(page, turn + 1);
  }
  throw new Error('Chapter 3 was not completed within 40 turns');
});
