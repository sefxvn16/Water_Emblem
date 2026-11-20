// Khóa danh mục cơ chế: cái gì không có trong Game_Design/features.lock.json thì không tồn tại.
// Khóa phạm vi (.studio/scope.json) chặn file mới và file ngoài phạm vi, nhưng không chặn được
// một cơ chế mới nhét vào trong file đã được phép sửa. Test này chặn chỗ đó: nó so BẰNG NHAU
// TUYỆT ĐỐI giữa danh mục và registry thật, nên thêm một skill, một objective hay một nhánh mới
// trong union kiểu nào cũng làm test đỏ. Cách duy nhất để qua là sửa danh mục — một diff một dòng
// mà chủ dự án duyệt. Xem PLAN mục 173.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');
const WE = path.resolve(__dirname, '../..');
const LOCK = JSON.parse(fs.readFileSync(path.join(ROOT, 'Game_Design/features.lock.json'), 'utf8'));

/** Union kiểu viết trên một dòng: export type X = 'a' | 'b'; */
const UNION = /^export type ([A-Za-z][A-Za-z0-9]*) = ('[^';]*'(?:\s*\|\s*'[^';]*')*);/gm;

function tsFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) tsFiles(p, out);
    else if (e.isFile() && e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

function realUnions(): Record<string, string[]> {
  const found: Record<string, string[]> = {};
  for (const file of tsFiles(path.join(WE, 'src/core'))) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(UNION)) {
      const [, name, members] = m;
      if (!name || !members) continue;
      found[name] = members.split('|').map((s) => s.trim().replace(/^'|'$/g, '')).sort();
    }
  }
  return found;
}

const sorted = (a: readonly string[]) => [...a].sort();

describe('khóa danh mục: skill', () => {
  it('skill trong data/skills.json khớp đúng danh mục', () => {
    const real = JSON.parse(fs.readFileSync(path.join(WE, 'data/skills.json'), 'utf8'))
      .skills.map((s: { id: string }) => s.id);
    expect(sorted(real)).toEqual(sorted(LOCK.skills));
  });
});

describe('khóa danh mục: điều kiện thắng', () => {
  it('loại objective trong ChapterObjective khớp đúng danh mục', () => {
    const text = fs.readFileSync(path.join(WE, 'src/core/chapter/types.ts'), 'utf8');
    const line = text.split(/\r?\n/).find((l) => /readonly type:\s*'/.test(l));
    expect(line, "không tìm thấy dòng khai báo loại objective trong ChapterObjective").toBeTruthy();
    const real = [...(line as string).matchAll(/'([a-z_]+)'/g)].flatMap((m) => (m[1] ? [m[1]] : []));
    expect(sorted(real)).toEqual(sorted(LOCK.objective_types));
  });
});

describe('khóa danh mục: union kiểu trong src/core', () => {
  const real = realUnions();

  it('không có union kiểu nào mới mà danh mục chưa biết', () => {
    const extra = Object.keys(real).filter((k) => !(k in LOCK.type_unions)).sort();
    expect(extra, 'union kiểu mới là một nhóm cơ chế mới: phải được chủ dự án duyệt trước').toEqual([]);
  });

  it('không union nào trong danh mục bị xóa khỏi code', () => {
    const missing = Object.keys(LOCK.type_unions).filter((k) => !(k in real)).sort();
    expect(missing).toEqual([]);
  });

  it.each(Object.keys(LOCK.type_unions))('union %s khớp đúng danh mục', (name) => {
    expect(real[name]).toEqual(sorted(LOCK.type_unions[name]));
  });
});
