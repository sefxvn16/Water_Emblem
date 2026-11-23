import React from 'react';
import { BattlePreparationModal } from '../BattlePreparationModal';
import { DialogueBox } from '../DialogueBox';
import { TitleScreen } from '../TitleScreen';
import { BookSelectModal } from '../BookSelectModal';
import { SaveSlotsModal } from '../SaveSlotsModal';
import { WorldMapModal } from '../WorldMapModal';
import { LevelUpModal } from '../LevelUpModal';
import { buildNewGameSnapshot, saveGameState } from '../../storage/saveLoad';
import { defaultRNG } from '../../core/combat/rng';
import { chapters } from '../../core/data/chapterData';
import type { useChapterState } from './useChapterState';
import type { useGameFeedback } from './useGameFeedback';
import type { useShopArena } from './useShopArena';

export interface ScreenModalsProps {
  readonly chapter: ReturnType<typeof useChapterState>;
  readonly feedback: ReturnType<typeof useGameFeedback>;
  readonly shopArena: ReturnType<typeof useShopArena>;
}

export const ScreenModals: React.FC<ScreenModalsProps> = ({ chapter, feedback, shopArena }) => {
  return (
    <>
      {chapter.showPreparation && (
        <BattlePreparationModal
          chapterName={chapter.currentChapter.name} lordName={chapter.lordName} lordUnitId={chapter.currentChapter.lordUnitId}
          units={[...chapter.extendedUnits, ...chapter.reserveUnits].filter(({ unit }) => unit.faction === 'player')}
          deployedIds={new Set(chapter.extendedUnits.map(({ unit }) => unit.id))}
          deployedCount={chapter.extendedUnits.filter(({ unit }) => unit.faction === 'player' && !unit.isDead).length}
          deploymentLimit={chapter.currentChapter.units.filter(({ unit }) => unit.faction === 'player').length}
          onToggle={chapter.toggleDeployment} onStart={() => chapter.setShowPreparation(false)}
          onOpenConvoy={(unitId) => shopArena.setPrepConvoyUnitId(unitId)} onTrade={(unitId) => shopArena.setPrepTrade({ unitId, partnerId: null })}
          reclassAvailable={shopArena.reclassAvailable} onReclass={shopArena.handlePrepReclass}
        />
      )}

      {chapter.showStoryIntro && !chapter.showPreparation && chapter.activeScreen === 'none' && (
        <DialogueBox
          dialogues={chapter.currentDialogues.opening} title={`📜 ${chapter.currentChapter.name}`} themeColor="blue" actionButtonText="⚔️ Start Battle"
          summaryBox={
            <div style={{ backgroundColor: '#1e293b', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #f59e0b', fontSize: '13px' }}>
              <strong style={{ color: '#fbbf24' }}>Victory Objective:</strong> {chapter.chapterObjective.description}.<br />
              <span style={{ color: '#ef4444' }}>Defeat if {chapter.lordName} falls in battle.</span>
            </div>
          }
          onConfirm={() => chapter.setShowStoryIntro(false)} onSkip={() => chapter.setShowStoryIntro(false)}
        />
      )}

      {chapter.activeVillageDialogue && (
        <DialogueBox
          dialogues={chapter.activeVillageDialogue.lines} title={`🏡 ${chapter.activeVillageDialogue.villageName.toUpperCase()}`} themeColor="amber" actionButtonText="Continue ➔"
          summaryBox={<div style={{ padding: '10px 14px', backgroundColor: '#451a03', border: '1px solid #d97706', borderRadius: '8px', color: '#fef08a', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>🎁 {chapter.activeVillageDialogue.rewardText}</div>}
          onConfirm={() => chapter.setActiveVillageDialogue(null)} onSkip={() => chapter.setActiveVillageDialogue(null)}
        />
      )}

      {chapter.chapterOutcome === 'victory' && (
        <DialogueBox
          dialogues={chapter.currentDialogues.ending} title="🏆 STAGE CLEAR!" themeColor="green"
          actionButtonText={chapter.nextChapterId ? `⚔️ Advance to ${chapters[chapter.nextChapterId]?.name ?? chapter.nextChapterId} ➔` : '🔄 Continue / Restart Chapter ➔'}
          onConfirm={() => {
            if (chapter.nextChapterId) chapter.loadChapter(chapter.nextChapterId, [...chapter.extendedUnits, ...chapter.reserveUnits]);
            else chapter.handleRestartChapter();
          }}
        />
      )}

      {chapter.chapterOutcome === 'defeat' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#7f1d1d', border: '2px solid #ef4444', borderRadius: '12px', padding: '28px', maxWidth: '460px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.8)' }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#fca5a5', fontSize: '24px' }}>💀 GAME OVER</h2>
            <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#fee2e2', marginBottom: '20px' }}>
              Prince Marth has fallen in battle...<br />The kingdom of Altea has lost all hope.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => chapter.handleLoad()} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>📂 Load Last Save</button>
              <button onClick={chapter.handleRestartChapter} style={{ padding: '10px 20px', backgroundColor: '#475569', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>🔄 Restart Chapter</button>
            </div>
          </div>
        </div>
      )}

      {chapter.activeScreen === 'title' && (
        <TitleScreen
          onStartNewGame={() => chapter.setActiveScreen('book_select')}
          onOpenSaveSlots={() => { chapter.setSaveSlotsMode('load'); chapter.setActiveScreen('save_slots'); }}
          onOpenWorldMap={() => chapter.setActiveScreen('world_map')} onContinueGame={() => chapter.setActiveScreen('none')}
          isMuted={feedback.isMuted} onToggleMute={feedback.handleToggleMute} difficulty={chapter.difficulty} onDifficultyChange={chapter.setDifficulty}
        />
      )}

      {chapter.activeScreen === 'book_select' && (
        <BookSelectModal
          onSelectBook={(bookId) => {
            if (bookId === 'book1') { chapter.loadChapter('chapter_01'); chapter.setActiveScreen('world_map'); }
            else alert('Book 2: The Mystery of the Emblem (Hardin Chronicles) is currently in development!');
          }}
          onClose={() => chapter.setActiveScreen('none')}
        />
      )}

      {chapter.activeScreen === 'save_slots' && (
        <SaveSlotsModal
          mode={chapter.saveSlotsMode}
          onSelectLoad={(data) => { chapter.applyLoadedSnapshot(data); chapter.setActiveScreen('none'); }}
          onConfirmSave={async (slotId) => { await chapter.handleSave(slotId); chapter.setActiveScreen('none'); }}
          onNewGameAtSlot={async (slotId) => {
            chapter.loadChapter('chapter_01');
            const snapshot = buildNewGameSnapshot('chapter_01', defaultRNG.getSeed());
            if (!snapshot) feedback.showNotice('Failed to start a new game.');
            else {
              const ok = await saveGameState(snapshot, slotId);
              feedback.showNotice(ok ? `✓ New game started and saved to ${slotId.toUpperCase()}!` : 'Failed to save the new game.');
            }
            chapter.setActiveScreen('world_map');
          }}
          onClose={() => chapter.setActiveScreen('none')}
        />
      )}

      {chapter.activeScreen === 'world_map' && (
        <WorldMapModal
          currentChapterId={chapter.currentChapterId}
          onSelectChapter={(chapterId) => {
            if (chapter.loadChapter(chapterId)) chapter.setActiveScreen('none');
          }}
          onDeployBattle={() => chapter.setActiveScreen('none')}
          onClose={() => chapter.setActiveScreen('none')}
        />
      )}

      {feedback.pendingLevelUp && (
        <LevelUpModal
          unit={feedback.pendingLevelUp.unit} oldLevel={feedback.pendingLevelUp.oldLevel}
          newLevel={feedback.pendingLevelUp.newLevel} statGains={feedback.pendingLevelUp.statGains}
          onClose={() => feedback.setPendingLevelUp(null)}
        />
      )}
    </>
  );
};
