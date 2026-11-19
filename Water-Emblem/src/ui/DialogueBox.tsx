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
  /** Skip the whole dialogue (PLAN item 117). */
  onSkip?: () => void;
}

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

/** FE3-style dialogue: avatar in framed box with speech bubble pointing to it (Image 1). */
export const DialogueBox: React.FC<DialogueBoxProps> = ({
  dialogues,
  title,
  actionButtonText,
  summaryBox,
  onConfirm,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedLength, setDisplayedLength] = useState(0);

  const safeDialogues = dialogues.length > 0 ? dialogues : [{ speaker: 'Narrator', text: '...', avatarUrl: '' }];
  const currentLine = safeDialogues[Math.min(currentStep, safeDialogues.length - 1)]!;
  const fullText = currentLine.text || '';
  const isTyping = displayedLength < fullText.length;
  const isLast = currentStep >= safeDialogues.length - 1;

  // Identify first speaker to place on the left, others on the right
  const firstSpeaker = safeDialogues[0]?.speaker;
  const isLeftSpeaker = currentLine.speaker === firstSpeaker || safeDialogues.length === 1;

  useEffect(() => {
    setDisplayedLength(0);
    const timer = setInterval(() => {
      setDisplayedLength((prev) => {
        if (prev >= fullText.length) {
          clearInterval(timer);
          return prev;
        }
        return Math.min(prev + 3, fullText.length);
      });
    }, 16);
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

  const avatarBox = (
    <div
      style={{
        width: '84px',
        height: '84px',
        flexShrink: 0,
        backgroundColor: '#07123d',
        border: '2px solid #eab308',
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 4px 14px rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {currentLine.avatarUrl ? (
        <img
          src={currentLine.avatarUrl}
          alt={currentLine.speaker}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
      ) : (
        <span style={{ fontSize: '32px' }}>👤</span>
      )}
    </div>
  );

  const speechBubble = (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        backgroundColor: '#0c1e5b',
        border: '2px solid #eab308',
        borderRadius: '8px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '84px',
        boxSizing: 'border-box',
      }}
    >
      {/* Pointer arrow pointing towards the avatar */}
      {isLeftSpeaker ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-9px',
            top: '32px',
            width: 0,
            height: 0,
            borderTop: '7px solid transparent',
            borderBottom: '7px solid transparent',
            borderRight: '8px solid #eab308',
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '-9px',
            top: '32px',
            width: 0,
            height: 0,
            borderTop: '7px solid transparent',
            borderBottom: '7px solid transparent',
            borderLeft: '8px solid #eab308',
          }}
        />
      )}

      {/* Speaker Name Tag */}
      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>
        {currentLine.speaker}
      </div>

      {/* Spoken Text */}
      <div
        style={{
          fontSize: '15px',
          lineHeight: '1.55',
          color: '#ffffff',
          letterSpacing: '0.2px',
          textShadow: '1px 1px 0 #000',
        }}
      >
        <span style={visuallyHidden}>{fullText}</span>
        <span aria-hidden="true">
          {fullText.slice(0, displayedLength)}
          {isTyping && <span style={{ opacity: 0.8, color: '#fde047' }}>▌</span>}
        </span>
      </div>

      {/* Bottom Hint */}
      {!isTyping && !isLast && (
        <div style={{ alignSelf: 'flex-end', color: '#fde047', fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>
          ▼ Next
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.25)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        zIndex: 1200,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 'min(760px, 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Top Control Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#07123d',
            border: '1.5px solid #eab308',
            borderRadius: '6px',
            padding: '6px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, color: '#fde047', fontWeight: 'bold', fontSize: '14px' }}>{title}</h2>
            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
              ({currentStep + 1}/{safeDialogues.length})
            </span>
          </div>
          <button
            onClick={onConfirm}
            style={{
              padding: '4px 12px',
              backgroundColor: '#1e293b',
              border: '1px solid #eab308',
              borderRadius: '4px',
              color: '#fde047',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {actionButtonText}
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              style={{
                padding: '4px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #64748b',
                borderRadius: '4px',
                color: '#cbd5e1',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ⏭ Skip
            </button>
          )}
        </div>

        {/* Dialogue Box (FE3 style Image 1) */}
        <div
          onClick={handleAdvance}
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexDirection: isLeftSpeaker ? 'row' : 'row-reverse',
          }}
        >
          {avatarBox}
          {speechBubble}
        </div>

        {summaryBox && <div>{summaryBox}</div>}
      </div>
    </div>
  );
};
