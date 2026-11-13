import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
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

type CharacterModel = 'knight' | 'ranger' | 'mage' | 'barbarian';
type ModelAssets = {
  characters: Record<CharacterModel, THREE.Group>;
  pine: THREE.Group;
  rock: THREE.Group;
};

function setFlatShading(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if ('flatShading' in material) material.flatShading = true;
      material.needsUpdate = true;
    }
  });
}

function fitModel(model: THREE.Group, maxHeight: number, maxWidth: number): THREE.Group {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = Math.min(maxHeight / Math.max(size.y, 0.001), maxWidth / Math.max(size.x, size.z, 0.001));
  const fitted = new THREE.Group();
  model.scale.setScalar(scale);
  model.position.set(-(box.min.x + size.x / 2) * scale, -box.min.y * scale, -(box.min.z + size.z / 2) * scale);
  fitted.add(model);
  return fitted;
}

function disposeModel(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

async function loadNature(name: 'PineTree_1' | 'Rock_1', height: number, width: number): Promise<THREE.Group> {
  const path = '/models/nature/';
  const materials = await new MTLLoader().setPath(path).loadAsync(`${name}.mtl`);
  materials.preload();
  const model = await new OBJLoader().setMaterials(materials).setPath(path).loadAsync(`${name}.obj`);
  setFlatShading(model);
  return fitModel(model, height, width);
}

async function loadModelAssets(): Promise<ModelAssets> {
  const loader = new GLTFLoader();
  const names: CharacterModel[] = ['knight', 'ranger', 'mage', 'barbarian'];
  const [characters, pine, rock] = await Promise.all([
    Promise.all(names.map(async (name) => {
      const gltf = await loader.loadAsync(`/models/characters/${name}.glb`);
      setFlatShading(gltf.scene);
      return fitModel(gltf.scene, 0.9, 0.62);
    })),
    loadNature('PineTree_1', 1.25, 0.8),
    loadNature('Rock_1', 0.65, 0.75),
  ]);
  return { characters: Object.fromEntries(names.map((name, index) => [name, characters[index]])) as Record<CharacterModel, THREE.Group>, pine, rock };
}

function characterModelFor(unit: ExtendedUnitState): CharacterModel {
  if (unit.weapon.type === 'bow') return 'ranger';
  if (unit.weapon.type === 'tome' || unit.weapon.type === 'staff' || unit.unit.moveType === 'mage') return 'mage';
  if (unit.weapon.type === 'axe' || unit.unit.moveType === 'bandit') return 'barbarian';
  return 'knight';
}

function overviewDistance(camera: THREE.PerspectiveCamera, mapData: MapData, focus: THREE.Vector3, direction: THREE.Vector3): number {
  camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.91;
  const tanH = tanV * camera.aspect;
  let highest = 0;
  for (let y = 0; y < mapData.height; y++) {
    for (let x = 0; x < mapData.width; x++) {
      const terrain = mapData.grid[y]?.[x] ?? 'plains';
      const elevation = mapData.elevations?.[y]?.[x] ?? 0;
      const tileTop = Math.max(0.2, (TERRAIN_3D_COLORS[terrain]?.heightScale ?? 0.3) + elevation * 0.6) - 0.5;
      highest = Math.max(highest, tileTop + (terrain === 'forest' ? 1.25 : terrain === 'mountain' || terrain === 'peak' ? 0.65 : 0.9));
    }
  }
  let required = 0;
  for (const x of [-0.5, mapData.width - 0.5]) {
    for (const y of [-0.5, highest]) {
      for (const z of [-0.5, mapData.height - 0.5]) {
        const corner = new THREE.Vector3(x, y, z).sub(focus);
        required = Math.max(required,
          corner.dot(direction) + Math.abs(corner.dot(right)) / tanH,
          corner.dot(direction) + Math.abs(corner.dot(up)) / tanV,
        );
      }
    }
  }
  return Math.max(required, 3);
}

function MiniMap({ mapData, units, focus, selected }: {
  mapData: MapData;
  units: ExtendedUnitState[];
  focus: Position;
  selected: Position | null;
}) {
  const cells: React.ReactNode[] = [];
  for (let row = -5; row <= 5; row++) {
    for (let column = -5; column <= 5; column++) {
      const x = focus.x + column;
      const y = focus.y + row;
      const terrain = mapData.grid[y]?.[x];
      const color = terrain ? `#${(TERRAIN_3D_COLORS[terrain]?.color ?? 0x4caf50).toString(16).padStart(6, '0')}` : '#182023';
      cells.push(<rect key={`${x},${y}`} x={(column + 5) * 10} y={(row + 5) * 10} width="10" height="10" fill={color} stroke="#1b2522" strokeWidth="0.5" />);
    }
  }
  return (
    <div style={{ width: 148, height: 148, borderRadius: '50%', overflow: 'hidden', border: '1px solid #b8c8bf', background: '#182023', boxShadow: '0 3px 12px rgba(0,0,0,0.32)' }}>
      <svg role="img" aria-label={`Bản đồ nhỏ quanh ô ${focus.x + 1}, ${focus.y + 1}`} viewBox="0 0 110 110" width="148" height="148">
        {cells}
        {units.filter((entry) => !entry.unit.isDead).map(({ unit }) => {
          const x = (unit.position.x - focus.x + 5.5) * 10;
          const y = (unit.position.y - focus.y + 5.5) * 10;
          if (x < 0 || x > 110 || y < 0 || y > 110) return null;
          return <circle key={unit.id} cx={x} cy={y} r="2.8" fill={unit.faction === 'player' ? '#b9dcff' : unit.faction === 'enemy' ? '#ffb8ae' : '#fff1a8'} stroke="#182023" strokeWidth="0.8" />;
        })}
        {selected && <rect x="50.5" y="50.5" width="9" height="9" fill="none" stroke="#fff" strokeWidth="2" />}
      </svg>
    </div>
  );
}

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
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraStateRef = useRef<{ mapId: string; position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const tileMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const unitsGroupRef = useRef<THREE.Group | null>(null);
  const overlaysGroupRef = useRef<THREE.Group | null>(null);
  const unitMarkerRef = useRef<{
    geometry: THREE.RingGeometry;
    materials: Record<'player' | 'enemy' | 'ally' | 'acted', THREE.MeshBasicMaterial>;
  } | null>(null);
  const [models, setModels] = useState<ModelAssets | null>(null);
  const desiredDistanceRef = useRef(0);
  const desiredFocusRef = useRef<THREE.Vector3 | null>(null);
  const zoomByRef = useRef<(factor: number) => void>(() => {});
  const onTileClickRef = useRef(onTileClick);
  const onTileHoverRef = useRef(onTileHover);
  onTileClickRef.current = onTileClick;
  onTileHoverRef.current = onTileHover;

  useEffect(() => {
    let cancelled = false;
    let loaded: ModelAssets | null = null;
    loadModelAssets().then((assets) => {
      loaded = assets;
      if (cancelled) {
        Object.values(assets.characters).forEach(disposeModel);
        disposeModel(assets.pine);
        disposeModel(assets.rock);
      } else {
        setModels(assets);
      }
    }).catch((error: unknown) => console.error('Failed to load 3D models', error));
    return () => {
      cancelled = true;
      // Templates are shared by every visible instance; dispose on component unmount.
      if (loaded) {
        Object.values(loaded.characters).forEach(disposeModel);
        disposeModel(loaded.pine);
        disposeModel(loaded.rock);
      }
    };
  }, []);

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
    const firstPlayer = units.find((entry) => entry.unit.faction === 'player' && !entry.unit.isDead)?.unit.position;
    const initialTarget = new THREE.Vector3(firstPlayer?.x ?? centerX, 0, firstPlayer?.y ?? centerZ);
    const distance = Math.max(9, Math.min(mapData.width, mapData.height) * 1.1);

    camera.position.copy(initialTarget).add(new THREE.Vector3(distance * 0.7, distance * 0.85, distance * 0.7));
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    renderer.domElement.title = 'Kéo chuột trái để di chuyển bản đồ; kéo chuột phải để xoay; lăn chuột để zoom';

    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = true;
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    controls.minPolarAngle = 0.18;
    controls.maxPolarAngle = 1.45;
    controls.touches.ONE = THREE.TOUCH.PAN;
    controls.touches.TWO = THREE.TOUCH.ROTATE;
    controls.target.copy(initialTarget);
    const savedCamera = cameraStateRef.current;
    if (savedCamera?.mapId === mapData.id) {
      camera.position.copy(savedCamera.position);
      controls.target.copy(savedCamera.target);
    }
    controls.update();
    controlsRef.current = controls;
    desiredDistanceRef.current = camera.position.distanceTo(controls.target);
    desiredFocusRef.current = null;
    const updateCameraData = () => {
      renderer.domElement.dataset.cameraPosition = camera.position.toArray().join(',');
      renderer.domElement.dataset.cameraTarget = controls.target.toArray().join(',');
    };
    controls.addEventListener('change', updateCameraData);
    updateCameraData();

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

    const markerGeometry = new THREE.RingGeometry(0.31, 0.42, 20);
    const markerMaterials = {
      player: new THREE.MeshBasicMaterial({ color: 0x2196f3, side: THREE.DoubleSide }),
      enemy: new THREE.MeshBasicMaterial({ color: 0xe53935, side: THREE.DoubleSide }),
      ally: new THREE.MeshBasicMaterial({ color: 0x4caf50, side: THREE.DoubleSide }),
      acted: new THREE.MeshBasicMaterial({ color: 0x757575, side: THREE.DoubleSide }),
    };
    unitMarkerRef.current = { geometry: markerGeometry, materials: markerMaterials };

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

    const natureGroup = new THREE.Group();
    scene.add(natureGroup);
    if (models) {
      for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
          const terrain = mapData.grid[y]?.[x];
          const template = terrain === 'forest' ? models.pine : terrain === 'mountain' || terrain === 'peak' ? models.rock : null;
          if (!template) continue;
          const tile = tileMeshesRef.current.get(`${x},${y}`);
          const model = template.clone(true);
          model.position.set(x, ((tile?.userData.totalHeight as number) ?? 0.5) - 0.5, y);
          natureGroup.add(model);
        }
      }
    }

    // Raycasting click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let pointerStart: { id: number; x: number; y: number; dragged: boolean } | null = null;
    const tileAt = (event: PointerEvent): { x: number; y: number } | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(tileMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes, false);
      return intersects[0]?.object.userData as { x: number; y: number } | undefined ?? null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button === 0 && event.isPrimary) {
        pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
      } else {
        pointerStart = null;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!pointerStart || event.pointerId !== pointerStart.id) return;
      const dragged = pointerStart.dragged || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5;
      pointerStart = null;
      if (dragged) return;
      const tile = tileAt(event);
      if (tile) onTileClickRef.current(tile.x, tile.y);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (pointerStart) {
        if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) pointerStart.dragged = true;
        return;
      }
      const tile = tileAt(event);
      if (tile) onTileHoverRef.current(tile.x, tile.y);
    };
    const handlePointerCancel = () => { pointerStart = null; };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointerup', handlePointerUp);
    domElement.addEventListener('pointercancel', handlePointerCancel);
    domElement.addEventListener('pointermove', handlePointerMove);
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (Math.abs(event.deltaY) < 0.1) return;
      zoomByRef.current(Math.exp(event.deltaY * 0.0012));
    };
    domElement.addEventListener('wheel', handleWheel, { passive: false });

    // Animation loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (desiredFocusRef.current) {
        const shift = desiredFocusRef.current.clone().sub(controls.target).multiplyScalar(0.18);
        controls.target.add(shift);
        camera.position.add(shift);
        if (shift.lengthSq() < 0.0001) desiredFocusRef.current = null;
      }
      const currentDistance = camera.position.distanceTo(controls.target);
      if (Math.abs(currentDistance - desiredDistanceRef.current) > 0.005) {
        camera.position.addScaledVector(camera.position.clone().sub(controls.target).normalize(), (desiredDistanceRef.current - currentDistance) * 0.18);
      }
      controls.update();
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
      cameraStateRef.current = { mapId: mapData.id, position: camera.position.clone(), target: controls.target.clone() };
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointerup', handlePointerUp);
      domElement.removeEventListener('pointercancel', handlePointerCancel);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('wheel', handleWheel);
      controls.removeEventListener('change', updateCameraData);
      controls.dispose();
      controlsRef.current = null;
      window.removeEventListener('resize', handleResize);
      clearAndDisposeGroup(tilesGroup);
      natureGroup.clear();
      unitsGroup.clear();
      unitMarkerRef.current = null;
      markerGeometry.dispose();
      Object.values(markerMaterials).forEach((material) => material.dispose());
      tileMeshesRef.current.clear();
      renderer.dispose();
      if (domElement.parentNode) {
        domElement.parentNode.removeChild(domElement);
      }
    };
  }, [mapData, models]);

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

  // Cập nhật quân bằng các model KayKit; geometry và material được dùng chung.
  useEffect(() => {
    const unitsGroup = unitsGroupRef.current;
    const marker = unitMarkerRef.current;
    if (!unitsGroup || !marker) return;

    unitsGroup.clear();

    const aliveUnits = units.filter((u) => !u.unit.isDead);

    for (const ext of aliveUnits) {
      const { unit } = ext;
      const key = `${unit.position.x},${unit.position.y}`;
      const tileMesh = tileMeshesRef.current.get(key);
      const groundH = (tileMesh?.userData.totalHeight as number) ?? 0.5;

      const unitGroup = new THREE.Group();
      unitGroup.position.set(unit.position.x, groundH - 0.5, unit.position.y);

      if (models) unitGroup.add(cloneSkinned(models.characters[characterModelFor(ext)]));

      const ring = new THREE.Mesh(marker.geometry, marker.materials[unit.hasActed ? 'acted' : unit.faction]);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.015;
      unitGroup.add(ring);

      unitsGroup.add(unitGroup);
    }
    return () => { unitsGroup.clear(); };
  }, [units, models, mapData]);

  const zoomBy = (factor: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const direction = camera.position.clone().sub(controls.target).normalize();
    const mapCenter = new THREE.Vector3((mapData.width - 1) / 2, 0, (mapData.height - 1) / 2);
    const farthest = overviewDistance(camera, mapData, mapCenter, direction);
    const next = THREE.MathUtils.clamp(desiredDistanceRef.current * factor, 3.5, farthest);
    desiredDistanceRef.current = next;
    desiredFocusRef.current = next >= farthest - 0.01 ? mapCenter : null;
  };
  zoomByRef.current = zoomBy;
  const minimapFocus = selectedPos ?? units.find((entry) => entry.unit.faction === 'player' && !entry.unit.isDead)?.unit.position
    ?? { x: Math.floor(mapData.width / 2), y: Math.floor(mapData.height / 2) };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mountRef} data-models-ready={models ? 'true' : 'false'} style={{ width: '100%', height: '100%' }} />

      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '7px',
          zIndex: 10,
        }}
      >
        <MiniMap mapData={mapData} units={units} focus={minimapFocus} selected={selectedPos} />
        <div style={{ display: 'flex', gap: '8px' }}>
          {([
            { label: '−', title: 'Thu nhỏ', factor: 1.22 },
            { label: '+', title: 'Phóng to', factor: 1 / 1.22 },
          ]).map(({ label, title, factor }) => (
            <button
              key={title}
              type="button"
              aria-label={title}
              title={title}
              onClick={() => zoomBy(factor)}
              style={{
                width: '34px', height: '34px', borderRadius: '50%',
                border: '1px solid #9fb1a8', background: 'rgba(24,32,35,0.9)', color: '#f4f7f4',
                fontSize: '21px', lineHeight: 1, cursor: 'pointer',
              }}
            >{label}</button>
          ))}
        </div>
        <div style={{ color: '#f4f7f4', background: 'rgba(24,32,35,0.88)', borderRadius: '5px', padding: '4px 7px', fontSize: '11px', lineHeight: 1.35, textAlign: 'center' }}>
          Kéo để di chuyển<br />Chuột phải để xoay
        </div>
      </div>
    </div>
  );
};
