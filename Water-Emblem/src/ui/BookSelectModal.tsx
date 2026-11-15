import React from 'react';
import { soundManager } from '../audio/soundManager';

interface BookSelectModalProps {
  onSelectBook: (bookId: 'book1' | 'book2') => void;
  onClose: () => void;
}

export const BookSelectModal: React.FC<BookSelectModalProps> = ({
  onSelectBook,
  onClose,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 12, 24, 0.94)',
        zIndex: 1400,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: 'min(860px, 96vw)',
          backgroundColor: '#0f172a',
          border: '2px solid #3b82f6',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#facc15', letterSpacing: '0.5px' }}>
              📖 SELECT CAMPAIGN
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Experience the two legendary sagas across the continent of Archanea.
            </p>
          </div>

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
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Two Books Selection Grid */}
        <div
          style={{
            padding: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Book 1 Card */}
          <div
            onClick={() => {
              soundManager.playSfx('accept');
              onSelectBook('book1');
            }}
            style={{
              backgroundColor: '#1e293b',
              border: '2px solid #2563eb',
              borderRadius: '14px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
              boxShadow: '0 6px 20px rgba(37,99,235,0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px' }}>
              ✓ PLAYABLE CAMPAIGN
            </div>

            <div>
              <div style={{ fontSize: '38px', marginBottom: '10px' }}>⚔️</div>
              <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                WAR OF SHADOWS
              </div>
              <h3 style={{ margin: '6px 0 10px 0', fontSize: '20px', color: '#f8fafc' }}>
                Book 1: The Dark Dragon and the Blade of Light
              </h3>
              <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#cbd5e1', margin: 0 }}>
                With his homeland of Altea fallen to the Dolhr Empire, Prince Marth and his loyal knights seek refuge on the island kingdom of Talys. Two years later, when pirates strike the island, Marth embarks on an epic campaign to liberate Archanea from the Shadow Dragon Medeus.
              </p>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                Chapter 1 ➔ Chapter 3+ (Unlocked)
              </span>
              <button
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(37,99,235,0.4)',
                }}
              >
                Enter Book 1 ➔
              </button>
            </div>
          </div>

          {/* Book 2 Card */}
          <div
            onClick={() => {
              soundManager.playSfx('select');
              onSelectBook('book2');
            }}
            style={{
              backgroundColor: '#182030',
              border: '2px solid #6366f1',
              borderRadius: '14px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(99,102,241,0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px' }}>
              ⭐ EXPANSION SAGA
            </div>

            <div>
              <div style={{ fontSize: '38px', marginBottom: '10px' }}>🛡️</div>
              <div style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                WAR OF HEROES
              </div>
              <h3 style={{ margin: '6px 0 10px 0', fontSize: '20px', color: '#f8fafc' }}>
                Book 2: The Mystery of the Emblem
              </h3>
              <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#cbd5e1', margin: 0 }}>
                One year after peace is restored, Hardin is crowned Emperor of Archanea but gradually succumbs to a sinister darkness. Marth is forced to take up arms once more, collecting the twelve Starsphere shards to restore the legendary Shield of Seals.
              </p>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                Hardin Chronicles & Story Lore
              </span>
              <button
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4f46e5',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                View Book 2 Lore ➔
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
