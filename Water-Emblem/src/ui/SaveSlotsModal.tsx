import React, { useEffect, useState } from 'react';
import {
  listAllSaveSlots,
  deleteSaveSlot,
  copySaveSlot,
  type SlotSummary,
  type SaveGameData,
} from '../storage/saveLoad';
import { soundManager } from '../audio/soundManager';
import { chapters } from '../core/data/chapterData';

interface SaveSlotsModalProps {
  mode: 'load' | 'save';
  currentSnapshotToSave?: () => any;
  onSelectLoad: (data: SaveGameData, slotId: string) => void;
  onConfirmSave?: (slotId: string) => void;
  onNewGameAtSlot?: (slotId: string) => void;
  onClose: () => void;
}

export const SaveSlotsModal: React.FC<SaveSlotsModalProps> = ({
  mode,
  onSelectLoad,
  onConfirmSave,
  onNewGameAtSlot,
  onClose,
}) => {
  const [slots, setSlots] = useState<SlotSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copySourceSlot, setCopySourceSlot] = useState<string | null>(null);

  const fetchSlots = async () => {
    setLoading(true);
    const data = await listAllSaveSlots();
    setSlots(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleDelete = async (slotId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    soundManager.playSfx('cancel');
    const confirmed = window.confirm(`Are you sure you want to delete data in ${slotId.toUpperCase()}?`);
    if (!confirmed) return;
    await deleteSaveSlot(slotId);
    showToast(`Deleted save data in ${slotId.toUpperCase()}`);
    await fetchSlots();
  };

  const handleStartCopy = (slotId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    soundManager.playSfx('select');
    setCopySourceSlot(slotId);
    showToast(`Select a destination slot to copy from ${slotId.toUpperCase()}`);
  };

  const handlePasteCopy = async (targetSlotId: string) => {
    if (!copySourceSlot) return;
    soundManager.playSfx('accept');
    await copySaveSlot(copySourceSlot, targetSlotId);
    showToast(`Successfully copied from ${copySourceSlot.toUpperCase()} to ${targetSlotId.toUpperCase()}`);
    setCopySourceSlot(null);
    await fetchSlots();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 12, 24, 0.92)',
        zIndex: 1400,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: 'min(760px, 95vw)',
          backgroundColor: '#0f172a',
          border: '2px solid #3b82f6',
          borderRadius: '16px',
          boxShadow: '0 16px 50px rgba(0,0,0,0.85)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{mode === 'save' ? '💾' : '📂'}</span>
              <span>{mode === 'save' ? 'SAVE GAME (SELECT FILE)' : 'FILE SELECT (LOAD GAME)'}</span>
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              {mode === 'save'
                ? 'Select a file slot below to record your current campaign progress.'
                : 'Select a saved game to resume your journey, or begin a new file.'}
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

        {/* Action Notice Bar */}
        {actionNotice && (
          <div
            style={{
              padding: '10px 18px',
              backgroundColor: '#1e3a8a',
              color: '#93c5fd',
              fontSize: '13.5px',
              fontWeight: 'bold',
              textAlign: 'center',
              borderBottom: '1px solid #3b82f6',
            }}
          >
            ℹ️ {actionNotice}
          </div>
        )}

        {/* Slots List */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              ⏳ Loading save records...
            </div>
          ) : (
            slots.map((slot) => {
              const hasData = slot.data !== null;
              const chapterDef = slot.data ? chapters[slot.data.chapterId] : null;
              const dateStr = slot.data?.timestamp
                ? new Date(slot.data.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;

              const isCopyTarget = copySourceSlot !== null && copySourceSlot !== slot.slotId;

              return (
                <div
                  key={slot.slotId}
                  onClick={() => {
                    if (isCopyTarget) {
                      handlePasteCopy(slot.slotId);
                    } else if (mode === 'save') {
                      onConfirmSave?.(slot.slotId);
                    } else if (hasData) {
                      soundManager.playSfx('accept');
                      onSelectLoad(slot.data!, slot.slotId);
                    } else if (onNewGameAtSlot) {
                      soundManager.playSfx('select');
                      onNewGameAtSlot(slot.slotId);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    backgroundColor: isCopyTarget ? '#1e3a5f' : hasData ? '#1e293b' : '#0f172a',
                    border: `2px solid ${isCopyTarget ? '#38bdf8' : hasData ? '#3b82f6' : '#334155'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: hasData ? '0 4px 14px rgba(0,0,0,0.4)' : 'none',
                  }}
                >
                  {/* Left: Slot Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '10px',
                        backgroundColor: hasData ? '#2563eb' : '#1e293b',
                        border: `1px solid ${hasData ? '#60a5fa' : '#475569'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {hasData ? '⚔️' : '📁'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#f8fafc' }}>
                          {slot.name}
                        </span>
                        {hasData && (
                          <span style={{ fontSize: '11px', backgroundColor: '#059669', color: '#fff', padding: '2px 8px', borderRadius: '10px' }}>
                            Book 1
                          </span>
                        )}
                      </div>

                      {hasData && slot.data ? (
                        <div style={{ marginTop: '4px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.4' }}>
                          <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                            {chapterDef?.name ?? slot.data.chapterId}
                          </span>
                          <span style={{ margin: '0 8px', color: '#64748b' }}>•</span>
                          <span>Turn: {slot.data.turnState.turnNumber}</span>
                          <span style={{ margin: '0 8px', color: '#64748b' }}>•</span>
                          <span>Units: {slot.data.extendedUnits.filter((u) => u.unit.faction === 'player' && !u.unit.isDead).length}</span>
                          <span style={{ margin: '0 8px', color: '#64748b' }}>•</span>
                          <span style={{ color: '#facc15' }}>{slot.data.gold?.toLocaleString() ?? 0} G</span>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                            Saved: {dateStr}
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '4px', fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                          [Empty Slot — Click to {mode === 'save' ? 'save game here' : 'start New Game'}]
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isCopyTarget ? (
                      <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '13px' }}>
                        ➔ Click to Paste here
                      </span>
                    ) : hasData ? (
                      <>
                        <button
                          onClick={(e) => handleStartCopy(slot.slotId, e)}
                          title="Copy this save file"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#334155',
                            border: '1px solid #475569',
                            borderRadius: '6px',
                            color: '#e2e8f0',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={(e) => handleDelete(slot.slotId, e)}
                          title="Delete this save file"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#7f1d1d',
                            border: '1px solid #ef4444',
                            borderRadius: '6px',
                            color: '#fee2e2',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          🗑️ Delete
                        </button>
                        <span
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#2563eb',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 'bold',
                          }}
                        >
                          {mode === 'save' ? 'Overwrite ➔' : 'Load File ➔'}
                        </span>
                      </>
                    ) : (
                      <span
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#16a34a',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 'bold',
                        }}
                      >
                        {mode === 'save' ? 'Save Here ➔' : 'New Game ➔'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
