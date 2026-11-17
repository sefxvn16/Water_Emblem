import React, { useEffect, useRef, useState } from 'react';

interface BattleSettingsMenuProps {
  chapterId: string;
  chapterName: string;
  objectiveText: string;
  gold: number;
  turnNumber: number;
  activePhase: string;
  viewMode: '3d' | '2d';
  isMuted: boolean;
  combatLog: readonly string[];
  onChapterChange: (chapterId: string) => void;
  onTitle: () => void;
  onWorldMap: () => void;
  onSaveFiles: () => void;
  onSave: () => void;
  onLoad: () => void;
  onViewMode: (mode: '3d' | '2d') => void;
  onToggleMute: () => void;
}

const buttonStyle = (backgroundColor: string, border: string, color = '#fff'): React.CSSProperties => ({
  padding: '7px 13px',
  backgroundColor,
  border: `1px solid ${border}`,
  borderRadius: '6px',
  color,
  fontSize: '13px',
  fontWeight: 'bold',
  cursor: 'pointer',
  minHeight: '36px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
});

const viewButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 13px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: active ? '#1976D2' : 'transparent',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 'bold',
  cursor: 'pointer',
});

export const BattleSettingsMenu: React.FC<BattleSettingsMenuProps> = (props) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (event.target instanceof Node && rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const navigate = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  const playerPhase = props.activePhase === 'player_phase';

  return (
    <div ref={rootRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Settings"
        title="Settings"
        aria-expanded={open}
        style={{
          position: 'fixed',
          top: '12px',
          right: '28px',
          zIndex: 1000,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid #64748b',
          backgroundColor: 'rgba(15,23,42,0.9)',
          color: '#fff',
          fontSize: '20px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        <span aria-hidden="true">⚙</span>
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
            right: '28px',
            zIndex: 1000,
            width: '340px',
            maxHeight: 'calc(100vh - 76px)',
            overflowY: 'auto',
            boxSizing: 'border-box',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: '#262626',
            border: '1px solid #444',
            borderRadius: '8px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
          }}
        >
          <select
            value={props.chapterId}
            onChange={(e) => props.onChapterChange(e.target.value)}
            style={{
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #0284c7',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '36px',
            }}
          >
            <option value="chapter_01">🗺️ Chapter 1: Marth Embarks (30x13)</option>
            <option value="chapter_02">🗺️ Chapter 2: The Pirates of Galder (30x15)</option>
            <option value="chapter_03">🗺️ Chapter 3: The Devil Mountain (30x20)</option>
            <option value="test_chapter_01">🧪 Test Map (8x8)</option>
          </select>
          <span style={{ fontSize: '13px', color: '#aaa' }}>
            {props.chapterName} (Objective: {props.objectiveText})
          </span>
          <div
            style={{
              padding: '7px 13px',
              backgroundColor: '#451a03',
              border: '1px solid #d97706',
              borderRadius: '6px',
              color: '#fef08a',
              fontSize: '13px',
              fontWeight: 'bold',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            💰 {props.gold.toLocaleString()} G
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              Turn: <span style={{ color: '#FFD54F' }}>{props.turnNumber}</span>
            </div>
            <div
              style={{
                padding: '7px 15px',
                borderRadius: '20px',
                fontWeight: 'bold',
                fontSize: '13px',
                backgroundColor: playerPhase ? '#1976D2' : '#C62828',
              }}
            >
              {playerPhase ? '🛡️ PLAYER PHASE' : '⚔️ ENEMY PHASE'}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button onClick={navigate(props.onTitle)} title="Title Screen & Main Menu" style={buttonStyle('#1e293b', '#3b82f6', '#93c5fd')}>
              🏰 Title
            </button>
            <button onClick={navigate(props.onWorldMap)} title="View Continent of Archanea World Map" style={buttonStyle('#1e293b', '#0891b2', '#67e8f9')}>
              🗺️ World Map
            </button>
            <button onClick={navigate(props.onSaveFiles)} title="Open Save Files Manager" style={buttonStyle('#1e293b', '#8b5cf6', '#c4b5fd')}>
              📁 Save Files
            </button>
            <button onClick={props.onSave} style={buttonStyle('#2e7d32', '#4caf50')}>
              💾 Save Game
            </button>
            <button onClick={props.onLoad} style={buttonStyle('#1565c0', '#42a5f5')}>
              📂 Load Game
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', backgroundColor: '#1e1e1e', borderRadius: '6px', padding: '2px', border: '1px solid #444', minHeight: '36px' }}>
              <button onClick={() => props.onViewMode('3d')} style={viewButtonStyle(props.viewMode === '3d')}>
                🎮 3D View
              </button>
              <button onClick={() => props.onViewMode('2d')} style={viewButtonStyle(props.viewMode === '2d')}>
                🗺️ 2D Grid
              </button>
            </div>
            <button
              onClick={props.onToggleMute}
              title={props.isMuted ? 'Unmute Audio' : 'Mute Audio'}
              style={buttonStyle(props.isMuted ? '#C62828' : '#263238', '#444')}
            >
              {props.isMuted ? '🔇 Muted' : '🔊 Sound: On'}
            </button>
          </div>
          <div style={{ backgroundColor: '#1e1e1e', padding: '10px', borderRadius: '8px', border: '1px solid #333' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#90caf9', marginBottom: '8px' }}>📜 Combat Log</div>
            <div style={{ maxHeight: '160px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.5', color: '#e2e8f0' }}>
              {props.combatLog.length === 0 ? (
                <span style={{ color: '#777' }}>No battle engagements yet.</span>
              ) : (
                props.combatLog.map((log, idx) => <div key={idx} style={{ marginBottom: '4px' }}>{log}</div>)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
