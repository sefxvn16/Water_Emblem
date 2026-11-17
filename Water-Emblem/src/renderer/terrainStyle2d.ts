export interface TerrainStyle2d {
  readonly bg: string;
  readonly label: string;
  readonly icon: string;
}

export const TERRAIN_COLORS: Readonly<Record<string, TerrainStyle2d>> = {
  plains: { bg: '#4a7c59', label: 'Plains', icon: '🌿' },
  forest: { bg: '#2d5a3f', label: 'Forest', icon: '🌲' },
  mountain: { bg: '#8b7355', label: 'Mountain', icon: '⛰️' },
  peak: { bg: '#5c4d3c', label: 'Peak', icon: '🏔️' },
  fort: { bg: '#607d8b', label: 'Fort', icon: '🏰' },
  bridge: { bg: '#a08260', label: 'Bridge', icon: '🪵' },
  river: { bg: '#2b5876', label: 'River', icon: '🌊' },
  sea: { bg: '#1e3c72', label: 'Sea', icon: '🌊' },
  gate: { bg: '#c0392b', label: 'Gate', icon: '⛩️' },
  village: { bg: '#d97706', label: 'Village', icon: '🏡' },
  wall: { bg: '#474747', label: 'Stone Wall', icon: '🧱' },
  rubble: { bg: '#545454', label: 'Rubble', icon: '🧱' },
  road: { bg: '#b89f78', label: 'Road', icon: '🛤️' },
  castle: { bg: '#4a5568', label: 'Castle', icon: '🏯' },
  house: { bg: '#b45309', label: 'House', icon: '🏠' },
  shop: { bg: '#047857', label: 'Shop', icon: '🏪' },
};
