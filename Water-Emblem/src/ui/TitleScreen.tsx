import React from 'react';
import { soundManager } from '../audio/soundManager';
import { DIFFICULTIES, type Difficulty } from '../core/chapter/difficulty';

interface TitleScreenProps {
  onStartNewGame: () => void;
  onOpenSaveSlots: () => void;
  onOpenWorldMap: () => void;
  onContinueGame: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  /** Difficulty for a new game (PLAN item 115). */
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  /** Start a random-map skirmish (PLAN item 119). */
  onStartSkirmish: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartNewGame,
  onOpenSaveSlots,
  onOpenWorldMap,
  onContinueGame,
  isMuted,
  onToggleMute,
  difficulty,
  onDifficultyChange,
  onStartSkirmish,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#050c18',
        backgroundImage: 'radial-gradient(circle at 50% 35%, #0f2744 0%, #050c18 75%)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '36px 20px',
        boxSizing: 'border-box',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Top Bar / Status */}
      <div style={{ width: '100%', maxWidth: '960px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#64748b', letterSpacing: '1px' }}>
          VER 5.0 • ARCHANEA CHRONICLES
        </span>
        <button
          onClick={() => {
            onToggleMute();
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '20px',
            color: '#e2e8f0',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{isMuted ? '🔇' : '🔊'}</span>
          <span>{isMuted ? 'Audio: Muted' : 'Audio: On'}</span>
        </button>
      </div>

      {/* Center Emblem & Title Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
        {/* Emblem Shield Illustration */}
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: 'rgba(30, 58, 95, 0.4)',
            border: '3px solid #facc15',
            boxShadow: '0 0 45px rgba(250, 204, 21, 0.35), inset 0 0 25px rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '64px',
            marginBottom: '6px',
          }}
        >
          🛡️
        </div>

        <div>
          <h1
            style={{
              margin: '0 0 8px 0',
              fontSize: 'min(44px, 8.5vw)',
              fontWeight: 900,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              background: 'linear-gradient(180deg, #ffffff 20%, #93c5fd 60%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.8))',
            }}
          >
            WATER EMBLEM
          </h1>
          <div
            style={{
              fontSize: 'min(20px, 4.5vw)',
              color: '#facc15',
              fontWeight: 600,
              letterSpacing: '2px',
              textShadow: '0 2px 10px rgba(250, 204, 21, 0.4)',
            }}
          >
            Mystery of Nothing
          </div>
          <div style={{ marginTop: '8px', fontSize: '13.5px', color: '#94a3b8', fontStyle: 'italic' }}>
            Tactical RPG Engine • Tribute to Fire Emblem: Mystery of the Emblem
          </div>
        </div>
      </div>

      {/* Main Menu Action Buttons */}
      <div
        style={{
          width: 'min(420px, 92vw)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Difficulty picker (PLAN item 115) */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', letterSpacing: '1px' }}>DIFFICULTY</span>
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={difficulty === level}
              onClick={() => { soundManager.playSfx('cursor'); onDifficultyChange(level); }}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                border: `1px solid ${difficulty === level ? '#facc15' : 'rgba(255,255,255,0.2)'}`,
                backgroundColor: difficulty === level ? 'rgba(250,204,21,0.18)' : 'rgba(255,255,255,0.05)',
                color: difficulty === level ? '#facc15' : '#cbd5e1',
                fontSize: '13px',
                fontWeight: difficulty === level ? 'bold' : 'normal',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {level}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            soundManager.playSfx('accept');
            onStartSkirmish();
          }}
          style={{
            padding: '10px 24px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '10px',
            color: '#e2e8f0',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          🎲 Random Skirmish
        </button>
        <button
          onClick={() => {
            soundManager.playSfx('accept');
            onStartNewGame();
          }}
          style={{
            padding: '14px 24px',
            backgroundColor: '#2563eb',
            border: '1px solid #60a5fa',
            borderRadius: '10px',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '15.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 4px 16px rgba(37,99,235,0.45)',
            minHeight: '48px',
          }}
        >
          <span>⚔️</span>
          <span>START NEW GAME</span>
        </button>

        <button
          onClick={() => {
            soundManager.playSfx('select');
            onOpenSaveSlots();
          }}
          style={{
            padding: '13px 24px',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '10px',
            color: '#f8fafc',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            minHeight: '46px',
          }}
        >
          <span>📂</span>
          <span>FILE SELECT (LOAD GAME)</span>
        </button>

        <button
          onClick={() => {
            soundManager.playSfx('select');
            onOpenWorldMap();
          }}
          style={{
            padding: '13px 24px',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '10px',
            color: '#f8fafc',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            minHeight: '46px',
          }}
        >
          <span>🗺️</span>
          <span>CONTINENT OF ARCHANEA (WORLD MAP)</span>
        </button>

        <button
          onClick={() => {
            soundManager.playSfx('accept');
            onContinueGame();
          }}
          style={{
            padding: '12px 24px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '10px',
            color: '#94a3b8',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minHeight: '44px',
          }}
        >
          <span>🎮</span>
          <span>RESUME BATTLE</span>
        </button>
      </div>

      {/* Footer Info */}
      <footer style={{ textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
        <span>Engineered with TypeScript Strict, Three.js 3D & React.</span>
      </footer>
    </div>
  );
};
