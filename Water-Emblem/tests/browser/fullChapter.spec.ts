import { expect, test, type Page } from '@playwright/test';
import mapJson from '../../data/maps/chapter_01_talys.json' with { type: 'json' };
import type { MapData, Position } from '../../src/core/grid/types';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import { calculateMovementRange } from '../../src/core/grid/pathfinding';

const map = mapJson as MapData;
const gate = { x: 4, y: 4 };
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

test('Chapter 1 can be played from opening to seize and Chapter 2 preparation', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/');
  const resumeBtn = page.getByRole('button', { name: /RESUME BATTLE/i });
  if (await resumeBtn.isVisible()) await resumeBtn.click();
  await expect(page.getByText(/save Talys Castle|cứu lấy thành Talys/i).first()).toBeVisible();
  await page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i }).click();
  await page.getByRole('button', { name: /2D Grid/ }).click();
  const tile = (position: Position) => page.getByText(`${position.x},${position.y}`, { exact: true }).dispatchEvent('click');
  const order = ['draug', 'jagen', 'gordin', 'cain', 'abel', 'caeda', 'marth'];

  for (let turn = 1; turn <= 30; turn++) {
    for (const id of order) {
      const { units } = await readBattle(page);
      const actor = units.find(({ unit }) => unit.id === id);
      if (!actor || actor.unit.isDead || actor.unit.hasActed) continue;
      const enemies = units.filter(({ unit }) => unit.faction === 'enemy' && !unit.isDead);
      const fieldEnemies = enemies.filter((e) => e.unit.id !== 'gazzak');
      const destinations = movementRange(actor, units);

      const attacks = destinations.flatMap((position) => enemies
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
            if (target.unit.id === 'enemy_thief') score += 100;
            if (target.unit.id === 'gazzak') score += 50;
            return { position, target, score };
          }

          if (canCounter) {
            if (counterDmg >= actor.stats.hp) return null;
            if (actor.stats.hp <= 8 && counterDmg > 0) return null;
          }

          let score = 100 - target.stats.hp;
          if (target.unit.id === 'enemy_thief') score += 50;
          if (target.unit.id === 'gazzak') score += 20;
          if (canCounter) {
            score -= counterDmg * 4;
          } else {
            score += 30; // free damage bonus (e.g. ranged Gordin)
          }
          if (attackerTerrain === 'fort') score += 25;
          if (attackerTerrain === 'forest') score += 15;
          if (position.x === actor.unit.position.x && position.y === actor.unit.position.y) score += 20;

          return { position, target, score };
        }))
        .filter((a): a is { position: Position; target: ExtendedUnitState; score: number } => a !== null);

      attacks.sort((a, b) => b.score - a.score);
      const bestAttack = attacks[0];

      let destination: Position;
      if (bestAttack) {
        destination = bestAttack.position;
      } else if (id === 'marth') {
        if (fieldEnemies.length > 0) {
          // Marth prioritizes zero-threat tiles, maximizing distance to all field enemies
          const scored = destinations.map((pos) => {
            const threats = fieldEnemies.filter((e) => {
              const dist = Math.abs(pos.x - e.unit.position.x) + Math.abs(pos.y - e.unit.position.y);
              return dist <= (e.unit.mov ?? 5) + (e.weapon.maxRange ?? 1);
            });
            const minDist = Math.min(...fieldEnemies.map((e) => Math.abs(pos.x - e.unit.position.x) + Math.abs(pos.y - e.unit.position.y)));
            const cornerDist = Math.abs(pos.x - 26) + Math.abs(pos.y - 11);
            const score = -threats.length * 1000 + minDist * 10 - cornerDist;
            return { pos, score };
          });
          scored.sort((a, b) => b.score - a.score);
          destination = scored[0]?.pos ?? actor.unit.position;
        } else {
          // All field enemies defeated, head straight to gate using BFS routeDistance
          destination = destinations.sort((a, b) => {
            const distA = routeDistance(a, gate, actor.unit.moveType, actor.unit.classId);
            const distB = routeDistance(b, gate, actor.unit.moveType, actor.unit.classId);
            return distA - distB;
          })[0] ?? actor.unit.position;
        }
      } else if (enemies.length === 0) {
        // All enemies defeated, allies hold position
        destination = actor.unit.position;
      } else if (actor.stats.hp <= 8) {
        // Low HP ally stays safe or seeks defensive terrain
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
        // Healthy ally moves towards enemies, preferring defensive terrain
        const goals = enemies.map(({ unit }) => unit.position);
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
      console.log(`[T${turn}] ${id} -> (${destination.x},${destination.y}) ${bestAttack ? `attacks ${bestAttack.target.unit.id} (hp ${bestAttack.target.stats.hp})` : 'waits'}`);
      if (id === 'marth' && destination.x === gate.x && destination.y === gate.y && !enemies.some(({ unit }) => unit.id === 'gazzak')) {
        await page.getByRole('button', { name: /(?:Seize|Chiếm cổng thành)/i }).click();
        await expect(page.getByRole('heading', { name: /(?:STAGE CLEAR|CHIẾN THẮNG)/i })).toBeVisible();
        await expect(page.getByText(/mercenary captain Ogma|Ogma cùng đội lính đánh thuê|Ogma cùng các/i)).toBeVisible();
        await page.getByRole('button', { name: /(?:Advance to Chapter 2|Tiến quân sang Chương 2)/i }).click();
        await expect(page.getByRole('heading', { name: /(?:Battle Preparation|Chuẩn bị xuất trận)/i })).toBeVisible();
        await page.getByRole('button', { name: /(?:Start Chapter|Bắt đầu chương)/i }).click();
        await page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i }).click();
        await expect(page.getByText('PLAYER PHASE')).toBeVisible();
        return;
      }
      if (bestAttack) {
        await tile(bestAttack.target.unit.position);
        await page.getByRole('button', { name: /(?:Attack|Tấn công)/i }).click();
      } else {
        await page.getByRole('button', { name: /(?:Wait|Chờ)/i }).click();
      }
    }
    if (await page.getByRole('heading', { name: /(?:GAME OVER|THẤT BẠI)/i }).isVisible()) {
      throw new Error(`Marth was defeated on turn ${turn}`);
    }
    if (await page.getByText('PLAYER PHASE').isVisible()) {
      await page.getByRole('button', { name: /(?:End Turn|Kết thúc lượt)/i }).click();
    }
    await expect(page.getByText(`Turn: ${turn + 1}`)).toBeVisible({ timeout: 15000 });
  }
  throw new Error('The chapter was not completed within 30 turns');
});
