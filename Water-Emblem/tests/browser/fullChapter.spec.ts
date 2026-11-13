import { expect, test, type Page } from '@playwright/test';
import mapJson from '../../data/maps/chapter_01_talys.json' with { type: 'json' };
import terrainJson from '../../data/terrains.json' with { type: 'json' };
import type { MapData, Position } from '../../src/core/grid/types';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';

const map = mapJson as MapData;
const gate = { x: 3, y: 9 };
const terrainCosts = new Map(terrainJson.terrains.map((terrain) => [terrain.id, terrain.movementCosts]));

function movementCost(terrainId: string, moveType: ExtendedUnitState['unit']['moveType']): number | null {
  return terrainCosts.get(terrainId)?.[moveType] ?? null;
}

function movementRange(actor: ExtendedUnitState, units: ExtendedUnitState[]): Position[] {
  const queue = [{ ...actor.unit.position, cost: 0 }];
  const best = new Map<string, number>();
  const stops: Position[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    if ((best.get(key) ?? Infinity) <= current.cost) continue;
    best.set(key, current.cost);
    const occupant = units.find(({ unit }) => !unit.isDead && unit.position.x === current.x && unit.position.y === current.y);
    if (!occupant || occupant.unit.id === actor.unit.id) stops.push({ x: current.x, y: current.y });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = current.x + dx;
      const y = current.y + dy;
      const terrain = map.grid[y]?.[x];
      const cost = terrain ? movementCost(terrain, actor.unit.moveType) : null;
      if (cost === null || current.cost + cost > actor.unit.mov) continue;
      const blocker = units.find(({ unit }) => !unit.isDead && unit.position.x === x && unit.position.y === y);
      if (!blocker || blocker.unit.faction === actor.unit.faction) queue.push({ x, y, cost: current.cost + cost });
    }
  }
  return stops;
}

async function readBattle(page: Page): Promise<{ units: ExtendedUnitState[]; turn: number }> {
  await page.getByRole('button', { name: /Lưu Game/ }).click();
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('water_emblem');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state = await new Promise<{ units: ExtendedUnitState[]; turn: number }>((resolve, reject) => {
      const request = db.transaction('saves').objectStore('saves').get('main');
      request.onsuccess = () => resolve({
        units: request.result.extendedUnits,
        turn: request.result.turnState.turnNumber,
      });
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state;
  });
}

function routeDistance(start: Position, goal: Position, moveType: ExtendedUnitState['unit']['moveType']): number {
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
      if (terrain && movementCost(terrain, moveType) !== null) {
        queue.push({ x, y, steps: current.steps + 1 });
      }
    }
  }
  return 999;
}

test('Chapter 1 can be played from opening to seize and Chapter 2 preparation', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await expect(page.getByText(/Caeda vừa từ lâu đài Talys tới/)).toBeVisible();
  await page.getByRole('button', { name: /Vào trận đánh/ }).click();
  await page.getByRole('button', { name: /2D Grid/ }).click();
  const tile = (position: Position) => page.getByText(`${position.x},${position.y}`, { exact: true }).dispatchEvent('click');
  const order = ['jagen', 'caeda', 'cain', 'abel', 'gordin', 'draug', 'marth'];

  for (let turn = 1; turn <= 16; turn++) {
    for (const id of order) {
      const { units } = await readBattle(page);
      const actor = units.find(({ unit }) => unit.id === id);
      if (!actor || actor.unit.isDead || actor.unit.hasActed) continue;
      const enemies = units.filter(({ unit }) => unit.faction === 'enemy' && !unit.isDead);
      const destinations = movementRange(actor, units);
      const attacks = id === 'marth' ? [] : destinations.flatMap((position) => enemies
        .filter(({ unit }) => {
          const distance = Math.abs(position.x - unit.position.x) + Math.abs(position.y - unit.position.y);
          return distance >= actor.weapon.minRange && distance <= actor.weapon.maxRange;
        })
        .map((target) => ({ position, target, score: 100 - target.stats.hp + (target.unit.id === 'gazzak' ? 5 : 0) })));
      attacks.sort((a, b) => b.score - a.score);
      const bestAttack = attacks[0];
      let destination: Position;
      if (bestAttack) {
        destination = bestAttack.position;
      } else if (id === 'marth' && enemies.length > 0) {
        destination = actor.unit.position;
      } else {
        const goals = id === 'marth' ? [gate] : enemies.map(({ unit }) => unit.position);
        destination = destinations.sort((a, b) => {
          const distance = (point: Position) => Math.min(...goals.map((goal) => routeDistance(point, goal, actor.unit.moveType)));
          return distance(a) - distance(b);
        })[0] ?? actor.unit.position;
      }
      await tile(actor.unit.position);
      await tile(destination);
      if (id === 'marth' && destination.x === gate.x && destination.y === gate.y && !enemies.some(({ unit }) => unit.id === 'gazzak')) {
        await page.getByRole('button', { name: /Chiếm cổng thành/ }).click();
        await expect(page.getByRole('heading', { name: /CHIẾN THẮNG/ })).toBeVisible();
        await expect(page.getByText(/Ta sẽ cử Ogma cùng các chiến binh Talys/)).toBeVisible();
        await page.getByRole('button', { name: /Tiến quân sang Chương 2/ }).click();
        await expect(page.getByRole('heading', { name: /Chuẩn bị xuất trận/ })).toBeVisible();
        await page.getByRole('button', { name: 'Bắt đầu chương' }).click();
        await page.getByRole('button', { name: /Vào trận đánh/ }).click();
        await expect(page.getByText('PLAYER PHASE')).toBeVisible();
        return;
      }
      if (bestAttack) {
        await tile(bestAttack.target.unit.position);
        await page.getByRole('button', { name: /Tấn công/ }).click();
      } else {
        await page.getByRole('button', { name: /Chờ \(Wait\)/ }).click();
      }
    }
    if (await page.getByRole('heading', { name: /THẤT BẠI/ }).isVisible()) {
      throw new Error(`Marth was defeated on turn ${turn}`);
    }
    if (await page.getByText('PLAYER PHASE').isVisible()) {
      await page.getByRole('button', { name: /Kết thúc lượt/ }).click();
    }
    await expect(page.getByText(`Turn: ${turn + 1}`)).toBeVisible({ timeout: 15000 });
  }
  throw new Error('The chapter was not completed within 16 turns');
});
