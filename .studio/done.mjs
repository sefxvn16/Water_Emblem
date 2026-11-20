#!/usr/bin/env node
// Water Emblem done-gate: the ONE command every AI and person must use to claim an item done.
// No dependencies; Node 18+ and git only. Works the same for Claude, Antigravity, Muse or a person.
//
//   node .studio/done.mjs scope           check every change is inside the scope declared in .studio/scope.json
//   node .studio/done.mjs gate            run the quality gate and record the result in .studio/last-gate.json
//   node .studio/done.mjs check <item>     verify PLAN item <item> and print the DONE-OK line to paste
//   node .studio/done.mjs audit            verify every finished PLAN item (format + token); used by pre-push
//   node .studio/done.mjs audit --rerun    run the gate first, then audit (the owner's one-command truth check)
//   node .studio/done.mjs audit --all      also report items below enforce_token_from_item
//
// Reads .studio/done.json: plan_file, enforce_token_from_item, integration_branch, ignore_dirty.
// Exit 0 = OK, 1 = not done / problems found, 2 = config or usage error.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const TOKEN_RE = /\b(DONE-OK|DONE-MANUAL) (\d+) ([0-9a-f]{12}) (\d{4}-\d{2}-\d{2})\b/;
const STATUS_RE = /^(PASS|FAIL|ĐANG LÀM|CHƯA LÀM|CHỜ NGƯỜI DÙNG|CHỜ AGENT NỀN):/;
// `[]` (thiếu dấu cách) cũng phải khớp: nếu không, một mục viết sai ô đánh dấu sẽ vô hình với
// mọi trình kiểm và lọt qua mà không ai thấy. Nó được nhận là chưa xong, kèm lỗi định dạng.
const ITEM_RE = /^- \[([ xX]?)\] (\d+)\.\s*(.*)$/;
const FIELD_RE = /^\s+-\s*([^:]{1,40}):\s*(.*)$/;

function git(args, { allowFail = false } = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    if (allowFail) return null;
    throw new Error(`git ${args.join(' ')}: ${(r.stderr || '').trim()}`);
  }
  return r.stdout;
}

function repoRoot() {
  const top = git(['rev-parse', '--show-toplevel'], { allowFail: true });
  if (!top) throw new Error('not inside a git repository');
  return top.trim();
}

function readConfig(root) {
  const file = path.join(root, '.studio', 'done.json');
  if (!fs.existsSync(file)) throw new Error('.studio/done.json not found');
  const c = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    planFile: c.plan_file || 'PLAN.md',
    enforceFrom: Number.isInteger(c.enforce_token_from_item) ? c.enforce_token_from_item : 1,
    integrationBranch: c.integration_branch || 'main',
    ignoreDirty: Array.isArray(c.ignore_dirty) ? c.ignore_dirty : [],
  };
}

/** PLAN.md -> [{ number, title, checked, fields: {name: text}, line }] */
export function parsePlan(text) {
  const items = [];
  const lines = text.split(/\r?\n/);
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const m = ITEM_RE.exec(lines[i]);
    if (m) {
      cur = {
        number: Number(m[2]),
        title: m[3].trim(),
        checked: m[1].toLowerCase() === 'x',
        malformed: m[1] === '',
        fields: {},
        line: i + 1,
      };
      items.push(cur);
      continue;
    }
    if (!cur) continue;
    if (/^#{1,6}\s/.test(lines[i])) { cur = null; continue; }
    const f = FIELD_RE.exec(lines[i]);
    if (f) {
      const key = f[1].trim();
      cur.fields[key] = cur.fields[key] ? `${cur.fields[key]} ${f[2].trim()}` : f[2].trim();
      cur.lastField = key;
    } else if (lines[i].trim() && cur.lastField) {
      // Nối bằng newline, không bằng dấu cách: nếu nối bằng dấu cách thì một 'test: <file> > <tên>'
      // đứng cuối dòng sẽ bắt lan sang dòng tiếp theo và tên test thành sai.
      cur.fields[cur.lastField] += `\n${lines[i].trim()}`;
    }
  }
  return items;
}

/** test:/manual: references inside a done-criterion. */
export function parseRefs(criterion) {
  const refs = [];
  const re = /\b(test|manual):\s*([^\s,;)]+)(?:\s*>\s*([^,;)\n]+))?/g;
  let m;
  while ((m = re.exec(criterion))) refs.push({ kind: m[1], file: m[2].trim(), name: (m[3] || '').trim() });
  return refs;
}

function resolveRef(root, rel) {
  for (const cand of [rel, path.posix.join('Water-Emblem', rel)]) {
    const abs = path.join(root, cand);
    if (fs.existsSync(abs)) return { rel: cand, abs };
  }
  return null;
}

function dirtyFiles(root, cfg) {
  const out = git(['status', '--porcelain', '--untracked-files=no']) || '';
  return out.split('\n').filter(Boolean)
    .map((l) => l.slice(3).trim().replace(/^.* -> /, ''))
    .filter((f) => !cfg.ignoreDirty.some((ig) => (ig.endsWith('/') ? f.startsWith(ig) : f === ig)));
}

// ---------- gate ----------

function runGate(root, cfg) {
  const head = git(['rev-parse', 'HEAD']).trim();
  const dirty = dirtyFiles(root, cfg);
  process.stdout.write('done: running node .studio/gate.mjs ...\n');
  const r = spawnSync('node', ['.studio/gate.mjs'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  process.stdout.write(out.endsWith('\n') ? out : `${out}\n`);
  const resultLine = (out.match(/^Result:\s*(PASS|FAIL)\s*$/m) || [])[1] || null;
  const commands = {};
  const blocks = out.split(/\n## /).slice(1);
  for (const b of blocks) {
    const name = (b.match(/^([a-z]+):/) || [])[1];
    const verdict = (b.match(/^- (PASS|FAIL) \(exit/m) || [])[1];
    if (name && verdict) commands[name] = verdict;
  }
  const ledger = {
    result: resultLine ?? (r.status === 0 ? 'PASS' : 'FAIL'),
    exit_code: r.status,
    head,
    dirty,
    commands,
    at: new Date().toISOString(),
    tail: out.split(/\r?\n/).slice(-25).join('\n'),
  };
  fs.writeFileSync(path.join(root, '.studio', 'last-gate.json'), `${JSON.stringify(ledger, null, 2)}\n`);
  // gate.mjs chỉ in 40 dòng cuối, nên một lần FAIL thường không chẩn đoán được. Giữ nguyên văn
  // toàn bộ output: không có nó thì người đọc báo lỗi phải đoán, và đoán thì dẫn tới ghi PASS khống.
  const logPath = path.join(root, '.studio', 'last-gate.log');
  fs.writeFileSync(logPath, out);
  process.stdout.write(`done: recorded .studio/last-gate.json (result ${ledger.result}, head ${head.slice(0, 12)}, dirty ${dirty.length})\n`);
  process.stdout.write('done: toàn bộ output của gate ở .studio/last-gate.log\n');
  return ledger.result === 'PASS' && r.status === 0 ? 0 : 1;
}

function readLedger(root) {
  const file = path.join(root, '.studio', 'last-gate.json');
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

// ---------- check ----------

/** Problems that stop item <n> from being claimed done. Returns {problems, warnings, kind}. */
function inspectItem(root, cfg, item, ledger, head, dirty) {
  const problems = [];
  const warnings = [];
  const criterion = item.fields['Tiêu chí xong'] || '';
  if (!criterion.trim()) problems.push("thiếu dòng 'Tiêu chí xong:'");
  const refs = parseRefs(criterion);
  if (!refs.length) {
    problems.push("'Tiêu chí xong' phải trích dẫn bằng chứng máy kiểm được: 'test: <đường dẫn>[ > <tên test>]' hoặc 'manual: <đường dẫn ảnh/log trong repo>'");
  }
  for (const ref of refs) {
    const found = resolveRef(root, ref.file);
    if (!found) { problems.push(`${ref.kind}: '${ref.file}' không tồn tại trong repo`); continue; }
    if (ref.kind === 'test' && ref.name) {
      const text = fs.readFileSync(found.abs, 'utf8');
      if (!text.includes(ref.name)) problems.push(`test '${ref.name}' không có trong ${found.rel}`);
    }
    if (!git(['ls-files', '--error-unmatch', found.rel], { allowFail: true })) {
      problems.push(`${ref.kind}: '${found.rel}' chưa được git theo dõi (bằng chứng phải commit)`);
    }
  }
  const hasTest = refs.some((r) => r.kind === 'test');
  if (!ledger) problems.push("chưa có .studio/last-gate.json: chạy 'node .studio/done.mjs gate' trước");
  else {
    if (ledger.result !== 'PASS') problems.push(`gate lần cuối FAIL (${ledger.at}); phải PASS 0 lỗi mới được xác nhận`);
    if (ledger.head !== head) problems.push(`gate chạy ở commit ${String(ledger.head).slice(0, 12)} nhưng HEAD hiện tại là ${head.slice(0, 12)}: chạy lại gate`);
    if (ledger.dirty?.length) problems.push(`gate chạy khi còn file chưa commit: ${ledger.dirty.slice(0, 5).join(', ')}`);
  }
  if (dirty.length) problems.push(`còn file chưa commit: ${dirty.slice(0, 5).join(', ')}${dirty.length > 5 ? ` (+${dirty.length - 5})` : ''}`);
  const base = git(['merge-base', cfg.integrationBranch, 'HEAD'], { allowFail: true });
  if (base) {
    const changed = (git(['diff', '--name-only', base.trim(), '--'], { allowFail: true }) || '').split('\n').filter(Boolean);
    const touched = changed.filter((f) => /^(\.studio\/|\.githooks\/|\.github\/workflows\/)/.test(f) || /(^|\/)tests?\//.test(f) || f.includes('__snapshots__'));
    for (const f of touched) warnings.push(`${f} đã bị sửa so với ${cfg.integrationBranch}: chủ dự án phải xem lại (có thể là sửa test/cổng cho qua)`);
  }
  return { problems, warnings, kind: hasTest ? 'DONE-OK' : 'DONE-MANUAL' };
}

function cmdCheck(root, cfg, arg) {
  const n = Number(arg);
  if (!Number.isInteger(n) || n <= 0) { console.error('usage: node .studio/done.mjs check <số mục PLAN>'); return 2; }
  const items = parsePlan(fs.readFileSync(path.join(root, cfg.planFile), 'utf8'));
  const item = items.find((i) => i.number === n);
  if (!item) { console.error(`done: mục ${n} không có trong ${cfg.planFile}`); return 1; }
  const head = git(['rev-parse', 'HEAD']).trim();
  const { problems, warnings, kind } = inspectItem(root, cfg, item, readLedger(root), head, dirtyFiles(root, cfg));
  console.log(`# done check ${n}: ${item.title}`);
  for (const w of warnings) console.log(`- WARN ${w}`);
  if (problems.length) {
    for (const p of problems) console.log(`- THIẾU ${p}`);
    console.log(`\nKhông đạt: mục ${n} chưa được xác nhận xong. Sửa các điểm trên rồi chạy lại.`);
    return 1;
  }
  const token = `${kind} ${n} ${head.slice(0, 12)} ${new Date().toISOString().slice(0, 10)}`;
  console.log(`- OK tiêu chí có bằng chứng máy kiểm được; gate PASS tại ${head.slice(0, 12)}; cây làm việc sạch`);
  console.log(`\nDán vào dòng Kết quả của mục ${n} trong ${cfg.planFile}:`);
  console.log(`  - Kết quả: PASS: <bằng chứng ngắn> · ${token}`);
  if (kind === 'DONE-MANUAL') console.log('\nLưu ý: mục này chỉ có bằng chứng thủ công; chủ dự án phải mắt thường xác nhận.');
  return 0;
}

// ---------- audit ----------

function cmdAudit(root, cfg, flags) {
  if (flags.has('--rerun')) {
    const code = runGate(root, cfg);
    if (code !== 0) { console.log('\nAudit dừng: gate FAIL, không có mục nào được tính là xong.'); return 1; }
    console.log('');
  }
  const items = parsePlan(fs.readFileSync(path.join(root, cfg.planFile), 'utf8'));
  const head = git(['rev-parse', 'HEAD']).trim();
  const bad = [];
  const warned = [];
  for (const item of items) {
    const result = item.fields['Kết quả'] || '';
    const label = `mục ${item.number} (${cfg.planFile}:${item.line})`;
    if (item.malformed) bad.push(`${label}: ô đánh dấu viết '[]' — phải là '[ ]' hoặc '[x]', nếu không mục bị bỏ qua khi kiểm`);
    if (!item.checked) {
      if (flags.has('--checked-only')) continue;
      if (!result.trim()) bad.push(`${label}: chưa đánh [x] và không có dòng 'Kết quả:' — ghi ĐANG LÀM/FAIL/CHỜ NGƯỜI DÙNG/CHỜ AGENT NỀN`);
      else if (!STATUS_RE.test(result.trim())) bad.push(`${label}: dòng 'Kết quả:' phải mở đầu bằng PASS:/FAIL:/ĐANG LÀM:/CHỜ NGƯỜI DÙNG:/CHỜ AGENT NỀN:`);
      continue;
    }
    if (!/^PASS:/.test(result.trim())) {
      bad.push(`${label}: đánh [x] nhưng dòng 'Kết quả:' không mở đầu bằng 'PASS:'`);
      continue;
    }
    if (item.number < cfg.enforceFrom) {
      if (flags.has('--all')) warned.push(`${label}: mục cũ, không đòi token (ngưỡng ${cfg.enforceFrom})`);
      continue;
    }
    const tok = TOKEN_RE.exec(result);
    if (!tok) { bad.push(`${label}: đánh [x] nhưng không có token DONE-OK/DONE-MANUAL — chạy 'node .studio/done.mjs check ${item.number}'`); continue; }
    if (Number(tok[2]) !== item.number) { bad.push(`${label}: token ghi mục ${tok[2]}, không khớp`); continue; }
    const sha = tok[3];
    // `cat-file -e` khi thành công thì không in gì, nên phải xem exit code chứ không xem stdout:
    // dùng stdout sẽ coi mọi commit có thật là không tồn tại và báo sai mọi token hợp lệ.
    if (spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`]).status !== 0) { bad.push(`${label}: commit ${sha} trong token không tồn tại`); continue; }
    if (spawnSync('git', ['merge-base', '--is-ancestor', sha, head]).status !== 0) {
      bad.push(`${label}: commit ${sha} trong token không nằm trong lịch sử của HEAD`);
      continue;
    }
    const refs = parseRefs(item.fields['Tiêu chí xong'] || '');
    if (!refs.length) { bad.push(`${label}: 'Tiêu chí xong' không còn trích dẫn test:/manual:`); continue; }
    for (const ref of refs) {
      const found = resolveRef(root, ref.file);
      if (!found) { bad.push(`${label}: ${ref.kind} '${ref.file}' đã mất khỏi repo`); continue; }
      if (ref.kind === 'test' && ref.name && !fs.readFileSync(found.abs, 'utf8').includes(ref.name)) {
        bad.push(`${label}: test '${ref.name}' không còn trong ${found.rel}`);
      }
    }
  }
  console.log(`# done audit: ${items.length} mục trong ${cfg.planFile}, ngưỡng token từ mục ${cfg.enforceFrom}`);
  for (const w of warned) console.log(`- note ${w}`);
  for (const b of bad) console.log(`- FAIL ${b}`);
  const ledger = readLedger(root);
  if (!ledger) console.log('- note chưa có .studio/last-gate.json trên máy này (chạy: node .studio/done.mjs gate)');
  else console.log(`- note gate lần cuối: ${ledger.result} tại ${String(ledger.head).slice(0, 12)} (${ledger.at})`);
  console.log(`\nAudit: ${bad.length ? `FAIL (${bad.length} vấn đề)` : 'PASS'}`);
  return bad.length ? 1 : 0;
}

// ---------- scope: chặn làm thêm việc không ai yêu cầu ----------

const ALWAYS_ALLOWED = ['PLAN.md', 'CHECKLIST.md', '.studio/scope.json'];
const CATCH_ALL = ['**', '*', '**/*', '.', './**', '/**'];

/** Glob -> RegExp, cùng cách hiểu như .studio/gate.mjs. */
export function globToRegex(glob) {
  let p = String(glob).replace(/\\/g, '/');
  if (p.endsWith('/')) p += '**';
  let re = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*') {
      if (p[i + 1] === '*') {
        if (p[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 'i');
}

function cmdScope(root, cfg) {
  const file = path.join(root, '.studio', 'scope.json');
  const say = (s) => console.log(s);
  say('# scope: phạm vi đã khai báo cho việc đang làm');
  if (!fs.existsSync(file)) {
    say('- BLOCK chưa có .studio/scope.json: phải khai báo phạm vi TRƯỚC khi sửa code.');
    say('  Mẫu: {"task_id":"<task>","plan_items":[<số mục>],"allow":["<đường dẫn hoặc glob>"]}');
    say('\nScope: BLOCK');
    return 1;
  }
  let scope;
  try { scope = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    say(`- BLOCK .studio/scope.json không đọc được: ${e.message}`);
    say('\nScope: BLOCK');
    return 1;
  }
  const bad = [];
  const items = parsePlan(fs.readFileSync(path.join(root, cfg.planFile), 'utf8'));
  const numbers = new Set(items.map((i) => i.number));
  if (!Array.isArray(scope.plan_items) || !scope.plan_items.length) bad.push("thiếu 'plan_items': việc nào cũng phải thuộc một mục PLAN.md");
  else for (const n of scope.plan_items) if (!numbers.has(n)) bad.push(`'plan_items' có mục ${n} không tồn tại trong ${cfg.planFile}`);
  const allow = Array.isArray(scope.allow) ? scope.allow : [];
  if (!allow.length) bad.push("thiếu 'allow': phải liệt kê file/glob được sửa");
  for (const g of allow) if (CATCH_ALL.includes(String(g).trim())) bad.push(`'allow' có '${g}': phạm vi bắt tất cả không được chấp nhận`);

  const base = git(['merge-base', cfg.integrationBranch, 'HEAD'], { allowFail: true });
  const outside = [];
  const undeclaredNew = [];
  if (!base) bad.push(`không tìm được mốc so sánh với '${cfg.integrationBranch}'`);
  else {
    const rows = (git(['diff', '--name-status', base.trim(), '--'], { allowFail: true }) || '')
      .split('\n').filter(Boolean)
      .map((l) => { const p = l.split('\t'); return { status: p[0], rel: p[p.length - 1] }; });
    const untracked = (git(['ls-files', '--others', '--exclude-standard'], { allowFail: true }) || '')
      .split('\n').filter(Boolean).map((rel) => ({ status: 'A', rel }));
    for (const { status, rel } of [...rows, ...untracked]) {
      if (ALWAYS_ALLOWED.includes(rel) || rel.startsWith('work/')) continue;
      const matched = allow.some((g) => globToRegex(g).test(rel));
      if (!matched) { outside.push(`${rel} (${status})`); continue; }
      // File MỚI phải được khai báo bằng đúng đường dẫn, không được núp dưới glob:
      // chức năng tự bịa thêm hầu như luôn xuất hiện dưới dạng file mới.
      if (status.startsWith('A') && !allow.includes(rel)) undeclaredNew.push(rel);
    }
  }
  for (const b of bad) say(`- BLOCK ${b}`);
  for (const o of outside) say(`- BLOCK ${o}: ngoài phạm vi đã khai báo`);
  for (const n of undeclaredNew) say(`- BLOCK ${n}: file mới phải được ghi đúng đường dẫn trong 'allow'`);
  if (bad.length || outside.length || undeclaredNew.length) {
    say('\nViệc nằm ngoài phạm vi đã khai báo thì không được tự làm, kể cả khi thấy nên làm.');
    say(`Ghi thành mục mới trong ${cfg.planFile}, báo chủ dự án, chờ duyệt, rồi mới mở rộng 'allow'.`);
    say('\nScope: BLOCK');
    return 1;
  }
  say(`- OK task '${scope.task_id || '?'}' , mục ${scope.plan_items.join(', ')}, ${allow.length} đường dẫn được phép`);
  say('\nScope: PASS');
  return 0;
}

// ---------- main ----------

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const root = repoRoot();
  const cfg = readConfig(root);
  if (cmd === 'gate') return runGate(root, cfg);
  if (cmd === 'scope') return cmdScope(root, cfg);
  if (cmd === 'check') return cmdCheck(root, cfg, argv[1]);
  if (cmd === 'audit') return cmdAudit(root, cfg, flags);
  console.error([
    'usage:',
    '  node .studio/done.mjs scope           kiểm thay đổi có nằm trong phạm vi đã khai báo',
    '  node .studio/done.mjs gate            chạy gate và ghi .studio/last-gate.json',
    '  node .studio/done.mjs check <mục>     kiểm một mục PLAN và in token DONE-OK',
    '  node .studio/done.mjs audit [--rerun] [--all] [--checked-only]   kiểm các mục trong PLAN',
  ].join('\n'));
  return 2;
}

// Chỉ chạy khi được gọi trực tiếp, để test import được parsePlan/parseRefs.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    process.exitCode = main();
  } catch (e) {
    console.error(`done CONFIG-ERROR: ${e.message}`);
    process.exitCode = 2;
  }
}
