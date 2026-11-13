import { describe, it, expect } from 'vitest';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import { MoveType } from '../../src/core/grid/types';

describe('TerrainRegistry', () => {
  const registry = new TerrainRegistry();

  it('lấy đúng chi phí di chuyển cho bộ binh (foot)', () => {
    expect(registry.getMovementCost('plains', 'foot')).toBe(1);
    expect(registry.getMovementCost('forest', 'foot')).toBe(2);
    expect(registry.getMovementCost('mountain', 'foot')).toBe(4);
    expect(registry.getMovementCost('river', 'foot')).toBeNull();
    expect(registry.getMovementCost('peak', 'foot')).toBeNull();
  });

  it('kỵ binh (cavalry) tốn 3 điểm khi vào rừng và không thể leo núi', () => {
    expect(registry.getMovementCost('plains', 'cavalry')).toBe(1);
    expect(registry.getMovementCost('forest', 'cavalry')).toBe(3);
    expect(registry.getMovementCost('mountain', 'cavalry')).toBeNull();
  });

  it('phi binh (flier) bay qua mọi địa hình tự nhiên với cost = 1', () => {
    const flier: MoveType = 'flier';
    expect(registry.getMovementCost('plains', flier)).toBe(1);
    expect(registry.getMovementCost('forest', flier)).toBe(1);
    expect(registry.getMovementCost('mountain', flier)).toBe(1);
    expect(registry.getMovementCost('peak', flier)).toBe(1);
    expect(registry.getMovementCost('river', flier)).toBe(1);
    expect(registry.getMovementCost('sea', flier)).toBe(1);
    // Tường thành không thể đi xuyên qua
    expect(registry.getMovementCost('wall', flier)).toBeNull();
  });

  it('trả về đúng bonus né tránh và phòng thủ của địa hình', () => {
    expect(registry.getAvoidBonus('forest')).toBe(20);
    expect(registry.getDefenseBonus('forest')).toBe(1);
    expect(registry.getAvoidBonus('fort')).toBe(20);
    expect(registry.getDefenseBonus('fort')).toBe(2);
    expect(registry.getHealPercent('fort')).toBe(20);
  });
});
