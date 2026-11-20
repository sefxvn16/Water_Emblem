// PLAN.md là nguồn sự thật về tiến độ, nên định dạng của nó phải là test, không phải lời nhắc.
// Test này chạy trong Vitest -> trong gate -> trong CI, nên mọi AI đều bị chặn như nhau.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// @ts-expect-error - script cổng viết bằng .mjs thuần, không có khai báo kiểu
import { parsePlan } from '../../../.studio/done.mjs';

type PlanItem = {
  number: number;
  title: string;
  checked: boolean;
  malformed: boolean;
  fields: Record<string, string>;
  line: number;
};

const ROOT = path.resolve(__dirname, '../../..');
const DONE_CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, '.studio/done.json'), 'utf8'));
const PLAN = fs.readFileSync(path.join(ROOT, DONE_CONFIG.plan_file), 'utf8');
const ITEMS: PlanItem[] = parsePlan(PLAN);
const STATUS = /^(PASS|FAIL|ĐANG LÀM|CHƯA LÀM|CHỜ NGƯỜI DÙNG|CHỜ AGENT NỀN):/;
const TOKEN = /\b(DONE-OK|DONE-MANUAL) (\d+) ([0-9a-f]{12}) (\d{4}-\d{2}-\d{2})\b/;

const where = (i: PlanItem) => `${DONE_CONFIG.plan_file}:${i.line} (mục ${i.number})`;

describe('PLAN.md: định dạng phải máy đọc được', () => {
  it('có mục để đọc', () => {
    expect(ITEMS.length).toBeGreaterThan(0);
  });

  it("không mục nào viết ô đánh dấu '[]' (mục như vậy vô hình với mọi trình kiểm)", () => {
    expect(ITEMS.filter((i) => i.malformed).map(where)).toEqual([]);
  });

  it('số mục không trùng nhau', () => {
    const seen = new Map<number, number>();
    const dup: string[] = [];
    for (const i of ITEMS) {
      if (seen.has(i.number)) dup.push(`${where(i)} trùng với dòng ${seen.get(i.number)}`);
      else seen.set(i.number, i.line);
    }
    expect(dup).toEqual([]);
  });

  it("mỗi mục có dòng 'Kết quả:' mở đầu bằng một trạng thái hợp lệ", () => {
    const bad = ITEMS
      .filter((i) => !STATUS.test((i.fields['Kết quả'] || '').trim()))
      .map((i) => `${where(i)}: '${(i.fields['Kết quả'] || '(thiếu)').slice(0, 40)}'`);
    expect(bad).toEqual([]);
  });

  it("mục đánh [x] phải có 'Kết quả: PASS:'", () => {
    const bad = ITEMS
      .filter((i) => i.checked && !/^PASS:/.test((i.fields['Kết quả'] || '').trim()))
      .map(where);
    expect(bad).toEqual([]);
  });

  it('mục chưa đánh [x] không được ghi PASS', () => {
    const bad = ITEMS
      .filter((i) => !i.checked && /^PASS:/.test((i.fields['Kết quả'] || '').trim()))
      .map(where);
    expect(bad).toEqual([]);
  });
});

describe('PLAN.md: mục mới phải có bằng chứng máy kiểm được', () => {
  const enforced = ITEMS.filter((i) => i.number >= DONE_CONFIG.enforce_token_from_item);

  it("'Tiêu chí xong' trích dẫn test: hoặc manual:", () => {
    const bad = enforced
      .filter((i) => !/\b(test|manual):\s*\S/.test(i.fields['Tiêu chí xong'] || ''))
      .map(where);
    expect(bad).toEqual([]);
  });

  it('mục đã xong phải mang token DONE-OK/DONE-MANUAL đúng số mục', () => {
    const bad: string[] = [];
    for (const i of enforced.filter((x) => x.checked)) {
      const m = TOKEN.exec(i.fields['Kết quả'] || '');
      if (!m) bad.push(`${where(i)}: thiếu token (chạy: node .studio/done.mjs check ${i.number})`);
      else if (Number(m[2]) !== i.number) bad.push(`${where(i)}: token ghi mục ${m[2]}`);
    }
    expect(bad).toEqual([]);
  });

  it('file test được trích dẫn phải tồn tại thật', () => {
    const bad: string[] = [];
    for (const i of enforced) {
      const refs = (i.fields['Tiêu chí xong'] || '').matchAll(/\b(test|manual):\s*([^\s,;)]+)/g);
      for (const [, kind, rel] of refs) {
        const found = [rel, path.posix.join('Water-Emblem', rel)].some((c) => fs.existsSync(path.join(ROOT, c)));
        if (!found) bad.push(`${where(i)}: ${kind} '${rel}' không tồn tại`);
      }
    }
    expect(bad).toEqual([]);
  });
});
