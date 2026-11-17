import React, { useEffect, useState } from 'react';
import type { DialogueLine } from '../core/chapter/events';
import { soundManager } from '../audio/soundManager';

interface DialogueBoxProps {
  dialogues: readonly DialogueLine[];
  title: string;
  themeColor?: 'blue' | 'amber' | 'green';
  actionButtonText: string;
  summaryBox?: React.ReactNode;
  onConfirm: () => void;
}

const THEMES = {
  blue: { border: '#3b82f6', cardBg: '#0f172a', balloonBg: '#1e293b', balloonBorder: '#334155', nameColor: '#60a5fa', nameTagBg: '#1e3a8a', btnBg: '#2563eb', btnBorder: '#3b82f6', btnShadow: 'rgba(37,99,235,0.4)' },
  amber: { border: '#f59e0b', cardBg: '#1c1917', balloonBg: '#292524', balloonBorder: '#44403c', nameColor: '#fbbf24', nameTagBg: '#78350f', btnBg: '#d97706', btnBorder: '#f59e0b', btnShadow: 'rgba(217,119,6,0.4)' },
  green: { border: '#22c55e', cardBg: '#052e16', balloonBg: '#064e3b', balloonBorder: '#047857', nameColor: '#86efac', nameTagBg: '#022c22', btnBg: '#16a34a', btnBorder: '#22c55e', btnShadow: 'rgba(22,163,74,0.4)' },
};

const visuallyHidden: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/** FE3 dialogue box docked at the bottom of the viewport, portrait in a frame at its left; the map stays visible. */
export const DialogueBox: React.FC<DialogueBoxProps> = ({
  dialogues,
  title,
  themeColor = 'blue',
  actionButtonText,
  summaryBox,
  onConfirm,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedLength, setDisplayedLength] = useState(0);

  const safeDialogues = dialogues.length > 0 ? dialogues : [{ speaker: 'Narrator', text: '...', avatarUrl: '' }];
  const currentLine = safeDialogues[Math.min(currentStep, safeDialogues.length - 1)]!;
  const fullText = currentLine.text || '';
  const isTyping = displayedLength < fullText.length;
  const isLast = currentStep >= safeDialogues.length - 1;

  useEffect(() => {
    setDisplayedLength(0);
    const timer = setInterval(() => {
      setDisplayedLength((prev) => {
        if (prev >= fullText.length) {
          clearInterval(timer);
          return prev;
        }
        return Math.min(prev + 4, fullText.length);
      });
    }, 15);
    return () => clearInterval(timer);
  }, [currentStep, fullText]);

  const handleAdvance = () => {
    if (isTyping) {
      setDisplayedLength(fullText.length);
    } else if (!isLast) {
      soundManager.playSfx('cursor');
      setCurrentStep((prev) => prev + 1);
    } else {
      soundManager.playSfx('select');
      onConfirm();
    }
  };

  const theme = THEMES[themeColor];
  const portraitStyle: React.CSSProperties = {
    width: '112px',
    height: '112px',
    borderRadius: '6px',
    border: `3px solid ${theme.border}`,
    backgroundColor: '#020617',
    flexShrink: 0,
    boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
  };

  return (
    // Light dim only; the overlay still swallows pointer input so the map cannot be clicked mid-cutscene.
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        zIndex: 1200,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: 'min(960px, 100%)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        {currentLine.avatarUrl ? (
          <img src={currentLine.avatarUrl} alt={currentLine.speaker} style={{ ...portraitStyle, objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <div style={{ ...portraitStyle, backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
            👤
          </div>
        )}

        <div
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: theme.cardBg,
            border: `2px solid ${theme.border}`,
            borderRadius: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '8px 14px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderBottom: `1px solid ${theme.border}44`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, color: theme.nameColor, fontSize: '16px', fontWeight: 'bold' }}>{title}</h2>
              <span style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '12px' }}>
                {currentStep + 1}/{safeDialogues.length}
              </span>
            </div>
            <button
              onClick={onConfirm}
              title={actionButtonText}
              style={{
                padding: '6px 14px',
                backgroundColor: theme.btnBg,
                border: `1px solid ${theme.btnBorder}`,
                borderRadius: '6px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: `0 2px 8px ${theme.btnShadow}`,
              }}
            >
              {actionButtonText}
            </button>
          </div>

          <div
            onClick={handleAdvance}
            style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}
          >
            {/* Visually hidden full cutscene transcript for screen readers and accessibility */}
            <div style={visuallyHidden}>
              {safeDialogues.map((line, idx) => (
                <p key={idx}>{line.speaker}: {line.text}</p>
              ))}
            </div>

            <div
              style={{
                alignSelf: 'flex-start',
                backgroundColor: theme.nameTagBg,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                padding: '3px 12px',
                color: theme.nameColor,
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              {currentLine.speaker}
            </div>

            <div
              style={{
                backgroundColor: theme.balloonBg,
                border: `1px solid ${theme.balloonBorder}`,
                borderRadius: '8px',
                padding: '10px 14px',
                minHeight: '64px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#f8fafc', position: 'relative' }}>
                {/* Visually hidden full text for screen readers and accessibility */}
                <span style={visuallyHidden}>{fullText}</span>
                <span aria-hidden="true">
                  "{fullText.slice(0, displayedLength)}"
                  {isTyping && <span style={{ opacity: 0.7, marginLeft: '2px', color: theme.nameColor }}>▌</span>}
                </span>
              </div>
              {!isTyping && !isLast && (
                <div style={{ alignSelf: 'flex-end', color: theme.nameColor, fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>
                  ▼ Click to advance...
                </div>
              )}
            </div>

            {summaryBox && <div>{summaryBox}</div>}

            <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
              {isLast ? '✨ Dialogue complete. Click the button above to proceed.' : '💡 Click anywhere on the box to advance, or click the button above to skip.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
