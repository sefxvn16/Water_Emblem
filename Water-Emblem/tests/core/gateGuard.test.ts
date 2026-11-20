// Test cho chính cổng kiểm: .studio/guard.mjs và .studio/done.mjs.
// Cổng chặn việc làm yếu test, nên bản thân nó phải có test, nếu không sửa nó im lặng là lọt.
import { describe, it, expect } from 'vitest';
// @ts-expect-error - script cổng viết bằng .mjs thuần, không có khai báo kiểu
import { testMetrics, weakened } from '../../../.studio/guard.mjs';
// @ts-expect-error - script cổng viết bằng .mjs thuần, không có khai báo kiểu
import { parsePlan, parseRefs, globToRegex } from '../../../.studio/done.mjs';

const SPEC = `
import { test, expect } from 'vitest';
test('a', () => { expect(1).toBe(1); expect(2).toBe(2); });
test('b', () => { expect(3).toBe(3); });
`;

describe('guard: đếm sức mạnh của test', () => {
  it('đếm số test và số expect', () => {
    const m = testMetrics(SPEC);
    expect(m.cases).toBe(2);
    expect(m.asserts).toBe(3);
    expect(m.skips).toBe(0);
  });

  it('đếm .skip, .only và .todo là dấu hiệu bỏ qua test', () => {
    expect(testMetrics("test.skip('a', () => {});").skips).toBe(1);
    expect(testMetrics("it.only('a', () => {});").skips).toBe(1);
    expect(testMetrics("describe.todo('a');").skips).toBe(1);
  });
});

describe('guard: phát hiện test bị làm yếu', () => {
  it('xóa file test là làm yếu', () => {
    expect(weakened(SPEC, null)).toEqual(['file bị xóa']);
  });

  it('bớt một test là làm yếu', () => {
    const after = SPEC.replace("test('b', () => { expect(3).toBe(3); });", '');
    expect(weakened(SPEC, after).join(' ')).toMatch(/số test giảm 2 -> 1/);
  });

  it('bớt một expect là làm yếu dù số test không đổi', () => {
    const after = SPEC.replace(' expect(2).toBe(2);', '');
    expect(weakened(SPEC, after).join(' ')).toMatch(/số expect\(\) giảm 3 -> 2/);
  });

  it('thêm .skip là làm yếu', () => {
    const after = SPEC.replace("test('b'", "test.skip('b'");
    expect(weakened(SPEC, after).join(' ')).toMatch(/thêm \.skip/);
  });

  it('thêm test và thêm expect thì không phải làm yếu', () => {
    const after = `${SPEC}\ntest('c', () => { expect(4).toBe(4); });\n`;
    expect(weakened(SPEC, after)).toEqual([]);
  });

  it('file mới (không có bản gốc) không bị coi là làm yếu', () => {
    expect(weakened(null, SPEC)).toEqual([]);
  });
});

const PLAN = `# Kế hoạch

- [x] 169. Việc đã xong.
  - Tiêu chí xong: test: Water-Emblem/tests/core/a.test.ts > tên test
  - Kết quả: PASS: xong rồi · DONE-OK 169 a1b2c3d4e5f6 2026-11-20

- [ ] 170. Việc đang làm.
  - Tiêu chí xong: manual: docs/shot.png
  - Kết quả: ĐANG LÀM: đang dựng

## Lịch sử

- [x] 5. Mục trong bảng lịch sử, không phải mục thật.
`;

describe('done: đọc PLAN.md', () => {
  it('đọc đúng số mục, trạng thái [x] và các dòng trường', () => {
    const items = parsePlan(PLAN);
    expect(items.map((i: { number: number }) => i.number)).toEqual([169, 170, 5]);
    expect(items[0].checked).toBe(true);
    expect(items[1].checked).toBe(false);
    expect(items[0].fields['Kết quả']).toMatch(/DONE-OK 169 a1b2c3d4e5f6 2026-11-20/);
    expect(items[1].fields['Kết quả']).toMatch(/^ĐANG LÀM:/);
  });

  it('ghi lại số dòng của mục để báo lỗi chỉ đúng chỗ', () => {
    const items = parsePlan(PLAN);
    expect(PLAN.split('\n')[items[0].line - 1]).toContain('169.');
  });
});

describe('scope: khớp đường dẫn với phạm vi đã khai báo', () => {
  it('glob thư mục chỉ khớp file trong thư mục đó', () => {
    const re = globToRegex('Water-Emblem/src/ui/**');
    expect(re.test('Water-Emblem/src/ui/TitleScreen.tsx')).toBe(true);
    expect(re.test('Water-Emblem/src/ui/menu/Deep.tsx')).toBe(true);
    expect(re.test('Water-Emblem/src/core/combat/attack.ts')).toBe(false);
  });

  it('đường dẫn đúng một file không khớp file khác cùng thư mục', () => {
    const re = globToRegex('Water-Emblem/src/App.tsx');
    expect(re.test('Water-Emblem/src/App.tsx')).toBe(true);
    expect(re.test('Water-Emblem/src/AppNew.tsx')).toBe(false);
  });

  it('dấu * một bậc không vượt qua dấu /', () => {
    const re = globToRegex('data/*.json');
    expect(re.test('data/items.json')).toBe(true);
    expect(re.test('data/chapters/ch1.json')).toBe(false);
  });
});

describe('done: đọc bằng chứng trong tiêu chí xong', () => {
  it('đọc test kèm tên test', () => {
    expect(parseRefs('test: Water-Emblem/tests/core/a.test.ts > tên test')).toEqual([
      { kind: 'test', file: 'Water-Emblem/tests/core/a.test.ts', name: 'tên test' },
    ]);
  });

  it('đọc manual và nhiều bằng chứng trong một dòng', () => {
    const refs = parseRefs('(1) test: tests/core/a.test.ts; (2) manual: docs/shot.png');
    expect(refs.map((r: { kind: string }) => r.kind)).toEqual(['test', 'manual']);
    expect(refs[1].file).toBe('docs/shot.png');
  });

  it('tiêu chí không trích dẫn gì thì không có bằng chứng nào', () => {
    expect(parseRefs('Chạy test và gate PASS.')).toEqual([]);
  });
});
