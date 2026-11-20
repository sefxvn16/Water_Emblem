import { describe, it, expect } from 'vitest';
import { TurnManager } from '../../src/core/turn/turnManager';
import { GridUnit } from '../../src/core/grid/types';

describe('TurnManager & Phase Transition', () => {
  const getInitialUnits = (): GridUnit[] => [
    {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 4,
      moveType: 'foot',
      hasActed: false,
    },
    {
      id: 'jagen',
      name: 'Jagen',
      faction: 'player',
      position: { x: 1, y: 0 },
      mov: 7,
      moveType: 'cavalry',
      hasActed: false,
    },
    {
      id: 'enemy_1',
      name: 'Pirate',
      faction: 'enemy',
      position: { x: 5, y: 5 },
      mov: 5,
      moveType: 'bandit',
      hasActed: false,
    },
  ];

  it('bắt đầu ở Turn 1, Player Phase', () => {
    const manager = new TurnManager(getInitialUnits());
    const state = manager.getState();

    expect(state.turnNumber).toBe(1);
    expect(state.activePhase).toBe('player_phase');
    expect(state.selectedUnitId).toBeNull();
  });

  it('chọn và di chuyển đơn vị người chơi', () => {
    const manager = new TurnManager(getInitialUnits());

    const fakeReachable = new Map();
    fakeReachable.set('0,2', {
      position: { x: 0, y: 2 },
      costRemaining: 2,
      path: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
    });

    const selectSuccess = manager.selectUnit('marth', fakeReachable);
    expect(selectSuccess).toBe(true);
    expect(manager.getSelectedUnit()?.id).toBe('marth');

    // Di chuyển tới ô hợp lệ
    const moveSuccess = manager.moveSelectedUnit({ x: 0, y: 2 });
    expect(moveSuccess).toBe(true);
    expect(manager.getSelectedUnit()?.position).toEqual({ x: 0, y: 2 });

    // Kết thúc hành động của Marth
    const waitSuccess = manager.waitSelectedUnit();
    expect(waitSuccess).toBe(true);

    const marth = manager.getState().units.find((u) => u.id === 'marth');
    expect(marth?.hasActed).toBe(true);
    // Vẫn còn Jagen chưa đi -> activePhase vẫn là player_phase
    expect(manager.getState().activePhase).toBe('player_phase');
  });

  it('tự động chuyển sang Enemy Phase khi tất cả quân ta đã hành động (khi bật Auto End Turn — PLAN 138)', () => {
    const manager = new TurnManager(getInitialUnits());
    manager.setAutoEndTurn(true);

    const fakeReachable = new Map();
    fakeReachable.set('0,1', {
      position: { x: 0, y: 1 },
      costRemaining: 0,
      path: [{ x: 0, y: 0 }, { x: 0, y: 1 }],
    });

    // Marth hành động
    manager.selectUnit('marth', fakeReachable);
    manager.waitSelectedUnit();

    // Jagen hành động
    manager.selectUnit('jagen', fakeReachable);
    manager.waitSelectedUnit();

    // Tất cả quân ta đã hành động -> tự động chuyển Enemy Phase
    expect(manager.getState().activePhase).toBe('enemy_phase');
  });

  it('mặc định tắt Auto End Turn: hết quân hành động vẫn ở Player Phase (PLAN 138)', () => {
    const manager = new TurnManager(getInitialUnits());
    const fakeReachable = new Map();

    manager.selectUnit('marth', fakeReachable);
    manager.waitSelectedUnit();
    manager.selectUnit('jagen', fakeReachable);
    manager.waitSelectedUnit();

    expect(manager.getState().activePhase).toBe('player_phase');
  });

  it('kết thúc Enemy Phase sẽ sang Turn 2, Player Phase và reset trạng thái hasActed', () => {
    const manager = new TurnManager(getInitialUnits());
    manager.setAutoEndTurn(true);

    // Đơn vị đi hết
    const dummyRange = new Map();
    manager.selectUnit('marth', dummyRange);
    manager.waitSelectedUnit();
    manager.selectUnit('jagen', dummyRange);
    manager.waitSelectedUnit();

    expect(manager.getState().activePhase).toBe('enemy_phase');

    // Chuyển sang player phase (hết lượt địch)
    manager.switchPhase('player_phase');

    const state = manager.getState();
    expect(state.turnNumber).toBe(2);
    expect(state.activePhase).toBe('player_phase');

    const marth = state.units.find((u) => u.id === 'marth');
    const jagen = state.units.find((u) => u.id === 'jagen');
    expect(marth?.hasActed).toBe(false);
    expect(jagen?.hasActed).toBe(false);
  });

  it('khôi phục đúng lượt và dùng cùng quân với trạng thái đã tải', () => {
    const manager = new TurnManager(getInitialUnits());
    const restoredUnits = getInitialUnits();
    restoredUnits[0]!.position = { x: 2, y: 2 };
    restoredUnits[0]!.hasActed = true;

    manager.restoreState({ turnNumber: 4, activePhase: 'player_phase' }, restoredUnits);

    expect(manager.getState().turnNumber).toBe(4);
    // PLAN item 133 (owner decision 2, 2026-11-19): value comparison instead
    // of reference identity — restoreState now clones units so the manager
    // never mutates caller-owned objects.
    expect(manager.getState().units).toEqual(restoredUnits);
    expect(manager.getSelectedUnit()).toBeUndefined();
    expect(manager.getState().reachableTiles).toBeNull();
    expect(manager.getState().units[0]?.position).toEqual({ x: 2, y: 2 });
    expect(manager.getState().units[0]?.hasActed).toBe(true);
  });
});
