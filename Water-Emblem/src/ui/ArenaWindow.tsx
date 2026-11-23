import React from 'react';
import arenaDialogues from '../../data/dialogues/arena.json' with { type: 'json' };
import type { ExtendedUnitState } from '../core/data/chapterData';

if (!arenaDialogues || typeof arenaDialogues.welcomePrompt !== 'string') {
  throw new Error('data/dialogues/arena.json failed validation: missing welcomePrompt');
}
import { ARENA_TIERS, type ArenaFightOutcome, type ArenaTier } from '../core/combat/arena';
import { DS_COLORS, primaryButtonStyle, secondaryButtonStyle, sharedPanelStyle } from './designSystem';

interface ArenaWindowProps {
  unitName: string;
  gold: number;
  tier: ArenaTier | null;
  opponent: ExtendedUnitState | null;
  outcome: ArenaFightOutcome | null;
  onSelectTier: (tier: ArenaTier) => void;
  onFight: () => void;
  onFightAgain: () => void;
  onLeave: () => void;
}

/** Arena wager/opponent/result modal (PLAN item 93). Leaving ends the action. */
export const ArenaWindow: React.FC<ArenaWindowProps> = ({
  unitName,
  gold,
  tier,
  opponent,
  outcome,
  onSelectTier,
  onFight,
  onFightAgain,
  onLeave,
}) => {
  const statLine = (entry: ExtendedUnitState) =>
    `HP ${entry.stats.hp}/${entry.stats.maxHp} · Str ${entry.stats.str} · Skl ${entry.stats.skill} · Spd ${entry.stats.spd} · Def ${entry.stats.def} · Res ${entry.stats.res}`;

  const masterQuote = outcome
    ? outcome.won
      ? arenaDialogues.victory.replace('{gold}', ((tier?.wager ?? 0) * 2).toLocaleString())
      : arenaDialogues.defeat
    : opponent && tier
    ? arenaDialogues.matchRules
        .replace('{level}', String(opponent.level))
        .replace('{gold}', (tier.wager * 2).toLocaleString())
    : arenaDialogues.welcomePrompt.replace('{gold}', '500–2,000');

  return (
    <div
      data-testid="arena-window"
      style={{
        ...sharedPanelStyle,
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '420px',
        maxWidth: 'calc(100vw - 16px)',
        zIndex: 1400,
        padding: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold', color: DS_COLORS.goldText, fontSize: '15px' }}>🏟️ ARENA — {unitName}</div>
        <div style={{ color: DS_COLORS.goldText, fontWeight: 'bold' }}>{gold.toLocaleString()} G</div>
      </div>

      <div
        data-testid="arena-speech"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#270808',
          border: '1px solid #dc2626',
          borderRadius: '6px',
          padding: '8px 10px',
          color: '#fecaca',
          fontSize: '12px',
          fontStyle: 'italic',
          marginBottom: '10px',
        }}
      >
        <span style={{ fontSize: '15px', fontStyle: 'normal' }}>📣</span>
        <span>{masterQuote}</span>
      </div>

      {outcome ? (
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: outcome.won ? '#4ade80' : '#f87171', marginBottom: '6px' }}>
            {outcome.won ? 'Victory!' : 'Defeat…'}
          </div>
          <div style={{ color: '#e2e8f0', fontSize: '13px', marginBottom: '4px' }}>
            {outcome.won
              ? `Won ${((tier?.wager ?? 0) * 2).toLocaleString()} G (stake back + profit).`
              : `Lost the ${(tier?.wager ?? 0).toLocaleString()} G wager. ${unitName} walks away with 1 HP.`}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>
            {outcome.rounds} round{outcome.rounds === 1 ? '' : 's'} · +{outcome.expGained} EXP · HP left {outcome.playerAfter.stats.hp}/{outcome.playerAfter.stats.maxHp}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" data-testid="arena-again" onClick={onFightAgain} style={{ ...primaryButtonStyle(), flex: 1, padding: '9px 12px' }}>
              Fight Again
            </button>
            <button type="button" data-testid="arena-leave" onClick={onLeave} style={{ ...secondaryButtonStyle(), padding: '9px 16px' }}>
              Leave
            </button>
          </div>
        </div>
      ) : opponent && tier ? (
        <div>
          <div style={{ color: '#e2e8f0', fontSize: '13px', marginBottom: '4px' }}>
            Wager: <strong style={{ color: DS_COLORS.goldText }}>{tier.wager.toLocaleString()} G</strong> — win to take {(tier.wager * 2).toLocaleString()} G.
          </div>
          <div style={{ backgroundColor: '#450a0a', border: '1.5px solid #ef4444', borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '14px' }}>
              {opponent.unit.name} · Lv.{opponent.level}
            </div>
            <div style={{ color: '#fca5a5', fontSize: '12px' }}>{opponent.weapon?.name ?? 'Unarmed'}</div>
            <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '4px' }}>{statLine(opponent)}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" data-testid="arena-fight" onClick={onFight} style={{ ...primaryButtonStyle(), flex: 1, padding: '9px 12px' }}>
              ⚔️ Fight!
            </button>
            <button type="button" data-testid="arena-leave" onClick={onLeave} style={{ ...secondaryButtonStyle(), padding: '9px 16px' }}>
              Leave
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ color: '#e2e8f0', fontSize: '13px', marginBottom: '10px' }}>
            Place your wager. A bigger wager fields a stronger gladiator — and pays more.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {ARENA_TIERS.map((option) => (
              <button
                key={option.wager}
                type="button"
                data-testid={`arena-wager-${option.wager}`}
                disabled={gold < option.wager}
                onClick={() => onSelectTier(option)}
                style={{
                  ...secondaryButtonStyle(),
                  padding: '10px 12px',
                  justifyContent: 'space-between',
                  opacity: gold < option.wager ? 0.45 : 1,
                  cursor: gold < option.wager ? 'not-allowed' : 'pointer',
                }}
              >
                <span>Wager {option.wager.toLocaleString()} G</span>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Gladiator Lv.+{option.bonus}</span>
              </button>
            ))}
          </div>
          <button type="button" data-testid="arena-leave" onClick={onLeave} style={{ ...secondaryButtonStyle(), width: '100%', padding: '9px 16px' }}>
            Leave
          </button>
        </div>
      )}
    </div>
  );
};
