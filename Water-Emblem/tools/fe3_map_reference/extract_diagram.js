// Extract the terrain grid of one FE3 chapter diagram from chirimenzeyo.ari-jigoku.com.
//
// Usage (browser, no file download needed):
//   1. Open the diagram image itself, e.g.
//      https://chirimenzeyo.ari-jigoku.com/fire_emblem/03_monsyou/MAP/map1_01.png
//   2. Read the legend under the grid (screenshot) and fill CHAPTER_COLORS below
//      only for colours whose meaning differs per chapter (see README.md).
//   3. Paste this whole file into the console (or a JS tool) on that page.
//   4. The result is JSON: { width, height, rows, unknown }. `unknown` must be
//      empty; otherwise add the missing colour after checking the legend.
//
// Same-origin rule: run it on the diagram page, so the canvas is not tainted.

(async () => {
  // Colours that mean the same thing on every Book 1 diagram checked so far
  // (ch1-3, 2026-11-17). Key = most frequent RGB hex inside a cell.
  const BASE_COLORS = {
    dbbd81: 'road', // 道
    c4d79b: 'plains', // 平原
    '00b050': 'forest', // 森
    '76933c': 'mountain', // 山
    '84673c': 'peak', // 高い山
    '0070c0': 'sea', // 海
    '595959': 'wall', // 壁・建物
    f2f2f2: 'castle', // 城
    a6a6a6: 'gate', // 城門 (grey/green stripes)
    '808080': 'fort', // 砦 (grey/green stripes)
    f79646: 'house', // 民家
    fc426e: 'shop', // 店・施設
    fd5e1f: 'village', // 村門 (orange/yellow stripes)
  };
  // Per-chapter colours: CHECK THE LEGEND OF THIS IMAGE. Example:
  //   chapter 1: { cfbda5: 'rubble' }            // がれき
  //   chapter 2: { cfbda5: 'bridge', '00b0f0': 'river' } // 橋, 川
  const CHAPTER_COLORS = {};

  const img = document.images[0];
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const at = (x, y) => (y * canvas.width + x) * 4;
  const hex = (x, y) => {
    const i = at(x, y);
    return ((1 << 24) | (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]).toString(16).slice(1);
  };
  const isLine = (x, y) => {
    const i = at(x, y);
    return data[i] < 40 && data[i + 1] < 60 && data[i + 2] < 120;
  };

  // Grid lines: full-width dark rows, and columns that span most of the grid height.
  const rowCount = [];
  for (let y = 0; y < canvas.height; y++) {
    let n = 0;
    for (let x = 0; x < canvas.width; x++) if (isLine(x, y)) n++;
    rowCount.push(n);
  }
  const maxRow = Math.max(...rowCount);
  const rowLines = rowCount.flatMap((n, y) => (n >= maxRow * 0.95 ? [y] : []));
  const span = rowLines[rowLines.length - 1] - rowLines[0];
  const colLines = [];
  for (let x = 0; x < canvas.width; x++) {
    let n = 0;
    for (let y = 0; y < canvas.height; y++) if (isLine(x, y)) n++;
    if (n >= span * 0.5) colLines.push(x);
  }

  const colors = { ...BASE_COLORS, ...CHAPTER_COLORS };
  const rows = [];
  const unknown = {};
  for (let r = 0; r < rowLines.length - 1; r++) {
    const row = [];
    for (let c = 0; c < colLines.length - 1; c++) {
      const count = {};
      for (let y = rowLines[r] + 1; y < rowLines[r + 1]; y++) {
        for (let x = colLines[c] + 1; x < colLines[c + 1]; x++) {
          const v = hex(x, y);
          count[v] = (count[v] || 0) + 1;
        }
      }
      const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
      const terrain = colors[top];
      if (!terrain) unknown[`${c},${r}`] = top;
      row.push(terrain ?? `?${top}`);
    }
    rows.push(row);
  }
  const result = { width: colLines.length - 1, height: rowLines.length - 1, rows, unknown };
  console.log(JSON.stringify(result));
  return JSON.stringify(result);
})();
