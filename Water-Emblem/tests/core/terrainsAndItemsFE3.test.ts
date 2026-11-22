import { describe, it, expect } from 'vitest';
import terrainJson from '../../data/terrains.json';
import itemsJson from '../../data/items.json';
import classesJson from '../../data/classes.json';
import { TerrainRegistry } from '../../src/core/grid/terrain';

describe('terrains and items match FE3 Akaneia specifications', () => {
  it('terrains.json contains all required FE3 terrains including indoor and strategic tiles', () => {
    const terrainIds = terrainJson.terrains.map((t) => t.id);
    const requiredFe3Terrains = [
      'plains', 'road', 'bridge', 'rubble', 'forest', 'mountain', 'sand',
      'river', 'sea', 'peak', 'cliff', 'wall', 'gate', 'castle', 'fort',
      'village', 'house', 'shop', 'chest', 'door', 'arena', 'ballista',
      'throne', 'pillar', 'floor', 'corridor', 'tunnel', 'altar', 'drawbridge',
    ];

    for (const req of requiredFe3Terrains) {
      expect(terrainIds).toContain(req);
    }
    expect(terrainJson.terrains.length).toBeGreaterThanOrEqual(29);
  });

  it('TerrainRegistry correctly loads and resolves newly added FE3 terrains', () => {
    const registry = new TerrainRegistry();
    const throne = registry.get('throne');
    expect(throne).toBeDefined();
    expect(throne?.avoidBonus).toBe(20);
    expect(throne?.defenseBonus).toBe(2);
    expect(throne?.healPercent).toBe(20);
    expect(throne?.obstacleType).toBe('structure');

    const pillar = registry.get('pillar');
    expect(pillar).toBeDefined();
    expect(pillar?.avoidBonus).toBe(20);
    expect(pillar?.defenseBonus).toBe(1);

    const floor = registry.get('floor');
    expect(floor).toBeDefined();
    expect(floor?.avoidBonus).toBe(0);
    expect(registry.getMovementCost('floor', 'foot')).toBe(1);

    const drawbridge = registry.get('drawbridge');
    expect(drawbridge).toBeDefined();
    expect(registry.getMovementCost('drawbridge', 'foot')).toBeNull();
    expect(registry.getMovementCost('drawbridge', 'flier')).toBe(1);
  });

  it('items.json contains over 110 items with complete FE3 weaponry, staves, dragonstones and star shards', () => {
    const items = itemsJson.items;
    const itemIds = new Set(items.map((i) => i.id));
    expect(items.length).toBeGreaterThanOrEqual(110);

    // Staves
    const staves = [
      'heal_staff', 'mend_staff', 'recover_staff', 'physic_staff', 'fortify_staff',
      'warp_staff', 'silence_staff', 'hammerne_staff', 'rescue_staff', 'aum_staff',
      'unlock_staff', 'thief_staff', 'watch_staff', 'again_staff', 'barrier_staff',
    ];
    for (const staffId of staves) {
      expect(itemIds.has(staffId), `Missing staff: ${staffId}`).toBe(true);
      const def = items.find((i) => i.id === staffId);
      expect(def?.type).toBe('staff');
    }

    // Dragonstones & Dragon Breaths
    const dragonItems = [
      'firestone', 'icestone', 'wyvernstone', 'earthstone', 'darkstone', 'divinestone', 'magestone',
      'dragon_breath', 'fire_breath', 'ice_breath', 'dark_breath', 'mist_breath',
    ];
    for (const dId of dragonItems) {
      expect(itemIds.has(dId), `Missing dragon item: ${dId}`).toBe(true);
    }

    // Star Shards (all 12 zodiac shards)
    const starShards = [
      'aries_shard', 'taurus_shard', 'gemini_shard', 'cancer_shard',
      'leo_shard', 'virgo_shard', 'libra_shard', 'scorpio_shard',
      'sagittarius_shard', 'capricorn_shard', 'aquarius_shard', 'pisces_shard',
    ];
    for (const shardId of starShards) {
      expect(itemIds.has(shardId), `Missing star shard: ${shardId}`).toBe(true);
    }

    // Special items, cards & orbs
    const specials = [
      'iotes_shield', 'silver_card', 'member_card', 'starsphere', 'binding_shield',
      'life_orb', 'earth_orb', 'lightsphere', 'darksphere', 'power_ring',
      'dracoshield', 'secret_book', 'speed_ring', 'goddess_icon', 'seraph_robe',
      'talisman', 'boots', 'manual', 'door_key', 'chest_key', 'bridge_key',
    ];
    for (const sId of specials) {
      expect(itemIds.has(sId), `Missing special item: ${sId}`).toBe(true);
    }
  });

  it('classes.json defines Manakete transformation and valid mount kinds', () => {
    const manakete = classesJson.classes.find((c: any) => c.id === 'manakete');
    expect(manakete).toBeDefined();
    expect(manakete?.canTransform).toBe(true);
    expect(manakete?.transformWeaponId).toBe('dragon_breath');

    const cavalier = classesJson.classes.find((c: any) => c.id === 'cavalier');
    expect(cavalier?.mountKind).toBe('ground');

    const mangudai = classesJson.classes.find((c: any) => c.id === 'mangudai');
    expect(mangudai?.mountKind).toBe('ground');

    const pegasus = classesJson.classes.find((c: any) => c.id === 'pegasus_knight');
    expect(pegasus?.mountKind).toBe('flying');
  });
});
