import { describe, it, expect } from 'vitest';
import { POPUP_DURATION_MS } from '../../src/ui/CombatResultPopup';
import balanceConfig from '../../data/balance.json' with { type: 'json' };

describe('Nâng cấp toàn diện Game-feel (Mục 177)', () => {
  it('thời gian popup hiển thị được rút ngắn xuống 1400ms và cấu hình balance có trọng số né phản đòn & hồi máu', () => {
    // 1. POPUP_DURATION_MS giảm từ 2500ms xuống 1400ms để nhịp độ game mượt mà
    expect(POPUP_DURATION_MS).toBe(1400);
    expect(balanceConfig.popupDurationMs).toBe(1400);

    // 2. Trọng số game-feel và AI an toàn trong balance.json
    expect(balanceConfig.aiWeights.counterFreeBonus).toBe(25);
    expect(balanceConfig.aiWeights.healStaffBaseScore).toBe(40);
    expect(balanceConfig.aiWeights.healPerHpWeight).toBe(2);
  });
});
