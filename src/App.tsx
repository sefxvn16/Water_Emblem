import React, { useState, useMemo } from 'react';
import mapDataRaw from '../data/maps/test_map_01.json';
import { defaultTerrainRegistry } from './core/grid/terrain';
import { calculateMovementRange } from './core/grid/pathfinding';
import { GridUnit, MapData, Position } from './core/grid/types';
import { TurnManager, GamePhase } from './core/turn/turnManager';

const mapData: MapData = mapDataRaw as MapData;

const INITIAL_UNITS: GridUnit[] = [
  {
    id: 'marth',
    name: 'Marth',
    faction: 'player',
    position: { x: 1, y: 1 },
    mov: 4,
    moveType: 'foot',
    hasActed: false,
  },
  {
    id: 'jagen',
    name: 'Jagen',
    faction: 'player',
    position: { x: 0, y: 1 },
    mov: 7,
    moveType: 'cavalry',
    hasActed: false,
  },
  {
    id: 'enemy_pirate_1',
    name: 'Pirate A',
    faction: 'enemy',
    position: { x: 5, y: 5 },
    mov: 5,
    moveType: 'bandit',
    hasActed: false,
  },
  {
    id: 'enemy_pirate_2',
    name: 'Pirate B',
    faction: 'enemy',
    position: { x: 6, y: 2 },
    mov: 5,
    moveType: 'bandit',
    hasActed: false,
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
  const [turnManager] = useState<TurnManager>(() => new TurnManager(INITIAL_UNITS));
  const [turnState, setTurnState] = useState(turnManager.getState());
  const [pendingMovePos, setPendingMovePos] = useState<Position | null>(null);
  const [hoveredTile, setHoveredTile] = useState<Position | null>(null);

  // Sync state helper
  const syncState = () => {
    setTurnState({ ...turnManager.getState() });
  };

  const selectedUnit = turnManager.getSelectedUnit();

  // Vùng di chuyển (Reachability)
  const reachableKeys = useMemo(() => {
    if (!turnState.reachableTiles) return new Set<string>();
    return new Set(Array.from(turnState.reachableTiles.keys()));
  }, [turnState.reachableTiles]);

  // Vùng nguy hiểm (Danger zone: tầm di chuyển + 1 của toàn bộ quân địch)
  const dangerZoneKeys = useMemo(() => {
    const danger = new Set<string>();
    const enemies = turnState.units.filter((u) => u.faction === 'enemy' && !u.isDead);

    for (const enemy of enemies) {
      const range = calculateMovementRange(enemy, {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: turnState.units,
      });

      for (const tile of range.values()) {
        // Tầm đánh 1 ô xung quanh vị trí di chuyển
        const neighbors = [
          { x: tile.position.x, y: tile.position.y },
          { x: tile.position.x + 1, y: tile.position.y },
          { x: tile.position.x - 1, y: tile.position.y },
          { x: tile.position.x, y: tile.position.y + 1 },
          { x: tile.position.x, y: tile.position.y - 1 },
        ];
        for (const n of neighbors) {
          if (n.x >= 0 && n.x < mapData.width && n.y >= 0 && n.y < mapData.height) {
            danger.add(`${n.x},${n.y}`);
          }
        }
      }
    }
    return danger;
  }, [turnState.units]);

  // Xử lý click vào một ô trên bản đồ
  const handleTileClick = (x: number, y: number) => {
    if (turnState.activePhase !== 'player_phase') {
      return;
    }

    const clickedUnit = turnState.units.find(
      (u) => !u.isDead && u.position.x === x && u.position.y === y
    );

    // Nếu đã chọn một đơn vị và click vào ô có thể đi
    if (selectedUnit && reachableKeys.has(`${x},${y}`)) {
      // Thực hiện di chuyển tạm thời
      const success = turnManager.moveSelectedUnit({ x, y });
      if (success) {
        setPendingMovePos({ x, y });
        syncState();
      }
      return;
    }

    // Nếu click vào một đơn vị quân ta chưa đi
    if (clickedUnit && clickedUnit.faction === 'player' && !clickedUnit.hasActed) {
      const range = calculateMovementRange(clickedUnit, {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: turnState.units,
      });
      turnManager.selectUnit(clickedUnit.id, range);
      setPendingMovePos(null);
      syncState();
      return;
    }

    // Click ra ngoài hoặc hủy chọn
    turnManager.cancelSelect();
    setPendingMovePos(null);
    syncState();
  };

  // Xác nhận Chờ (Wait)
  const handleConfirmWait = () => {
    turnManager.waitSelectedUnit();
    setPendingMovePos(null);
    syncState();
  };

  // Hủy bước di chuyển
  const handleCancelMove = () => {
    turnManager.cancelSelect();
    setPendingMovePos(null);
    syncState();
  };

  // Chuyển lượt thủ công
  const handleEndTurn = () => {
    const nextPhase: GamePhase =
      turnState.activePhase === 'player_phase' ? 'enemy_phase' : 'player_phase';
    turnManager.switchPhase(nextPhase);
    setPendingMovePos(null);
    syncState();
  };

  // Thông tin ô đang hover
  const hoveredTerrainId = hoveredTile ? mapData.grid[hoveredTile.y]?.[hoveredTile.x] : null;
  const hoveredTerrain = hoveredTerrainId ? defaultTerrainRegistry.get(hoveredTerrainId) : null;
  const hoveredUnit = hoveredTile
    ? turnState.units.find(
        (u) => !u.isDead && u.position.x === hoveredTile.x && u.position.y === hoveredTile.y
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
            Mốc 3: Vòng lặp tối thiểu (Movement & Grid Core)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
          <button
            onClick={handleEndTurn}
            style={{
              padding: '8px 16px',
              backgroundColor: '#424242',
              border: '1px solid #666',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {turnState.activePhase === 'player_phase' ? 'Kết thúc lượt' : 'Bỏ qua lượt địch'}
          </button>
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
            padding: '20px',
            overflow: 'auto',
          }}
        >
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
                const unit = turnState.units.find(
                  (u) => !u.isDead && u.position.x === x && u.position.y === y
                );
                const isSelected = selectedUnit && selectedUnit.position.x === x && selectedUnit.position.y === y;

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
                      border: isSelected ? '2px solid #FFEB3B' : '1px solid rgba(255,255,255,0.05)',
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

                    {/* Terrain icon */}
                    <span style={{ fontSize: '18px', opacity: 0.7, zIndex: 1 }}>{terrain.icon}</span>

                    {/* Unit display */}
                    {unit && (
                      <div
                        style={{
                          zIndex: 2,
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#fff',
                          backgroundColor:
                            unit.hasActed
                              ? '#616161'
                              : unit.faction === 'player'
                              ? '#1E88E5'
                              : '#E53935',
                          border: isSelected ? '2px solid #fff' : '2px solid rgba(0,0,0,0.4)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                        }}
                      >
                        <div>{unit.name.substring(0, 3)}</div>
                        <div style={{ fontSize: '9px', opacity: 0.8 }}>M:{unit.mov}</div>
                      </div>
                    )}

                    {/* Coordinate indicator */}
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
        </div>

        {/* Side Panel: Tile & Unit Inspector + Action Menu */}
        <div
          style={{
            width: '280px',
            backgroundColor: '#212121',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            border: '1px solid #333',
          }}
        >
          {/* Action Menu when unit moved */}
          {pendingMovePos && (
            <div
              style={{
                backgroundColor: '#2c3e50',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #3498db',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#64B5F6' }}>
                Hành động ({selectedUnit?.name})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

          {/* Unit Inspector */}
          <div
            style={{
              backgroundColor: '#2a2a2a',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #444',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#FFD54F' }}>
              👤 Thông tin đơn vị
            </h3>
            {hoveredUnit || selectedUnit ? (
              (() => {
                const u = (hoveredUnit || selectedUnit)!;
                return (
                  <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    <div><strong>Tên:</strong> {u.name}</div>
                    <div>
                      <strong>Phe:</strong>{' '}
                      <span style={{ color: u.faction === 'player' ? '#64B5F6' : '#EF5350' }}>
                        {u.faction === 'player' ? 'Quân ta' : 'Quân địch'}
                      </span>
                    </div>
                    <div><strong>Di chuyển (Mov):</strong> {u.mov} ô</div>
                    <div><strong>Loại di chuyển:</strong> {u.moveType}</div>
                    <div><strong>Vị trí:</strong> ({u.position.x}, {u.position.y})</div>
                    <div>
                      <strong>Trạng thái:</strong>{' '}
                      {u.hasActed ? (
                        <span style={{ color: '#888' }}>Đã hành động</span>
                      ) : (
                        <span style={{ color: '#81C784' }}>Sẵn sàng</span>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div style={{ fontSize: '13px', color: '#888' }}>
                Di chuột hoặc click vào đơn vị để xem chi tiết
              </div>
            )}
          </div>

          {/* Terrain Inspector */}
          <div
            style={{
              backgroundColor: '#2a2a2a',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #444',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#81C784' }}>
              🗺️ Thông tin địa hình
            </h3>
            {hoveredTerrain && hoveredTile ? (
              <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <div><strong>Loại ô:</strong> {hoveredTerrain.nameVi} ({hoveredTerrain.name})</div>
                <div><strong>Tọa độ:</strong> ({hoveredTile.x}, {hoveredTile.y})</div>
                <div><strong>Né tránh (Avoid):</strong> +{hoveredTerrain.avoidBonus}%</div>
                <div><strong>Phòng thủ (Def):</strong> +{hoveredTerrain.defenseBonus}</div>
                {hoveredTerrain.healPercent > 0 && (
                  <div style={{ color: '#81C784' }}>
                    <strong>Hồi phục máu:</strong> +{hoveredTerrain.healPercent}%/lượt
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#888' }}>
                Di chuột lên ô bản đồ để xem địa hình
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(33, 150, 243, 0.7)' }} />
              <span>Vùng di chuyển (Reachable)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(239, 83, 80, 0.5)' }} />
              <span>Vùng nguy hiểm (Danger zone)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
