import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MapData, Position } from '../core/grid/types';
import { ExtendedUnitState } from '../core/data/chapterData';

interface ThreeSceneProps {
  mapData: MapData;
  units: ExtendedUnitState[];
  reachableKeys: Set<string>;
  dangerZoneKeys: Set<string>;
  selectedPos: Position | null;
  attackTargetKeys: Set<string>;
  onTileClick: (x: number, y: number) => void;
  onTileHover: (x: number, y: number) => void;
}

const TERRAIN_3D_COLORS: Record<string, { color: number; heightScale: number }> = {
  plains: { color: 0x4caf50, heightScale: 0.3 },
  forest: { color: 0x2e7d32, heightScale: 0.6 },
  mountain: { color: 0x8d6e63, heightScale: 1.2 },
  peak: { color: 0x5d4037, heightScale: 1.8 },
  fort: { color: 0x78909c, heightScale: 0.8 },
  bridge: { color: 0xa1887f, heightScale: 0.35 },
  river: { color: 0x1976d2, heightScale: 0.1 },
  sea: { color: 0x0d47a1, heightScale: 0.05 },
  gate: { color: 0xc62828, heightScale: 0.9 },
  wall: { color: 0x424242, heightScale: 1.5 },
};

function clearAndDisposeGroup(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
      }
    }
  });
  group.clear();
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({
  mapData,
  units,
  reachableKeys,
  dangerZoneKeys,
  selectedPos,
  attackTargetKeys,
  onTileClick,
  onTileHover,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const tileMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const unitsGroupRef = useRef<THREE.Group | null>(null);
  const overlaysGroupRef = useRef<THREE.Group | null>(null);
  const cameraAngleRef = useRef<number>(0); // 0, 90, 180, 270 degrees
  const onTileClickRef = useRef(onTileClick);
  const onTileHoverRef = useRef(onTileHover);
  onTileClickRef.current = onTileClick;
  onTileHoverRef.current = onTileHover;

  // Khởi tạo Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera (Isometric 3/4 perspective)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    const centerX = (mapData.width - 1) / 2;
    const centerZ = (mapData.height - 1) / 2;

    camera.position.set(centerX + 12, 14, centerZ + 14);
    camera.lookAt(centerX, 0, centerZ);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Ánh sáng
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    dirLight.position.set(centerX + 15, 25, centerZ + 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Grid group chứa các ô bản đồ
    const tilesGroup = new THREE.Group();
    scene.add(tilesGroup);

    const overlaysGroup = new THREE.Group();
    scene.add(overlaysGroup);
    overlaysGroupRef.current = overlaysGroup;

    const unitsGroup = new THREE.Group();
    scene.add(unitsGroup);
    unitsGroupRef.current = unitsGroup;

    // Tạo các ô địa hình 3D (Voxel-like tiles)
    tileMeshesRef.current.clear();
    const boxGeo = new THREE.BoxGeometry(0.96, 1, 0.96);

    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const terrainId = mapData.grid[y]?.[x] ?? 'plains';
        const elevation = mapData.elevations?.[y]?.[x] ?? 0;
        const config = TERRAIN_3D_COLORS[terrainId] || { color: 0x4caf50, heightScale: 0.3 };

        const totalHeight = Math.max(0.2, config.heightScale + elevation * 0.6);
        const mat = new THREE.MeshLambertMaterial({
          color: config.color,
          flatShading: true,
        });

        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.scale.set(1, totalHeight, 1);
        mesh.position.set(x, totalHeight / 2 - 0.5, y);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData = { x, y, terrainId, totalHeight };
        tilesGroup.add(mesh);
        tileMeshesRef.current.set(`${x},${y}`, mesh);
      }
    }

    // Raycasting click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(tileMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit?.object.userData) {
          const { x, y } = hit.object.userData as { x: number; y: number };
          onTileClickRef.current(x, y);
        }
      }
    };

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(tileMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit?.object.userData) {
          const { x, y } = hit.object.userData as { x: number; y: number };
          onTileHoverRef.current(x, y);
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointermove', handlePointerMove);

    // Animation loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      clearAndDisposeGroup(tilesGroup);
      tileMeshesRef.current.clear();
      renderer.dispose();
      if (domElement.parentNode) {
        domElement.parentNode.removeChild(domElement);
      }
    };
  }, [mapData]);

  // Cập nhật Overlays (Vùng di chuyển xanh, Vùng nguy hiểm đỏ, Ô đang chọn)
  useEffect(() => {
    const overlaysGroup = overlaysGroupRef.current;
    if (!overlaysGroup) return;

    // Dọn overlays cũ
    clearAndDisposeGroup(overlaysGroup);

    const planeGeo = new THREE.PlaneGeometry(0.9, 0.9);
    planeGeo.rotateX(-Math.PI / 2);

    const blueMat = new THREE.MeshBasicMaterial({
      color: 0x2196f3,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    const redMat = new THREE.MeshBasicMaterial({
      color: 0xf44336,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });

    const targetRedMat = new THREE.MeshBasicMaterial({
      color: 0xff1744,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    const yellowMat = new THREE.MeshBasicMaterial({
      color: 0xffeb3b,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    // Vẽ danger zone
    for (const key of dangerZoneKeys) {
      if (reachableKeys.has(key)) continue;
      const [xStr, yStr] = key.split(',');
      const x = Number(xStr);
      const y = Number(yStr);
      const tileMesh = tileMeshesRef.current.get(key);
      const h = (tileMesh?.userData.totalHeight as number) ?? 0.5;

      const p = new THREE.Mesh(planeGeo, redMat);
      p.position.set(x, h - 0.48, y);
      overlaysGroup.add(p);
    }

    // Vẽ reachable tiles
    for (const key of reachableKeys) {
      const [xStr, yStr] = key.split(',');
      const x = Number(xStr);
      const y = Number(yStr);
      const tileMesh = tileMeshesRef.current.get(key);
      const h = (tileMesh?.userData.totalHeight as number) ?? 0.5;

      const p = new THREE.Mesh(planeGeo, blueMat);
      p.position.set(x, h - 0.48, y);
      overlaysGroup.add(p);
    }

    // Vẽ attack targets
    for (const key of attackTargetKeys) {
      const [xStr, yStr] = key.split(',');
      const x = Number(xStr);
      const y = Number(yStr);
      const tileMesh = tileMeshesRef.current.get(key);
      const h = (tileMesh?.userData.totalHeight as number) ?? 0.5;

      const p = new THREE.Mesh(planeGeo, targetRedMat);
      p.position.set(x, h - 0.47, y);
      overlaysGroup.add(p);
    }

    // Vẽ selected indicator
    if (selectedPos) {
      const key = `${selectedPos.x},${selectedPos.y}`;
      const tileMesh = tileMeshesRef.current.get(key);
      const h = (tileMesh?.userData.totalHeight as number) ?? 0.5;

      const p = new THREE.Mesh(planeGeo, yellowMat);
      p.position.set(selectedPos.x, h - 0.46, selectedPos.y);
      overlaysGroup.add(p);
    }
    return () => {
      clearAndDisposeGroup(overlaysGroup);
      planeGeo.dispose();
      blueMat.dispose();
      redMat.dispose();
      targetRedMat.dispose();
      yellowMat.dispose();
    };
  }, [reachableKeys, dangerZoneKeys, selectedPos, attackTargetKeys]);

  // Cập nhật Quân cờ 3D (Units 3D Model: Chibi low-poly cylinders & spheres)
  useEffect(() => {
    const unitsGroup = unitsGroupRef.current;
    if (!unitsGroup) return;

    clearAndDisposeGroup(unitsGroup);

    const aliveUnits = units.filter((u) => !u.unit.isDead);

    for (const ext of aliveUnits) {
      const { unit } = ext;
      const key = `${unit.position.x},${unit.position.y}`;
      const tileMesh = tileMeshesRef.current.get(key);
      const groundH = (tileMesh?.userData.totalHeight as number) ?? 0.5;

      const unitGroup = new THREE.Group();
      unitGroup.position.set(unit.position.x, groundH - 0.5, unit.position.y);

      const isPlayer = unit.faction === 'player';
      const bodyColor = unit.hasActed ? 0x757575 : isPlayer ? 0x1976d2 : 0xd32f2f;

      // Thân chibi (Cylinder)
      const bodyGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.55, 8);
      const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor, flatShading: true });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.32;
      body.castShadow = true;
      unitGroup.add(body);

      // Đầu chibi (Sphere)
      const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const headMat = new THREE.MeshLambertMaterial({ color: 0xffe0bd, flatShading: true });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.72;
      head.castShadow = true;
      unitGroup.add(head);

      // Mũ / Tóc nhận diện
      const hairColor = unit.id === 'marth' ? 0x0d47a1 : unit.id === 'jagen' ? 0x9e9e9e : 0x3e2723;
      const hairGeo = new THREE.ConeGeometry(0.22, 0.2, 8);
      const hairMat = new THREE.MeshLambertMaterial({ color: hairColor, flatShading: true });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = 0.88;
      unitGroup.add(hair);

      unitsGroup.add(unitGroup);
    }
    return () => clearAndDisposeGroup(unitsGroup);
  }, [units]);

  // Xoay Camera 90 độ
  const handleRotateCamera = (direction: 'left' | 'right') => {
    if (!cameraRef.current) return;
    const delta = direction === 'left' ? Math.PI / 2 : -Math.PI / 2;
    cameraAngleRef.current += delta;

    const centerX = (mapData.width - 1) / 2;
    const centerZ = (mapData.height - 1) / 2;
    const distance = 18;

    const newX = centerX + distance * Math.sin(cameraAngleRef.current);
    const newZ = centerZ + distance * Math.cos(cameraAngleRef.current);

    cameraRef.current.position.set(newX, 14, newZ);
    cameraRef.current.lookAt(centerX, 0, centerZ);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Camera Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => handleRotateCamera('left')}
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(33, 33, 33, 0.85)',
            border: '1px solid #555',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 'bold',
            backdropFilter: 'blur(4px)',
          }}
        >
          🔄 Xoay Trái
        </button>
        <button
          onClick={() => handleRotateCamera('right')}
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(33, 33, 33, 0.85)',
            border: '1px solid #555',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 'bold',
            backdropFilter: 'blur(4px)',
          }}
        >
          🔄 Xoay Phải
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          backgroundColor: 'rgba(0,0,0,0.65)',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#aaa',
          pointerEvents: 'none',
        }}
      >
        🕹️ 3D Low-Poly Viewport (Click để chọn ô / di chuyển)
      </div>
    </div>
  );
};
