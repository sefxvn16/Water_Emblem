import { Howl, Howler } from 'howler';
import type { MoveType } from '../core/grid/types';

export type BgmTrackId =
  | 'preparation'
  | 'player_phase'
  | 'enemy_phase'
  | 'battle'
  | 'boss'
  | 'victory'
  | 'gameover';

export type SfxTrackId =
  | 'cursor'
  | 'select'
  | 'accept'
  | 'cancel'
  | 'invalid'
  | 'sword'
  | 'lance'
  | 'axe'
  | 'bow'
  | 'crit'
  | 'miss'
  | 'damage'
  | 'nodamage'
  | 'death'
  | 'heal'
  | 'levelup'
  | 'step_foot'
  | 'step_armor'
  | 'step_horse'
  | 'step_pegasus'
  | 'player_phase'
  | 'enemy_phase'
  | 'stage_clear'
  | 'item_get';

const BGM_SOURCES: Record<BgmTrackId, string> = {
  preparation: '/audio/bgm/bgm_preparation',
  player_phase: '/audio/bgm/bgm_player_phase',
  enemy_phase: '/audio/bgm/bgm_enemy_phase',
  battle: '/audio/bgm/bgm_battle',
  boss: '/audio/bgm/bgm_boss',
  victory: '/audio/bgm/bgm_victory',
  gameover: '/audio/bgm/bgm_gameover',
};

const SFX_SOURCES: Record<SfxTrackId, string> = {
  cursor: '/audio/sfx/sfx_cursor',
  select: '/audio/sfx/sfx_select',
  accept: '/audio/sfx/sfx_accept',
  cancel: '/audio/sfx/sfx_cancel',
  invalid: '/audio/sfx/sfx_invalid',
  sword: '/audio/sfx/sfx_sword',
  lance: '/audio/sfx/sfx_lance',
  axe: '/audio/sfx/sfx_axe',
  bow: '/audio/sfx/sfx_bow',
  crit: '/audio/sfx/sfx_crit',
  miss: '/audio/sfx/sfx_miss',
  damage: '/audio/sfx/sfx_damage',
  nodamage: '/audio/sfx/sfx_nodamage',
  death: '/audio/sfx/sfx_death',
  heal: '/audio/sfx/sfx_heal',
  levelup: '/audio/sfx/sfx_levelup',
  step_foot: '/audio/sfx/sfx_step_foot',
  step_armor: '/audio/sfx/sfx_step_armor',
  step_horse: '/audio/sfx/sfx_step_horse',
  step_pegasus: '/audio/sfx/sfx_step_pegasus',
  player_phase: '/audio/sfx/sfx_player_phase',
  enemy_phase: '/audio/sfx/sfx_enemy_phase',
  stage_clear: '/audio/sfx/sfx_stage_clear',
  item_get: '/audio/sfx/sfx_item_get',
};

class SoundManager {
  private bgmCache: Map<BgmTrackId, Howl> = new Map();
  private sfxCache: Map<SfxTrackId, Howl> = new Map();
  private currentBgmId: BgmTrackId | null = null;
  private currentBgmHowl: Howl | null = null;

  private _bgmVolume = 0.35;
  private _sfxVolume = 0.6;
  private _isMuted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('we_sound_muted');
      if (savedMute !== null) this._isMuted = savedMute === 'true';

      const savedBgm = localStorage.getItem('we_sound_bgm_vol');
      if (savedBgm !== null) this._bgmVolume = Math.max(0, Math.min(1, parseFloat(savedBgm)));

      const savedSfx = localStorage.getItem('we_sound_sfx_vol');
      if (savedSfx !== null) this._sfxVolume = Math.max(0, Math.min(1, parseFloat(savedSfx)));

      Howler.mute(this._isMuted);
    }
  }

  get bgmVolume(): number {
    return this._bgmVolume;
  }

  set bgmVolume(val: number) {
    this._bgmVolume = Math.max(0, Math.min(1, val));
    if (this.currentBgmHowl) {
      this.currentBgmHowl.volume(this._bgmVolume);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('we_sound_bgm_vol', this._bgmVolume.toString());
    }
  }

  get sfxVolume(): number {
    return this._sfxVolume;
  }

  set sfxVolume(val: number) {
    this._sfxVolume = Math.max(0, Math.min(1, val));
    if (typeof window !== 'undefined') {
      localStorage.setItem('we_sound_sfx_vol', this._sfxVolume.toString());
    }
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  set isMuted(val: boolean) {
    this._isMuted = val;
    Howler.mute(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('we_sound_muted', val.toString());
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playBgm(trackId: BgmTrackId, loop = true): void {
    if (typeof window === 'undefined') return;
    if (this.currentBgmId === trackId && this.currentBgmHowl && this.currentBgmHowl.playing()) {
      return;
    }

    if (this.currentBgmHowl) {
      const oldHowl = this.currentBgmHowl;
      oldHowl.fade(oldHowl.volume(), 0, 400);
      setTimeout(() => oldHowl.stop(), 400);
    }

    let howl = this.bgmCache.get(trackId);
    if (!howl) {
      const srcBase = BGM_SOURCES[trackId];
      howl = new Howl({
        src: [`${srcBase}.ogg`, `${srcBase}.mp3`],
        loop,
        volume: this._bgmVolume,
        html5: true, // Use streaming for larger BGM tracks
      });
      this.bgmCache.set(trackId, howl);
    }

    this.currentBgmId = trackId;
    this.currentBgmHowl = howl;
    howl.volume(0);
    howl.play();
    howl.fade(0, this._bgmVolume, 500);
  }

  stopBgm(fadeDuration = 400): void {
    if (!this.currentBgmHowl) return;
    const howl = this.currentBgmHowl;
    howl.fade(howl.volume(), 0, fadeDuration);
    setTimeout(() => {
      howl.stop();
      if (this.currentBgmHowl === howl) {
        this.currentBgmHowl = null;
        this.currentBgmId = null;
      }
    }, fadeDuration);
  }

  playSfx(trackId: SfxTrackId): void {
    if (typeof window === 'undefined') return;
    let howl = this.sfxCache.get(trackId);
    if (!howl) {
      const srcBase = SFX_SOURCES[trackId];
      howl = new Howl({
        src: [`${srcBase}.ogg`, `${srcBase}.mp3`],
        volume: this._sfxVolume,
      });
      this.sfxCache.set(trackId, howl);
    }
    howl.volume(this._sfxVolume);
    howl.play();
  }

  playWeaponHit(weaponType: string): void {
    const type = weaponType.toLowerCase();
    if (type.includes('lance')) {
      this.playSfx('lance');
    } else if (type.includes('axe')) {
      this.playSfx('axe');
    } else if (type.includes('bow')) {
      this.playSfx('bow');
    } else {
      this.playSfx('sword');
    }
  }

  playMoveStep(moveType: MoveType): void {
    if (moveType === 'cavalry') {
      this.playSfx('step_horse');
    } else if (moveType === 'flier') {
      this.playSfx('step_pegasus');
    } else if (moveType === 'armor') {
      this.playSfx('step_armor');
    } else {
      this.playSfx('step_foot');
    }
  }
}

export const soundManager = new SoundManager();
