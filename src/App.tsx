import React, { useState, useMemo } from 'react';
import mapDataRaw from '../data/maps/test_map_01.json';
import itemsData from '../data/items.json';
import { defaultTerrainRegistry } from './core/grid/terrain';
import { calculateMovementRange } from './core/grid/pathfinding';
import { GridUnit, MapData, Position } from './core/grid/types';
import { TurnManager } from './core/turn/turnManager';
import { ItemDefinition, UnitCombatStats, CombatForecast } from './core/combat/types';
import { calculateCombatForecast, executeCombat, getManhattanDistance } from './core/combat/calculator';
import { defaultRNG } from './core/combat/rng';
import { evaluateAITurn, AIRole } from './core/ai/decision';
import { ThreeScene } from './renderer/ThreeScene';
import { evaluateChapterOutcome, ChapterObjective } from './core/chapter/types';
import { saveGameState, loadGameState } from './core/storage/saveLoad';

const mapData: MapData = mapDataRaw as MapData;
const itemsList = itemsData.items as ItemDefinition[];
const getItem = (id: string): ItemDefinition => itemsList.find((i) => i.id === id) || itemsList[0]!;

export interface ExtendedUnitState {
  unit: GridUnit;
  stats: UnitCombatStats;
  weapon: ItemDefinition;
  aiRole?: AIRole;
}

const INITIAL_EXTENDED_UNITS: ExtendedUnitState[] = [
  {
    unit: {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 1, y: 1 },
      mov: 4,
      moveType: 'foot',
      hasActed: false,
    },
    stats: { hp: 18, maxHp: 18, str: 6, mag: 0, dex: 6, spd: 9, lck: 7, def: 5, res: 0 },
    weapon: getItem('rapier'),
  },
  {
    unit: {
      id: 'jagen',
      name: 'Jagen',
      faction: 'player',
      position: { x: 0, y: 1 },
      mov: 7,
      moveType: 'cavalry',
      hasActed: false,
    },
    stats: { hp: 22, maxHp: 22, str: 7, mag: 0, dex: 10, spd: 8, lck: 3, def: 8, res: 1 },
    weapon: getItem('silver_lance'),
  },
  {
    unit: {
      id: 'enemy_pirate_1',
      name: 'Pirate A',
      faction: 'enemy',
      position: { x: 2, y: 4 },
      mov: 4,
      moveType: 'bandit',
      hasActed: false,
    },
    stats: { hp: 18, maxHp: 18, str: 6, mag: 0, dex: 4, spd: 5, lck: 2, def: 3, res: 0 },
    weapon: getItem('iron_axe'),
    aiRole: 'pursue',
  },
  {
    unit: {
      id: 'enemy_pirate_2',
      name: 'Pirate B (Boss)',
      faction: 'enemy',
      position: { x: 4, y: 7 }, // Canh gác tại Cổng thành Gate (4,7)
      mov: 0,
      moveType: 'armor',
      hasActed: false,
    },
    stats: { hp: 26, maxHp: 26, str: 9, mag: 0, dex: 5, spd: 4, lck: 1, def: 7, res: 0 },
    weapon: getItem('steel_axe'),
    aiRole: 'stationary',
  },
];

const TERRAIN_COLORS: Record<string, { bg: string; label: string; icon: string }> = {
  plains: { bg: '#4a7c59', label: 'Đồng bằng', icon: '🌿' },
  forest: { bg: '#2d5a3f', label: 'Rừng rậm', icon: '🌲' },
  mountain: { bg: '#8b7355', label: 'Đồi núi', icon: '⛰️' },
  peak: { bg: '#5c4d3c', label: 'Đỉnh núi', icon: '🏔️' },
  fort: { bg: '#607d8b', label: 'Pháo đài', icon: '🏰' },
  bridge: { bg: '#a08260', label: 'Cây cầu', icon: '🪵' },
  river: { bg: '#2b5876', label: 'Sông ngòi', icon: '🌊' },
  sea: { bg: '#1e3c72', label: 'Biển cả', icon: '🌊' },
  gate: { bg: '#c0392b', label: 'Cổng thành', icon: '⛩️' },
  wall: { bg: '#474747', label: 'Tường đá', icon: '🧱' },
};

export const App: React.FC = () => {
  const [extendedUnits, setExtendedUnits] = useState<ExtendedUnitState[]>(INITIAL_EXTENDED_UNITS);
  const [turnManager] = useState<TurnManager>(() => new TurnManager(INITIAL_EXTENDED_UNITS.map((u) => u.unit)));
  const [turnState, setTurnState] = useState(turnManager.getState());

  // Giao tranh & Hành động
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [showStoryIntro, setShowStoryIntro] = useState<boolean>(true);
  const [chapterOutcome, setChapterOutcome] = useState<'ongoing' | 'victory' | 'defeat'>('ongoing');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [pendingMovePos, setPendingMovePos] = useState<Position | null>(null);
  const [originalPos, setOriginalPos] = useState<Position | null>(null);
  const [hoveredTile, setHoveredTile] = useState<Position | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<ExtendedUnitState | null>(null);
  const [combatForecast, setCombatForecast] = useState<CombatForecast | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const syncState = () => {
    setTurnState({ ...turnManager.getState() });
  };

  const selectedUnit = turnManager.getSelectedUnit();
  const selectedExtUnit = extendedUnits.find((u) => u.unit.id === selectedUnit?.id);

  // Vùng di chuyển
  const reachableKeys = useMemo(() => {
    if (!turnState.reachableTiles) return new Set<string>();
    return new Set(Array.from(turnState.reachableTiles.keys()));
  }, [turnState.reachableTiles]);

  // Vùng nguy hiểm của quân địch
  const dangerZoneKeys = useMemo(() => {
    const danger = new Set<string>();
    const enemies = extendedUnits.filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead);

    for (const enemy of enemies) {
      const range = calculateMovementRange(enemy.unit, {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: extendedUnits.map((u) => u.unit),
      });

      for (const tile of range.values()) {
        const minR = enemy.weapon.minRange;
        const maxR = enemy.weapon.maxRange;
        for (let dx = -maxR; dx <= maxR; dx++) {
          for (let dy = -maxR; dy <= maxR; dy++) {
            const dist = Math.abs(dx) + Math.abs(dy);
            if (dist >= minR && dist <= maxR) {
              const nx = tile.position.x + dx;
              const ny = tile.position.y + dy;
              if (nx >= 0 && nx < mapData.width && ny >= 0 && ny < mapData.height) {
                danger.add(`${nx},${ny}`);
              }
            }
          }
        }
      }
    }
    return danger;
  }, [extendedUnits]);

  // Danh sách các mục tiêu có thể tấn công từ vị trí hiện tại
  const attackableTargets = useMemo(() => {
    if (!selectedExtUnit || !pendingMovePos) return [];

    const enemies = extendedUnits.filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead);
    return enemies.filter((enemy) => {
      const dist = getManhattanDistance(pendingMovePos, enemy.unit.position);
      return dist >= selectedExtUnit.weapon.minRange && dist <= selectedExtUnit.weapon.maxRange;
    });
  }, [selectedExtUnit, pendingMovePos, extendedUnits]);

  const attackTargetKeys = useMemo(() => {
    return new Set(attackableTargets.map((t) => `${t.unit.position.x},${t.unit.position.y}`));
  }, [attackableTargets]);

  // Click vào ô trên bản đồ
  const handleTileClick = (x: number, y: number) => {
    if (turnState.activePhase !== 'player_phase' || isProcessingAI) {
      return;
    }

    const clickedExt = extendedUnits.find(
      (u) => !u.unit.isDead && u.unit.position.x === x && u.unit.position.y === y
    );

    // Nếu đã di chuyển và đang chọn mục tiêu tấn công
    if (pendingMovePos && attackableTargets.length > 0 && clickedExt && clickedExt.unit.faction === 'enemy') {
      const isTargetValid = attackableTargets.some((t) => t.unit.id === clickedExt.unit.id);
      if (isTargetValid && selectedExtUnit) {
        setSelectedTarget(clickedExt);
        const dist = getManhattanDistance(pendingMovePos, clickedExt.unit.position);
        const attackerTerrain = mapData.grid[pendingMovePos.y]?.[pendingMovePos.x] ?? 'plains';
        const defenderTerrain = mapData.grid[clickedExt.unit.position.y]?.[clickedExt.unit.position.x] ?? 'plains';

        const forecast = calculateCombatForecast(
          selectedExtUnit.unit,
          selectedExtUnit.stats,
          selectedExtUnit.weapon,
          clickedExt.unit,
          clickedExt.stats,
          clickedExt.weapon,
          dist,
          defaultTerrainRegistry,
          attackerTerrain,
          defenderTerrain
        );
        setCombatForecast(forecast);
        return;
      }
    }

    // Nếu đã chọn 1 quân ta và click vào ô di chuyển
    if (selectedExtUnit && reachableKeys.has(`${x},${y}`) && !pendingMovePos) {
      setOriginalPos({ ...selectedExtUnit.unit.position });
      const success = turnManager.moveSelectedUnit({ x, y });
      if (success) {
        setPendingMovePos({ x, y });
        syncState();
      }
      return;
    }

    // Chọn đơn vị quân ta chưa đi
    if (clickedExt && clickedExt.unit.faction === 'player' && !clickedExt.unit.hasActed && !pendingMovePos) {
      const range = calculateMovementRange(clickedExt.unit, {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: extendedUnits.map((u) => u.unit),
      });
      turnManager.selectUnit(clickedExt.unit.id, range);
      setPendingMovePos(null);
      setSelectedTarget(null);
      setCombatForecast(null);
      syncState();
      return;
    }

    // Bỏ chọn
    if (!pendingMovePos) {
      turnManager.cancelSelect();
      setSelectedTarget(null);
      setCombatForecast(null);
      syncState();
    }
  };

  // Xác nhận Tấn công
  const handleConfirmAttack = () => {
    if (!combatForecast || !selectedExtUnit || !selectedTarget) return;

    const result = executeCombat(combatForecast, defaultRNG);

    // Cập nhật log trận đánh
    const logs: string[] = [];
    logs.push(`⚔️ GIAO TRANH: ${selectedExtUnit.unit.name} vs ${selectedTarget.unit.name}`);
    for (const ev of result.events) {
      const atk = extendedUnits.find((u) => u.unit.id === ev.attackerId)?.unit.name || 'Ai đó';
      const def = extendedUnits.find((u) => u.unit.id === ev.defenderId)?.unit.name || 'Ai đó';
      if (!ev.isHit) {
        logs.push(`${atk} tấn công ${def} nhưng bị TRƯỢT (Miss)!`);
      } else {
        const critText = ev.isCrit ? ' [CHÍ MẠNG (CRIT)!]' : '';
        logs.push(`${atk} đánh trúng ${def} gây ${ev.damageDealt} sát thương!${critText} (${def} còn ${ev.defenderHpAfter} HP)`);
      }
    }

    if (result.unitDefeatedId) {
      const deadName = extendedUnits.find((u) => u.unit.id === result.unitDefeatedId)?.unit.name;
      logs.push(`💀 ${deadName} đã bị hạ gục!`);
    }

    setCombatLog((prev) => [...logs, ...prev].slice(0, 20));

    // Cập nhật trạng thái sống/chết và HP
    setExtendedUnits((prev) =>
      prev.map((item) => {
        if (item.unit.id === selectedExtUnit.unit.id) {
          return {
            ...item,
            stats: { ...combatForecast.attacker.stats },
            unit: { ...item.unit, isDead: combatForecast.attacker.stats.hp <= 0 },
          };
        }
        if (item.unit.id === selectedTarget.unit.id) {
          return {
            ...item,
            stats: { ...combatForecast.defender.stats },
            unit: { ...item.unit, isDead: combatForecast.defender.stats.hp <= 0 },
          };
        }
        return item;
      })
    );

    // Kiểm tra kết quả chương
    setTimeout(() => {
      setExtendedUnits((currentUnits) => {
        const outcome = evaluateChapterOutcome(
          currentUnits.map((u) => u.unit),
          chapterObjective
        );
        if (outcome !== 'ongoing') {
          setChapterOutcome(outcome);
        }
        return currentUnits;
      });
    }, 100);

    // Đánh dấu hành động hoàn thành
    turnManager.waitSelectedUnit();
    setPendingMovePos(null);
    setSelectedTarget(null);
    setCombatForecast(null);
    syncState();
  };

  // Xác nhận Chờ
  const handleConfirmWait = () => {
    turnManager.waitSelectedUnit();
    setPendingMovePos(null);
    setSelectedTarget(null);
    setCombatForecast(null);
    syncState();
  };

  // Hủy bước di chuyển
  const handleCancelMove = () => {
    if (selectedExtUnit && originalPos) {
      selectedExtUnit.unit.position = { ...originalPos };
    }
    turnManager.cancelSelect();
    setPendingMovePos(null);
    setOriginalPos(null);
    setSelectedTarget(null);
    setCombatForecast(null);
    syncState();
  };

  // Chạy AI Turn
  const runAITurn = () => {
    setIsProcessingAI(true);
    const activeEnemies = extendedUnits.filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead);

    const statsMap = new Map(extendedUnits.map((u) => [u.unit.id, u.stats]));
    const weaponsMap = new Map(extendedUnits.map((u) => [u.unit.id, u.weapon]));

    const logs: string[] = [`🔴 BẮT ĐẦU ENEMY PHASE (Lượt ${turnState.turnNumber})`];

    for (const enemy of activeEnemies) {
      const decision = evaluateAITurn(enemy.unit, enemy.aiRole || 'pursue', {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: extendedUnits.map((u) => u.unit),
        unitStatsMap: statsMap,
        unitWeaponsMap: weaponsMap,
      });

      if (decision.type === 'attack') {
        enemy.unit.position = { ...decision.movePosition };
        logs.push(`🔴 ${enemy.unit.name} di chuyển đến (${decision.movePosition.x},${decision.movePosition.y}) và tấn công ${decision.targetUnit.name}!`);

        const result = executeCombat(decision.forecast, defaultRNG);
        for (const ev of result.events) {
          const atk = extendedUnits.find((u) => u.unit.id === ev.attackerId)?.unit.name || '';
          const def = extendedUnits.find((u) => u.unit.id === ev.defenderId)?.unit.name || '';
          if (!ev.isHit) {
            logs.push(`  ${atk} đánh trượt ${def}!`);
          } else {
            const critText = ev.isCrit ? ' [CHÍ MẠNG!]' : '';
            logs.push(`  ${atk} đánh trúng ${def} gây ${ev.damageDealt} dame!${critText}`);
          }
        }
        if (result.unitDefeatedId) {
          const defeated = extendedUnits.find((u) => u.unit.id === result.unitDefeatedId)?.unit.name;
          logs.push(`  💀 ${defeated} đã ngã xuống!`);
        }
      } else if (decision.type === 'move_only') {
        enemy.unit.position = { ...decision.movePosition };
        logs.push(`🔴 ${enemy.unit.name} tiến về phía quân ta đến (${decision.movePosition.x},${decision.movePosition.y}).`);
      } else {
        logs.push(`🔴 ${enemy.unit.name} giữ nguyên vị trí canh gác.`);
      }

      enemy.unit.hasActed = true;
    }

    setCombatLog((prev) => [...logs, ...prev].slice(0, 30));

    // Kiểm tra kết quả chương sau lượt địch
    const outcome = evaluateChapterOutcome(
      extendedUnits.map((u) => u.unit),
      chapterObjective
    );
    if (outcome !== 'ongoing') {
      setChapterOutcome(outcome);
    }

    // Chuyển lại về Player Phase
    turnManager.switchPhase('player_phase');
    setIsProcessingAI(false);
    syncState();
  };

  const chapterObjective: ChapterObjective = {
    type: 'defeat_boss',
    bossUnitId: 'enemy_pirate_2',
    descriptionVi: 'Hạ gục thủ lĩnh Pirate B (Boss) đang chiếm giữ cổng thành',
  };

  const handleSave = () => {
    const ok = saveGameState({
      chapterId: 'test_chapter_01',
      turnState: turnManager.getState(),
      extendedUnits,
    });
    if (ok) {
      setStatusNotice('✓ Đã lưu tiến độ trận đánh thành công!');
      setTimeout(() => setStatusNotice(null), 2500);
    }
  };

  const handleLoad = () => {
    const data = loadGameState();
    if (data) {
      setExtendedUnits(data.extendedUnits);
      turnManager.switchPhase(data.turnState.activePhase);
      syncState();
      setStatusNotice('✓ Đã nạp lại tiến độ từ file lưu!');
      setTimeout(() => setStatusNotice(null), 2500);
    } else {
      alert('Không tìm thấy dữ liệu lưu hợp lệ.');
    }
  };

  const handleRestartChapter = () => {
    window.location.reload();
  };

  const handleEndTurn = () => {
    turnManager.switchPhase('enemy_phase');
    syncState();
    setTimeout(() => {
      runAITurn();
    }, 400);
  };

  const hoveredTerrainId = hoveredTile ? mapData.grid[hoveredTile.y]?.[hoveredTile.x] : null;
  const hoveredTerrain = hoveredTerrainId ? defaultTerrainRegistry.get(hoveredTerrainId) : null;
  const hoveredUnit = hoveredTile
    ? extendedUnits.find(
        (u) => !u.unit.isDead && u.unit.position.x === hoveredTile.x && u.unit.position.y === hoveredTile.y
      )
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '16px', boxSizing: 'border-box' }}>
      {/* Header bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          backgroundColor: '#262626',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#64B5F6' }}>
            Water Emblem - Mystery of Nothing
          </h1>
          <span style={{ fontSize: '13px', color: '#aaa' }}>
            Chương 1: Đảo Talys (Mục tiêu: {chapterObjective.descriptionVi})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Save / Load buttons */}
          <button
            onClick={handleSave}
            style={{
              padding: '6px 12px',
              backgroundColor: '#2e7d32',
              border: '1px solid #4caf50',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            💾 Lưu Game
          </button>
          <button
            onClick={handleLoad}
            style={{
              padding: '6px 12px',
              backgroundColor: '#1565c0',
              border: '1px solid #42a5f5',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            📂 Nạp Game
          </button>

          {/* View mode toggle */}
          <div style={{ display: 'flex', backgroundColor: '#1e1e1e', borderRadius: '6px', padding: '2px', border: '1px solid #444' }}>
            <button
              onClick={() => setViewMode('3d')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: viewMode === '3d' ? '#1976D2' : 'transparent',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🎮 3D View
            </button>
            <button
              onClick={() => setViewMode('2d')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: viewMode === '2d' ? '#1976D2' : 'transparent',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🗺️ 2D Grid
            </button>
          </div>

          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            Turn: <span style={{ color: '#FFD54F' }}>{turnState.turnNumber}</span>
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 'bold',
              backgroundColor: turnState.activePhase === 'player_phase' ? '#1976D2' : '#C62828',
            }}
          >
            {turnState.activePhase === 'player_phase' ? '🛡️ PLAYER PHASE' : '⚔️ ENEMY PHASE'}
          </div>
          {turnState.activePhase === 'player_phase' && (
            <button
              onClick={handleEndTurn}
              disabled={isProcessingAI}
              style={{
                padding: '8px 16px',
                backgroundColor: '#37474F',
                border: '1px solid #607D8B',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Kết thúc lượt (End Turn)
            </button>
          )}
        </div>
      </header>

      {/* Main workspace: Map + Side panel */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Map Grid Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#111',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {viewMode === '3d' ? (
            <ThreeScene
              mapData={mapData}
              units={extendedUnits}
              reachableKeys={reachableKeys}
              dangerZoneKeys={dangerZoneKeys}
              selectedPos={pendingMovePos || (selectedExtUnit ? selectedExtUnit.unit.position : null)}
              attackTargetKeys={attackTargetKeys}
              onTileClick={handleTileClick}
              onTileHover={(x, y) => setHoveredTile({ x, y })}
            />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${mapData.width}, 64px)`,
                gridTemplateRows: `repeat(${mapData.height}, 64px)`,
                gap: '2px',
                backgroundColor: '#000',
                padding: '4px',
                borderRadius: '4px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              {mapData.grid.map((row, y) =>
                row.map((terrainId, x) => {
                  const key = `${x},${y}`;
                  const terrain = TERRAIN_COLORS[terrainId] || { bg: '#333', label: terrainId, icon: '' };
                  const isReachable = reachableKeys.has(key);
                  const isDanger = dangerZoneKeys.has(key);
                  const extUnit = extendedUnits.find(
                    (u) => !u.unit.isDead && u.unit.position.x === x && u.unit.position.y === y
                  );
                  const isSelected = selectedUnit && selectedUnit.position.x === x && selectedUnit.position.y === y;
                  const isAttackTarget = attackableTargets.some((t) => t.unit.position.x === x && t.unit.position.y === y);

                  return (
                    <div
                      key={key}
                      onClick={() => handleTileClick(x, y)}
                      onMouseEnter={() => setHoveredTile({ x, y })}
                      style={{
                        position: 'relative',
                        width: '64px',
                        height: '64px',
                        backgroundColor: terrain.bg,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        border: isSelected
                          ? '2px solid #FFEB3B'
                          : isAttackTarget
                          ? '2px solid #FF1744'
                          : '1px solid rgba(255,255,255,0.05)',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Danger zone overlay */}
                      {isDanger && !isReachable && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(239, 83, 80, 0.25)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}

                      {/* Reachable tile overlay */}
                      {isReachable && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(33, 150, 243, 0.45)',
                            border: '1px dashed #90CAF9',
                            pointerEvents: 'none',
                          }}
                        />
                      )}

                      {/* Attack target indicator */}
                      {isAttackTarget && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(255, 23, 68, 0.35)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}

                      <span style={{ fontSize: '18px', opacity: 0.7, zIndex: 1 }}>{terrain.icon}</span>

                      {/* Unit display */}
                      {extUnit && (
                        <div
                          style={{
                            zIndex: 2,
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#fff',
                            backgroundColor: extUnit.unit.hasActed
                              ? '#616161'
                              : extUnit.unit.faction === 'player'
                              ? '#1E88E5'
                              : '#E53935',
                            border: isSelected ? '2px solid #FFEB3B' : '2px solid rgba(0,0,0,0.4)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                          }}
                        >
                          <div>{extUnit.unit.name.substring(0, 3)}</div>
                          <div style={{ fontSize: '9px', opacity: 0.9 }}>
                            HP:{extUnit.stats.hp}
                          </div>
                        </div>
                      )}

                      <span
                        style={{
                          position: 'absolute',
                          bottom: '2px',
                          right: '3px',
                          fontSize: '9px',
                          color: 'rgba(255,255,255,0.4)',
                          zIndex: 1,
                        }}
                      >
                        {x},{y}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Side Panel: Combat Forecast, Actions & Inspector */}
        <div
          style={{
            width: '320px',
            backgroundColor: '#212121',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            border: '1px solid #333',
            overflowY: 'auto',
          }}
        >
          {/* Combat Forecast Window (Q05) */}
          {combatForecast && selectedExtUnit && selectedTarget && (
            <div
              style={{
                backgroundColor: '#1b2a47',
                padding: '14px',
                borderRadius: '8px',
                border: '2px solid #42a5f5',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#90caf9', marginBottom: '8px', fontSize: '15px' }}>
                ⚔️ DỰ BÁO CHIẾN ĐẤU (Combat Forecast)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '12px' }}>
                {/* Attacker */}
                <div style={{ backgroundColor: '#0d47a1', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', color: '#fff' }}>{selectedExtUnit.unit.name}</div>
                  <div style={{ color: '#90caf9' }}>{selectedExtUnit.weapon.nameVi}</div>
                  <div>HP: <strong>{selectedExtUnit.stats.hp}</strong></div>
                  <div>Sát thương: <strong style={{ color: '#ffca28' }}>{combatForecast.attacker.damage} {combatForecast.attacker.attackCount > 1 ? `x${combatForecast.attacker.attackCount}` : ''}</strong></div>
                  <div>Trúng (Hit): <strong>{combatForecast.attacker.hitRate}%</strong></div>
                  <div>Chí mạng: <strong>{combatForecast.attacker.critRate}%</strong></div>
                </div>

                {/* Defender */}
                <div style={{ backgroundColor: '#b71c1c', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', color: '#fff' }}>{selectedTarget.unit.name}</div>
                  <div style={{ color: '#ef9a9a' }}>{selectedTarget.weapon.nameVi}</div>
                  <div>HP: <strong>{selectedTarget.stats.hp}</strong></div>
                  {combatForecast.defender.canCounter ? (
                    <>
                      <div>Sát thương: <strong style={{ color: '#ffca28' }}>{combatForecast.defender.damage} {combatForecast.defender.attackCount > 1 ? `x${combatForecast.defender.attackCount}` : ''}</strong></div>
                      <div>Trúng (Hit): <strong>{combatForecast.defender.hitRate}%</strong></div>
                      <div>Chí mạng: <strong>{combatForecast.defender.critRate}%</strong></div>
                    </>
                  ) : (
                    <div style={{ color: '#aaa', fontStyle: 'italic', marginTop: '6px' }}>Không thể phản đòn</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleConfirmAttack}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#e53935',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ⚔️ Tấn công!
                </button>
                <button
                  onClick={() => { setCombatForecast(null); setSelectedTarget(null); }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#555',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Action Menu when unit moved */}
          {pendingMovePos && !combatForecast && (
            <div
              style={{
                backgroundColor: '#2c3e50',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #3498db',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#64B5F6' }}>
                Lựa chọn hành động ({selectedExtUnit?.unit.name})
              </div>
              {attackableTargets.length > 0 && (
                <div style={{ fontSize: '12px', color: '#FFD54F', marginBottom: '8px' }}>
                  🎯 Click vào mục tiêu màu đỏ để xem dự báo trận đánh!
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={handleConfirmWait}
                  style={{
                    padding: '8px',
                    backgroundColor: '#27ae60',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ✓ Chờ (Wait)
                </button>
                <button
                  onClick={handleCancelMove}
                  style={{
                    padding: '8px',
                    backgroundColor: '#c0392b',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ✕ Hủy bước đi
                </button>
              </div>
            </div>
          )}

          {/* Unit & Terrain Inspector */}
          <div
            style={{
              backgroundColor: '#2a2a2a',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #444',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#FFD54F' }}>
              👤 Thông tin đơn vị & Địa hình
            </h3>
            {hoveredUnit || selectedExtUnit ? (
              (() => {
                const u = (hoveredUnit || selectedExtUnit)!;
                return (
                  <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                    <div><strong>Tên:</strong> {u.unit.name} ({u.unit.faction === 'player' ? 'Quân ta' : 'Quân địch'})</div>
                    <div><strong>Vũ khí:</strong> {u.weapon.nameVi} ({u.weapon.type.toUpperCase()}, Mt:{u.weapon.might}, Wt:{u.weapon.weight})</div>
                    <div><strong>HP:</strong> {u.stats.hp} / {u.stats.maxHp} | <strong>Mov:</strong> {u.unit.mov} ({u.unit.moveType})</div>
                    <div><strong>Chỉ số:</strong> Str:{u.stats.str} | Spd:{u.stats.spd} | Dex:{u.stats.dex} | Def:{u.stats.def}</div>
                  </div>
                );
              })()
            ) : (
              <div style={{ fontSize: '12px', color: '#888' }}>
                Di chuột vào đơn vị để xem chi tiết
              </div>
            )}
            {hoveredTerrain && hoveredTile && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333', fontSize: '12px', color: '#81C784' }}>
                <div><strong>Ô ({hoveredTile.x}, {hoveredTile.y}):</strong> {hoveredTerrain.nameVi}</div>
                <div>Né tránh: +{hoveredTerrain.avoidBonus}% | Phòng thủ: +{hoveredTerrain.defenseBonus}</div>
              </div>
            )}
          </div>

          {/* Combat Battle Log */}
          <div
            style={{
              backgroundColor: '#1e1e1e',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: '120px',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#90caf9', marginBottom: '6px' }}>
              📜 Nhật ký trận đấu
            </div>
            <div style={{ overflowY: 'auto', flex: 1, fontSize: '11px', lineHeight: '1.4', color: '#ddd' }}>
              {combatLog.length === 0 ? (
                <span style={{ color: '#777' }}>Chưa có giao tranh nào diễn ra.</span>
              ) : (
                combatLog.map((log, idx) => <div key={idx} style={{ marginBottom: '3px' }}>{log}</div>)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Notification Toast */}
      {statusNotice && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#2e7d32',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '6px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            zIndex: 9999,
          }}
        >
          {statusNotice}
        </div>
      )}

      {/* Opening Story Dialogue Cutscene Modal */}
      {showStoryIntro && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '520px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
            }}
          >
            <h2 style={{ margin: '0 0 12px 0', color: '#60a5fa' }}>
              📜 Chương 1: Bờ biển Talys
            </h2>
            <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#e2e8f0', marginBottom: '20px' }}>
              <p>
                <strong>Marth:</strong> "Bọn hải tặc Gazak đã tràn lên bờ biển đảo Talys! Chúng đang cướp bóc làng mạc và đe dọa người dân vô tội."
              </p>
              <p>
                <strong>Jagen:</strong> "Bẩm Điện hạ, tên thủ lĩnh Pirate B đang đóng giữ pháo đài cổng thành phía nam. Quân ta hãy chia đường tiến quân, tận dụng bụi rậm né tránh và tiêu diệt tên đầu sỏ!"
              </p>
              <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #f59e0b' }}>
                <strong style={{ color: '#fbbf24' }}>Mục tiêu chiến thắng:</strong> {chapterObjective.descriptionVi}.
                <br />
                <span style={{ color: '#ef4444' }}>Thất bại nếu Marth tử trận.</span>
              </div>
            </div>
            <button
              onClick={() => setShowStoryIntro(false)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              ⚔️ Vào trận đánh (Start Battle)
            </button>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {chapterOutcome === 'victory' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#14532d',
              border: '2px solid #22c55e',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '460px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
            }}
          >
            <h2 style={{ margin: '0 0 10px 0', color: '#86efac', fontSize: '24px' }}>
              🏆 CHIẾN THẮNG! (STAGE CLEAR)
            </h2>
            <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#dcfce7', marginBottom: '20px' }}>
              Bạn đã tiêu diệt thủ lĩnh Pirate B và giải cứu bờ biển Talys!
              <br />
              Chương 1 của Water Emblem đã hoàn thành xuất sắc!
            </p>
            <button
              onClick={handleRestartChapter}
              style={{
                padding: '12px 24px',
                backgroundColor: '#22c55e',
                border: 'none',
                borderRadius: '6px',
                color: '#052e16',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              🔄 Chơi lại chương
            </button>
          </div>
        </div>
      )}

      {/* Defeat Modal */}
      {chapterOutcome === 'defeat' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#7f1d1d',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '460px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
            }}
          >
            <h2 style={{ margin: '0 0 10px 0', color: '#fca5a5', fontSize: '24px' }}>
              💀 THẤT BẠI (GAME OVER)
            </h2>
            <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#fee2e2', marginBottom: '20px' }}>
              Marth đã ngã xuống trong trận chiến...
              <br />
              Hy vọng của vương quốc Altea đã vụt tắt.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleLoad}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                📂 Nạp lại điểm lưu
              </button>
              <button
                onClick={handleRestartChapter}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                🔄 Chơi lại từ đầu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
