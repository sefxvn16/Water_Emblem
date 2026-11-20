#!/usr/bin/env node
// Water Emblem gate guard: stops an AI (or a person) from editing the gate, the hooks or the tests
// in order to make a check pass. Runs in the git hooks AND in CI, where no local setting can switch it off.
// No dependencies; Node 18+ and git only.
//
//   node .studio/guard.mjs [--base <ref>] [--rev <ref>]
//
// --base  baseline to compare against (default: HEAD locally, origin/main in CI)
// --rev   compare that commit instead of the working tree (CI uses the pushed commit)
//
// HARD BLOCK: any change to the gate machinery itself
//   .studio/**, .githooks/**, .github/workflows/**, Game_Design/features.lock.json
// HARD BLOCK: tests weakened — a test file deleted, fewer it()/test() cases, fewer expect() assertions,
//   or more .skip/.only/.todo than the baseline.
// Adding tests and assertions is always allowed.
//
// The owner, and only the owner, bypasses a hard block by running the command with WE_GATE_CHANGE_OK=1.
// That bypass is printed loudly and does NOT work in CI (GITHUB_ACTIONS), so a tampered gate still fails there.
// Exit 0 = OK, 1 = blocked, 2 = usage/config error.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// `features.lock.json` là danh mục cơ chế đã duyệt (PLAN mục 173). Nó phải nằm trong nhóm này:
// nếu AI tự thêm id vào đó thì test khóa danh mục hết tác dụng, vì cách qua test là sửa danh mục.
const MACHINERY = [/^\.studio\//, /^\.githooks\//, /^\.github\/workflows\//, /^Game_Design\/features\.lock\.json$/];
// scope.json là bản khai báo phạm vi, mỗi việc một lần, nên ai làm việc cũng phải ghi được;
// nó bị `done.mjs scope` kiểm riêng. last-gate.json là sổ ghi của máy, không theo dõi trong git.
const MACHINERY_EXEMPT = ['.studio/scope.json', '.studio/last-gate.json'];
const TEST_FILE = /(^|\/)tests?\/|\.(test|spec)\.[cm]?[jt]sx?$|__snapshots__\//;

function git(args, { allowFail = false } = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    if (allowFail) return null;
    throw new Error(`git ${args.join(' ')}: ${(r.stderr || '').trim()}`);
  }
  return r.stdout;
}

function parseArgs(argv) {
  const a = { base: null, rev: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') a.base = argv[++i];
    else if (argv[i] === '--rev') a.rev = argv[++i];
  }
  return a;
}

function pickBase(explicit) {
  // Ở máy: so với HEAD, tức là so với đúng những gì đang chuẩn bị commit. Nếu so với main thì sau lần
  // đầu đổi cổng, MỌI commit sau trên nhánh đó đều bị chặn, và người làm sẽ học cách dùng --no-verify.
  // Trong CI: so với main, để chủ dự án thấy mọi thay đổi cổng của cả nhánh trong PR.
  const local = !process.env.GITHUB_ACTIONS ? ['HEAD'] : ['origin/main', 'main'];
  const candidates = explicit ? [explicit] : local;
  for (const c of candidates) {
    const sha = git(['rev-parse', '--verify', '--quiet', `${c}^{commit}`], { allowFail: true });
    if (sha) return { ref: c, sha: sha.trim() };
  }
  return null;
}

/** Content of a path at a ref, or null when absent. */
function showAt(ref, rel) {
  const r = spawnSync('git', ['show', `${ref}:${rel}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : null;
}

function currentContent(root, rev, rel) {
  if (rev) return showAt(rev, rel);
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

const count = (text, re) => (text.match(re) || []).length;

export function testMetrics(text) {
  return {
    cases: count(text, /\b(?:it|test)\s*(?:\.\s*each\s*(?:`|\())?\s*\(/g),
    asserts: count(text, /\bexpect\s*\(/g),
    skips: count(text, /\b(?:describe|it|test)\s*\.\s*(?:skip|only|todo)\b|\b(?:xit|xdescribe)\s*\(/g),
  };
}

/** Reasons a test file counts as weakened. */
export function weakened(before, after) {
  if (before === null) return [];
  if (after === null) return ['file bị xóa'];
  const b = testMetrics(before);
  const a = testMetrics(after);
  const out = [];
  if (a.cases < b.cases) out.push(`số test giảm ${b.cases} -> ${a.cases}`);
  if (a.asserts < b.asserts) out.push(`số expect() giảm ${b.asserts} -> ${a.asserts}`);
  if (a.skips > b.skips) out.push(`thêm .skip/.only/.todo (${b.skips} -> ${a.skips})`);
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const top = git(['rev-parse', '--show-toplevel'], { allowFail: true });
  if (!top) throw new Error('not inside a git repository');
  const root = top.trim();
  const base = pickBase(args.base);
  const say = (s) => process.stdout.write(`${s}\n`);
  say('# guard: chống tự sửa cổng kiểm và test');
  if (!base) {
    say(`- SKIP không tìm được mốc so sánh (${args.base || 'origin/main, main'}); guard không kết luận được`);
    say('\nGuard: SKIP');
    return 0;
  }
  const headRef = args.rev || null;
  const diffArgs = ['diff', '--name-status', base.sha];
  if (headRef) diffArgs.push(headRef);
  diffArgs.push('--');
  const diff = git(diffArgs, { allowFail: true }) || '';
  const changed = diff.split('\n').filter(Boolean).map((l) => {
    const parts = l.split('\t');
    return { status: parts[0], rel: parts[parts.length - 1] };
  });

  const blocks = [];
  // File mới chưa được git theo dõi không hiện trong diff; nếu nó nằm trong cổng kiểm thì vẫn phải chặn,
  // nếu không thì thêm một "gate.mjs" giả hoặc một hook mới sẽ lọt qua cho tới khi commit.
  if (!headRef) {
    const untracked = (git(['ls-files', '--others', '--exclude-standard'], { allowFail: true }) || '')
      .split('\n').filter(Boolean);
    for (const rel of untracked) {
      if (MACHINERY_EXEMPT.includes(rel)) continue;
      if (MACHINERY.some((re) => re.test(rel))) blocks.push(`${rel}: thêm file vào cổng kiểm (chưa theo dõi) — chỉ chủ dự án được đổi`);
    }
  }
  for (const { status, rel } of changed) {
    if (MACHINERY_EXEMPT.includes(rel)) continue;
    if (MACHINERY.some((re) => re.test(rel))) {
      blocks.push(`${rel}: sửa cổng kiểm (${status}) — chỉ chủ dự án được đổi`);
      continue;
    }
    if (TEST_FILE.test(rel)) {
      const before = showAt(base.sha, rel);
      const after = currentContent(root, headRef, rel);
      for (const why of weakened(before, after)) blocks.push(`${rel}: test bị làm yếu — ${why}`);
    }
  }

  say(`- mốc so sánh: ${base.ref} ${base.sha.slice(0, 12)}; ${changed.length} file thay đổi`);
  for (const b of blocks) say(`- BLOCK ${b}`);
  if (!blocks.length) { say('\nGuard: PASS'); return 0; }

  const ci = !!process.env.GITHUB_ACTIONS;
  if (process.env.WE_GATE_CHANGE_OK === '1' && !ci) {
    say('\n- WARN WE_GATE_CHANGE_OK=1: chủ dự án đã cho phép các thay đổi trên ở máy này.');
    say('  AI không được tự đặt biến này. CI vẫn chặn, nên thay đổi cổng phải được chủ dự án duyệt trong PR.');
    say('\nGuard: PASS (bỏ qua theo lệnh chủ dự án)');
    return 0;
  }
  say('\nCác thay đổi trên làm yếu hoặc vô hiệu cổng kiểm, nên không được tự ý thực hiện.');
  say('Cần đổi thật: báo chủ dự án, nêu lý do, chờ chủ duyệt. Không tự đặt WE_GATE_CHANGE_OK.');
  say('\nGuard: BLOCK');
  return 1;
}

// Chỉ chạy khi được gọi trực tiếp, để test import được testMetrics/weakened.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    process.exitCode = main();
  } catch (e) {
    console.error(`guard CONFIG-ERROR: ${e.message}`);
    process.exitCode = 2;
  }
}
