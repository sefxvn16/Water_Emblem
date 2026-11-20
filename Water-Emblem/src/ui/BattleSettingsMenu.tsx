import React, { useEffect, useRef, useState } from 'react';
import { DS_COLORS, DS_RADII, DS_Z, primaryButtonStyle, secondaryButtonStyle, sectionHeadingStyle, sharedPanelStyle } from './designSystem';

interface BattleSettingsMenuProps {
  /** Changes whenever the chapter changes or a full-screen modal opens or closes; the menu closes. */
  forceCloseKey: string;
  chapterId: string;
  chapterName: string;
  objectiveText: string;
  gold: number;
  turnNumber: number;
  activePhase: string;
  viewMode: '3d' | '2d';
  isMuted: boolean;
  /** Master volume 0..1 (PLAN item 128); 0 = muted. */
  volume: number;
  onVolume: (volume: number) => void;
  onChapterChange: (chapterId: string) => void;
  onTitle: () => void;
  onWorldMap: () => void;
  onSaveFiles: () => void;
  onSave: () => void;
  onLoad: () => void;
  onViewMode: (mode: '3d' | '2d') => void;
  /** Auto End Turn toggle (PLAN item 138): when on, the player phase
      ends automatically once every unit has acted. */
  autoEndTurn: boolean;
  onAutoEndTurn: (enabled: boolean) => void;
  onToggleMute: () => void;
  /** Primary battle action shown left of the gear in the top-right cluster (End Turn). */
  leading?: React.ReactNode;
}

const navButtonStyle = (primary: boolean): React.CSSProperties => ({
  ...(primary ? primaryButtonStyle() : secondaryButtonStyle()),
  padding: '10px 13px',
  fontSize: '14px',
  gap: '6px',
  minHeight: 44,
  width: '100%',
  justifyContent: 'center',
});

const viewButtonStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '10px 13px',
  border: 'none',
  borderRadius: DS_RADII.small,
  backgroundColor: active ? '#1976D2' : 'transparent',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 'bold',
  cursor: 'pointer',
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

// HUD cluster metrics (px): 28 clears the map scrollbars; 48 keeps a 44px+ touch target.
export const HUD_EDGE = 28;
export const HUD_SIZE = 48;
const HUD_GAP = 8;

export const BattleSettingsMenu: React.FC<BattleSettingsMenuProps> = (props) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [props.forceCloseKey]);

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

  return (
    <div ref={rootRef}>
      {/* Bottom-right HUD cluster: primary action, then the Settings gear. */}
      <div
        style={{
          position: 'fixed',
          right: `${HUD_EDGE}px`,
          top: `${HUD_EDGE}px`,
          zIndex: DS_Z.settings,
          display: 'flex',
          alignItems: 'center',
          gap: `${HUD_GAP}px`,
        }}
      >
        {props.leading}
        <button
          onClick={() => setOpen((value) => !value)}
          aria-label="Settings"
          title="Settings"
          aria-expanded={open}
          style={{
            width: `${HUD_SIZE}px`,
            height: `${HUD_SIZE}px`,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: `1px solid ${open ? '#94a3b8' : '#64748b'}`,
            backgroundColor: open ? 'rgba(30,41,59,0.95)' : 'rgba(15,23,42,0.85)',
            color: '#fff',
            fontSize: '26px',
            lineHeight: 1,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          <span aria-hidden="true">⚙</span>
        </button>
      </div>
      {open && (
        <div
          data-testid="settings-menu"
          style={{
            ...sharedPanelStyle,
            position: 'fixed',
            right: `${HUD_EDGE}px`,
            top: `${HUD_EDGE + HUD_SIZE + HUD_GAP}px`,
            zIndex: DS_Z.settings,
            width: '340px',
            maxHeight: `calc(100vh - ${HUD_EDGE + HUD_SIZE + HUD_GAP + 16}px)`,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Chapter */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={sectionHeadingStyle}>Chapter</h3>
            <select
              value={props.chapterId}
              onChange={(e) => props.onChapterChange(e.target.value)}
              aria-label="Chapter"
              style={{
                backgroundColor: DS_COLORS.secondaryBg,
                color: '#38bdf8',
                border: `1px solid #0284c7`,
                borderRadius: DS_RADII.medium,
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                minHeight: 44,
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <option value="chapter_01">🗺️ Chapter 1: Marth Embarks (30x13)</option>
              <option value="chapter_02">🗺️ Chapter 2: The Pirates of Galder (30x15)</option>
              <option value="chapter_03">🗺️ Chapter 3: The Devil Mountain (30x20)</option>
              <option value="test_chapter_01">🧪 Test Map (8x8)</option>
            </select>
            <span style={{ fontSize: '13px', color: DS_COLORS.muted }}>
              {props.chapterName} (Objective: {props.objectiveText})
            </span>
          </section>

          {/* Status: gold only (PLAN item 128: phase/turn info removed). */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={sectionHeadingStyle}>Status</h3>
            <div
              style={{
                padding: '10px 13px',
                backgroundColor: '#451a03',
                border: '1px solid #d97706',
                borderRadius: DS_RADII.medium,
                color: '#fef08a',
                fontSize: '14px',
                fontWeight: 'bold',
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              💰 {props.gold.toLocaleString()} G
            </div>
          </section>

          {/* Navigation: uniform 44px buttons in a 2-column grid; Save/Load
              side by side (PLAN item 128). */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={sectionHeadingStyle}>Navigation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={navigate(props.onSave)} style={navButtonStyle(true)}>
                💾 Save Game
              </button>
              <button onClick={navigate(props.onLoad)} style={navButtonStyle(false)}>
                📂 Load Game
              </button>
              <button onClick={navigate(props.onSaveFiles)} title="Manage save slots" style={navButtonStyle(false)}>
                📁 Manage Saves
              </button>
              <button onClick={navigate(props.onWorldMap)} title="View Continent of Archanea World Map" style={navButtonStyle(false)}>
                🗺️ World Map
              </button>
              <button onClick={navigate(props.onTitle)} title="Title Screen & Main Menu" style={{ ...navButtonStyle(false), gridColumn: '1 / -1' }}>
                🏰 Title
              </button>
            </div>
          </section>

          {/* View & Sound */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={sectionHeadingStyle}>View &amp; Sound</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flex: 1, backgroundColor: DS_COLORS.navyDark, borderRadius: DS_RADII.medium, padding: '2px', border: `1px solid ${DS_COLORS.secondaryBorder}`, minHeight: 44 }}>
                <button onClick={() => props.onViewMode('3d')} style={viewButtonStyle(props.viewMode === '3d')}>
                  🎮 3D View
                </button>
                <button onClick={() => props.onViewMode('2d')} style={viewButtonStyle(props.viewMode === '2d')}>
                  🗺️ 2D Grid
                </button>
              </div>
            </div>
            {/* Volume slider (PLAN item 128): drag to 0 = muted. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: 44, padding: '0 4px' }}>
              <span aria-hidden="true" style={{ fontSize: '18px' }}>{props.volume <= 0 ? '🔇' : props.volume < 0.5 ? '🔉' : '🔊'}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(props.volume * 100)}
                aria-label="Volume"
                onChange={(event) => props.onVolume(Number(event.target.value) / 100)}
                style={{ flex: 1, accentColor: DS_COLORS.gold, height: '6px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#e2e8f0', minWidth: '38px', textAlign: 'right' }}>
                {Math.round(props.volume * 100)}%
              </span>
            </div>
            {/* Auto End Turn (PLAN item 138): off = press End Turn manually. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: 44, padding: '0 4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#e2e8f0', flex: 1 }}>⏭️ Auto End Turn</span>
              <div style={{ display: 'flex', backgroundColor: DS_COLORS.navyDark, borderRadius: DS_RADII.medium, padding: '2px', border: `1px solid ${DS_COLORS.secondaryBorder}` }} role="group" aria-label="Auto End Turn">
                <button onClick={() => props.onAutoEndTurn(true)} style={{ ...viewButtonStyle(props.autoEndTurn), minHeight: 36, padding: '6px 14px' }}>
                  On
                </button>
                <button onClick={() => props.onAutoEndTurn(false)} style={{ ...viewButtonStyle(!props.autoEndTurn), minHeight: 36, padding: '6px 14px' }}>
                  Off
                </button>
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  );
};
