import { ExtendedUnitState } from '../../App';
import { TurnState } from '../turn/turnManager';

export interface SaveGameData {
  version: string;
  timestamp: number;
  chapterId: string;
  turnState: TurnState;
  extendedUnits: ExtendedUnitState[];
}

const STORAGE_KEY = 'water_emblem_saved_game_v1';
const CURRENT_VERSION = '1.0.0';

export function saveGameState(data: Omit<SaveGameData, 'version' | 'timestamp'>): boolean {
  try {
    const payload: SaveGameData = {
      ...data,
      version: CURRENT_VERSION,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('Không thể lưu game:', err);
    return false;
  }
}

export function loadGameState(): SaveGameData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as SaveGameData;
    if (data.version !== CURRENT_VERSION) {
      console.warn('Phiên bản file lưu không khớp, từ chối nạp để tránh hỏng dữ liệu.');
      return null;
    }
    return data;
  } catch (err) {
    console.error('Lỗi khi nạp file lưu:', err);
    return null;
  }
}

export function hasSavedGame(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
