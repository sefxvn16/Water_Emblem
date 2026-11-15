import React, { useState } from 'react';
import worldMapData from '../../data/world_map.json';
import { soundManager } from '../audio/soundManager';

interface WorldMapModalProps {
  currentChapterId: string;
  onSelectChapter?: (chapterId: string) => void;
  onClose: () => void;
  onDeployBattle?: () => void;
}

// Portrait mappings for region rulers & key figures
const REGION_PORTRAITS: Record<string, { image: string; title: string }> = {
  talys: { image: '/avatars/marth.png', title: 'Prince Marth (Exiled in Talys)' },
  galder: { image: '/avatars/gomer.png', title: 'Gomer (Galder Pirate Chieftain)' },
  devil_mountain: { image: '/avatars/hyman.png', title: 'Hyman (Samsoian Bandit Leader)' },
  aurelis: { image: '/avatars/hardin.png', title: 'Prince Hardin (Leader of the Wolfguard)' },
  altea: { image: '/avatars/marth.png', title: 'Prince Marth (Rightful Heir of Altea)' },
  gra: { image: '/avatars/jiol.png', title: 'King Jiol (Traitor King of Gra)' },
  grust: { image: '/avatars/camus.png', title: 'General Camus (The Sable Knight)' },
  macedon: { image: '/avatars/michalis.png', title: 'King Michalis (The Dracoknight King)' },
  khadein: { image: '/avatars/gotoh.png', title: 'Archsage Gotoh (The White Sage)' },
  archanea: { image: '/avatars/nyna.png', title: 'Princess Nyna (Heiress of Archanea)' },
  dolhr: { image: '/avatars/medeus.png', title: 'Shadow Dragon Medeus (Emperor of Dolhr)' },
};

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  currentChapterId,
  onSelectChapter,
  onClose,
  onDeployBattle,
}) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string>(() => {
    const matched = worldMapData.regions.find((r) => r.chapters.includes(currentChapterId));
    return matched ? matched.id : 'talys';
  });

  const [mapStyle, setMapStyle] = useState<'pixel' | 'illustrated'>('pixel');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const selectedRegion = worldMapData.regions.find((r) => r.id === selectedRegionId) || worldMapData.regions[0]!;
  const portraitInfo = REGION_PORTRAITS[selectedRegion.id];

  const handleRegionClick = (regionId: string) => {
    soundManager.playSfx('select');
    setSelectedRegionId(regionId);
  };

  // Primary FE3 in-game map (upscaled 4x pixel-sharp with original fallback)
  const pixelMapUrl = '/models/Original/01_Maps/Upscaled_PixelSharp/4x/World_Maps/FEMN_Archanea_In-Game_4x.png';
  const illustratedMapUrl = '/maps/world_map_archanea_illustrated.jpg';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 10, 20, 0.96)',
        zIndex: 1500,
        display: 'flex',
        flexDirection: 'column',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 24px',
          backgroundColor: '#0b1329',
          borderBottom: '2px solid #334155',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          zIndex: 10,
        }}
      >
        {/* Title & Lore Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '28px' }}>🗺️</span>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '19px',
                color: '#facc15',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              The Continent of Archanea
            </h1>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Fire Emblem: Mystery of the Emblem — The War of Shadows
            </span>
          </div>
        </div>

        {/* Center Control Group: Map View Switcher & Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Map Style Selector */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#1e293b',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid #475569',
            }}
          >
            <button
              onClick={() => {
                soundManager.playSfx('select');
                setMapStyle('pixel');
              }}
              style={{
                padding: '5px 12px',
                backgroundColor: mapStyle === 'pixel' ? '#2563eb' : 'transparent',
                color: mapStyle === 'pixel' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              title="SNES Fire Emblem 3 In-Game Pixel Map"
            >
              🎮 FE3 Pixel Map
            </button>
            <button
              onClick={() => {
                soundManager.playSfx('select');
                setMapStyle('illustrated');
              }}
              style={{
                padding: '5px 12px',
                backgroundColor: mapStyle === 'illustrated' ? '#2563eb' : 'transparent',
                color: mapStyle === 'illustrated' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              title="Detailed Archanea Illustrated Lore Map"
            >
              🎨 Illustrated Map
            </button>
          </div>

          {/* Zoom Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#1e293b',
              borderRadius: '8px',
              padding: '2px 6px',
              border: '1px solid #475569',
              gap: '4px',
            }}
          >
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
              title="Zoom Out"
            >
              🔍-
            </button>
            <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '40px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.0, Number((z + 0.25).toFixed(2))))}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
              title="Zoom In"
            >
              🔍+
            </button>
            {zoomLevel !== 1 && (
              <button
                onClick={() => setZoomLevel(1)}
                style={{
                  backgroundColor: '#334155',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#e2e8f0',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  marginLeft: '4px',
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons: Deploy to Battle / Close */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {onDeployBattle && (
            <button
              onClick={() => {
                soundManager.playSfx('accept');
                onDeployBattle();
              }}
              style={{
                padding: '8px 18px',
                backgroundColor: '#16a34a',
                border: '1px solid #22c55e',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 10px rgba(22,163,74,0.4)',
              }}
            >
              ⚔️ Deploy to Battle
            </button>
          )}
          <button
            onClick={() => {
              soundManager.playSfx('cancel');
              onClose();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#334155',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>
      </header>

      {/* Main Map Body: Canvas + Sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Interactive World Map Canvas Area */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            backgroundColor: '#060d1a',
            backgroundImage: 'radial-gradient(#1e3a5f 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
              boxShadow: '0 12px 50px rgba(0,0,0,0.9), 0 0 0 2px #334155',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'inline-block',
              backgroundColor: '#000',
            }}
          >
            <svg
              viewBox="0 0 1000 1000"
              style={{
                width: 'min(82vh, 850px)',
                height: 'min(82vh, 850px)',
                display: 'block',
              }}
            >
              <defs>
                {/* Castle selection aura glow */}
                <filter id="castleGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                {/* Route glow */}
                <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                {/* Parchment plaque gradient */}
                <linearGradient id="plaqueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
                </linearGradient>
                {/* Active plaque gradient */}
                <linearGradient id="activePlaqueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              {/* 1. True Fire Emblem 3 Archanea Map Image */}
              <image
                href={mapStyle === 'pixel' ? pixelMapUrl : illustratedMapUrl}
                x="0"
                y="0"
                width="1000"
                height="1000"
                preserveAspectRatio="none"
                style={{
                  imageRendering: mapStyle === 'pixel' ? 'pixelated' : 'auto',
                }}
              />

              {/* 2. Antique Border & Grid Lines */}
              <rect
                x="4"
                y="4"
                width="992"
                height="992"
                fill="none"
                stroke="#d97706"
                strokeWidth="2"
                opacity="0.6"
              />
              <rect
                x="8"
                y="8"
                width="984"
                height="984"
                fill="none"
                stroke="#78350f"
                strokeWidth="1"
                opacity="0.4"
              />

              {/* Ornate Corner Accents */}
              <g stroke="#facc15" strokeWidth="2" fill="none" opacity="0.8">
                {/* Top-left */}
                <path d="M 12 28 L 28 28 L 28 12" />
                <circle cx="28" cy="28" r="3" fill="#facc15" />
                {/* Top-right */}
                <path d="M 988 28 L 972 28 L 972 12" />
                <circle cx="972" cy="28" r="3" fill="#facc15" />
                {/* Bottom-left */}
                <path d="M 12 972 L 28 972 L 28 988" />
                <circle cx="28" cy="972" r="3" fill="#facc15" />
                {/* Bottom-right */}
                <path d="M 988 972 L 972 972 L 972 988" />
                <circle cx="972" cy="972" r="3" fill="#facc15" />
              </g>

              {/* Decorative Compass Rose in Northwest Sea (Khadein Sea) */}
              <g transform="translate(100, 100) scale(0.65)" opacity="0.85">
                <circle cx="0" cy="0" r="46" fill="rgba(15,23,42,0.6)" stroke="#ca8a04" strokeWidth="2" />
                <circle cx="0" cy="0" r="38" fill="none" stroke="#facc15" strokeWidth="1" strokeDasharray="3 3" />
                <polygon points="0,-58 10,-12 0,0 -10,-12" fill="#ef4444" />
                <polygon points="0,58 10,12 0,0 -10,12" fill="#64748b" />
                <polygon points="58,0 12,10 0,0 12,-10" fill="#64748b" />
                <polygon points="-58,0 -12,10 0,0 -12,-10" fill="#64748b" />
                <text x="-6" y="-64" fill="#facc15" fontSize="18" fontWeight="bold" fontFamily="serif">
                  N
                </text>
              </g>

              {/* 3. Campaign March Expedition Trails */}
              {/* Talys to Galder (Chapter 1 to Chapter 2) */}
              <line
                x1="860"
                y1="740"
                x2="760"
                y2="620"
                stroke="#facc15"
                strokeWidth="4"
                strokeDasharray="8 6"
                filter="url(#routeGlow)"
              />
              {/* Galder to Devil Mountain (Chapter 2 to Chapter 3) */}
              <line
                x1="760"
                y1="620"
                x2="680"
                y2="480"
                stroke="#facc15"
                strokeWidth="4"
                strokeDasharray="8 6"
                filter="url(#routeGlow)"
              />
              {/* Devil Mountain to Aurelis (Chapter 3 to Chapter 4) */}
              <line
                x1="680"
                y1="480"
                x2="620"
                y2="250"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeDasharray="8 6"
                opacity="0.9"
                filter="url(#routeGlow)"
              />

              {/* 4. Interactive Castle Fortresses & Heraldic Banners */}
              {worldMapData.regions.map((region) => {
                const cx = region.coordinates.x * 10;
                const cy = region.coordinates.y * 10;
                const isSelected = region.id === selectedRegionId;
                const isCurrentChapter = region.chapters.includes(currentChapterId);

                return (
                  <g
                    key={region.id}
                    onClick={() => handleRegionClick(region.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Selected Golden Beacon Aura */}
                    {isSelected && (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r="34"
                          fill="none"
                          stroke="#facc15"
                          strokeWidth="2.5"
                          strokeDasharray="5 5"
                          opacity="0.9"
                          filter="url(#castleGlow)"
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r="42"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          opacity="0.6"
                        />
                      </g>
                    )}

                    {/* Current Chapter Pulsing Beacon */}
                    {isCurrentChapter && !isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="30"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        opacity="0.9"
                      />
                    )}

                    {/* CASTLE / FORTRESS ICON */}
                    <g transform={`translate(${cx}, ${cy})`} filter={isSelected ? 'url(#castleGlow)' : undefined}>
                      {/* Castle shadow */}
                      <ellipse cx="0" cy="10" rx="20" ry="6" fill="rgba(0,0,0,0.6)" />

                      {/* Castle Main Wall Base */}
                      <rect
                        x="-16"
                        y="-8"
                        width="32"
                        height="18"
                        fill="#475569"
                        stroke="#1e293b"
                        strokeWidth="1.5"
                        rx="1"
                      />

                      {/* Left Turret & Crenellations */}
                      <rect
                        x="-18"
                        y="-16"
                        width="10"
                        height="16"
                        fill="#64748b"
                        stroke="#1e293b"
                        strokeWidth="1.2"
                      />
                      <polygon points="-18,-18 -15,-18 -15,-16 -18,-16" fill="#94a3b8" />
                      <polygon points="-11,-18 -8,-18 -8,-16 -11,-16" fill="#94a3b8" />

                      {/* Right Turret & Crenellations */}
                      <rect
                        x="8"
                        y="-16"
                        width="10"
                        height="16"
                        fill="#64748b"
                        stroke="#1e293b"
                        strokeWidth="1.2"
                      />
                      <polygon points="8,-18 11,-18 11,-16 8,-16" fill="#94a3b8" />
                      <polygon points="15,-18 18,-18 18,-16 15,-16" fill="#94a3b8" />

                      {/* Central Grand Keep */}
                      <rect
                        x="-7"
                        y="-22"
                        width="14"
                        height="22"
                        fill="#94a3b8"
                        stroke="#1e293b"
                        strokeWidth="1.5"
                      />
                      {/* Central keep crenellations */}
                      <polygon points="-7,-25 -4,-25 -4,-22 -7,-22" fill="#cbd5e1" />
                      <polygon points="4,-25 7,-25 7,-22 4,-22" fill="#cbd5e1" />

                      {/* Castle Arched Gate */}
                      <path
                        d="M -5,10 L -5,2 A 5 5 0 0 1 5,2 L 5,10 Z"
                        fill="#090d16"
                        stroke="#334155"
                        strokeWidth="1"
                      />

                      {/* Flagpole & Heraldic Pennant on Central Keep */}
                      <line x1="0" y1="-22" x2="0" y2="-36" stroke="#e2e8f0" strokeWidth="2" />
                      <polygon
                        points="0,-36 18,-30 0,-24"
                        fill={region.bannerColor}
                        stroke="#ffffff"
                        strokeWidth="1.2"
                      />

                      {/* Selected Pointer Sword/Arrow Indicator */}
                      {isSelected && (
                        <g transform="translate(0, -44)">
                          <polygon points="0,0 -7,-12 7,-12" fill="#facc15" stroke="#78350f" strokeWidth="1.5" />
                        </g>
                      )}

                      {/* Current Chapter Star Badge */}
                      {isCurrentChapter && (
                        <g transform="translate(-14, -28)">
                          <circle cx="0" cy="0" r="8" fill="#eab308" stroke="#ffffff" strokeWidth="1.5" />
                          <text
                            x="0"
                            y="4"
                            fill="#78350f"
                            fontSize="11"
                            fontWeight="900"
                            textAnchor="middle"
                          >
                            ★
                          </text>
                        </g>
                      )}
                    </g>

                    {/* HERALDIC LOCATION NAME PLAQUE (Clean, legible, and matches Playwright selector) */}
                    <g transform={`translate(${cx}, ${cy + 18})`}>
                      <rect
                        x="-60"
                        y="0"
                        width="120"
                        height="24"
                        rx="5"
                        fill={isSelected ? 'url(#activePlaqueGrad)' : 'url(#plaqueGrad)'}
                        stroke={isSelected ? '#facc15' : '#475569'}
                        strokeWidth={isSelected ? '2' : '1.2'}
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
                      />
                      {/* Kingdom heraldic left color bar */}
                      <rect
                        x="-57"
                        y="3"
                        width="4"
                        height="18"
                        rx="2"
                        fill={region.bannerColor}
                      />
                      <text
                        x="4"
                        y="16"
                        fill={isSelected ? '#fef08a' : '#f1f5f9'}
                        fontSize="11.5"
                        fontWeight="bold"
                        letterSpacing="0.5px"
                        textAnchor="middle"
                        filter={isSelected ? 'drop-shadow(0 0 4px #eab308)' : undefined}
                      >
                        {region.name.replace(/^(Kingdom of|Port Town of|City of Magic|Holy Kingdom of)\s*/i, '')}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Strategic Info Sidebar */}
        <aside
          style={{
            width: '380px',
            maxWidth: '35vw',
            backgroundColor: '#0b1329',
            borderLeft: '2px solid #334155',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            boxShadow: '-4px 0 25px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header of Region */}
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: selectedRegion.bannerColor,
                  display: 'inline-block',
                  boxShadow: `0 0 8px ${selectedRegion.bannerColor}`,
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  letterSpacing: '1.2px',
                  fontWeight: 'bold',
                }}
              >
                {selectedRegion.type.replace('_', ' ')}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '21px', color: '#f8fafc', letterSpacing: '0.5px' }}>
              {selectedRegion.name}
            </h2>
          </div>

          {/* Ruler & Portrait Card */}
          <div
            style={{
              backgroundColor: '#111e38',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid #233554',
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
            }}
          >
            {portraitInfo && (
              <div
                style={{
                  position: 'relative',
                  width: '64px',
                  height: '64px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #facc15',
                  backgroundColor: '#000',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                <img
                  src={portraitInfo.image}
                  alt={selectedRegion.ruler}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                👑 Sovereign / Ruler
              </div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fde047', marginTop: '2px' }}>
                {selectedRegion.ruler}
              </div>
              {portraitInfo && (
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
                  {portraitInfo.title}
                </div>
              )}
            </div>
          </div>

          {/* Notable Figures */}
          <div>
            <div
              style={{
                fontSize: '12px',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
                fontWeight: 'bold',
              }}
            >
              👥 Notable Figures
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedRegion.notableCharacters.map((charName) => (
                <span
                  key={charName}
                  style={{
                    fontSize: '12px',
                    backgroundColor: '#1e293b',
                    color: '#e2e8f0',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                  }}
                >
                  {charName}
                </span>
              ))}
            </div>
          </div>

          {/* Historical Lore & Strategic Context */}
          <div>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                color: '#fbbf24',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              📜 History & Strategic Context
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: '1.65',
                color: '#cbd5e1',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
              }}
            >
              {selectedRegion.description}
            </p>
          </div>

          {/* Campaign Chapters Occurring Here */}
          <div>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                color: '#a78bfa',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ⚔️ Campaign Chapters
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedRegion.chapters.map((chId) => {
                const isSelectedCh = chId === currentChapterId;
                return (
                  <button
                    key={chId}
                    onClick={() => onSelectChapter?.(chId)}
                    style={{
                      padding: '7px 14px',
                      backgroundColor: isSelectedCh ? '#2563eb' : '#1e293b',
                      border: `1px solid ${isSelectedCh ? '#60a5fa' : '#475569'}`,
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '12.5px',
                      fontWeight: isSelectedCh ? 'bold' : 'normal',
                      cursor: onSelectChapter ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isSelectedCh ? '0 0 10px rgba(37,99,235,0.5)' : undefined,
                    }}
                  >
                    <span>{chId.toUpperCase()}</span>
                    {isSelectedCh && <span style={{ color: '#fde047' }}>★ Current</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map Legend */}
          <div
            style={{
              marginTop: 'auto',
              padding: '12px 14px',
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              fontSize: '11.5px',
              color: '#94a3b8',
              lineHeight: '1.7',
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#cbd5e1', marginBottom: '4px' }}>🗺️ Map Legend</div>
            <div>🏰 <strong>Fortress & Banner:</strong> Sovereign Kingdom or Realm</div>
            <div>★ <strong>Gold Star:</strong> Current Marth Campaign Theater</div>
            <div>🟡 <strong>Gold dashed trail:</strong> Completed Campaign March</div>
            <div>🔵 <strong>Blue dashed trail:</strong> Next Military March</div>
          </div>
        </aside>
      </div>
    </div>
  );
};
