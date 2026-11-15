const fs = require('fs');

const grid = [
  // 0: y = 0
  ['sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea'],
  // 1: y = 1
  ['sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'mountain', 'mountain', 'peak', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea'],
  // 2: y = 2
  ['sea', 'sea', 'plains', 'fort', 'plains', 'plains', 'forest', 'mountain', 'peak', 'peak', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'plains', 'plains', 'plains', 'plains', 'plains', 'village', 'plains', 'sea', 'sea', 'sea'],
  // 3: y = 3
  ['sea', 'plains', 'plains', 'plains', 'plains', 'forest', 'mountain', 'mountain', 'peak', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'plains', 'plains', 'forest', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'sea', 'sea'],
  // 4: y = 4
  ['sea', 'plains', 'plains', 'plains', 'gate', 'forest', 'mountain', 'mountain', 'sea', 'sea', 'sea', 'sea', 'sea', 'plains', 'bridge', 'plains', 'sea', 'sea', 'plains', 'plains', 'plains', 'plains', 'forest', 'plains', 'plains', 'plains', 'plains', 'plains', 'sea', 'sea'],
  // 5: y = 5
  ['sea', 'plains', 'plains', 'plains', 'plains', 'plains', 'mountain', 'sea', 'sea', 'sea', 'sea', 'sea', 'bridge', 'plains', 'plains', 'plains', 'sea', 'sea', 'plains', 'forest', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'sea', 'sea'],
  // 6: y = 6
  ['sea', 'plains', 'plains', 'plains', 'plains', 'plains', 'mountain', 'sea', 'sea', 'sea', 'river', 'river', 'plains', 'plains', 'plains', 'river', 'sea', 'plains', 'plains', 'plains', 'plains', 'forest', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'sea', 'sea'],
  // 7: y = 7
  ['sea', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'sea', 'sea', 'river', 'river', 'plains', 'plains', 'plains', 'bridge', 'river', 'river', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'forest', 'plains', 'plains', 'plains', 'sea', 'sea'],
  // 8: y = 8
  ['sea', 'plains', 'forest', 'village', 'plains', 'plains', 'plains', 'sea', 'river', 'river', 'plains', 'plains', 'forest', 'plains', 'plains', 'river', 'plains', 'plains', 'forest', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'sea', 'sea'],
  // 9: y = 9
  ['sea', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'bridge', 'bridge', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'forest', 'plains', 'fort', 'plains', 'plains', 'plains', 'plains', 'sea', 'sea'],
  // 10: y = 10
  ['sea', 'sea', 'plains', 'fort', 'plains', 'plains', 'river', 'river', 'plains', 'plains', 'forest', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'forest', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'sea', 'sea'],
  // 11: y = 11
  ['sea', 'sea', 'sea', 'plains', 'plains', 'river', 'river', 'plains', 'plains', 'plains', 'plains', 'plains', 'forest', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'forest', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'sea', 'sea', 'sea'],
  // 12: y = 12
  ['sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea', 'sea']
];

const elevations = [
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1,  1,  1,  2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1,  0,  0,  0,  0,  0,  1,  2,  2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,  0,  0,  0,  0,  0,  0,  0, -1, -1, -1],
  [-1,  0,  0,  0,  0,  0,  1,  1,  2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0, -1, -1],
  [-1,  0,  0,  0,  1,  0,  1,  1, -1, -1, -1, -1, -1,  0,  0,  0, -1, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, -1, -1],
  [-1,  0,  0,  0,  0,  0,  1, -1, -1, -1, -1, -1,  0,  0,  0,  0, -1, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, -1, -1],
  [-1,  0,  0,  0,  0,  0,  1, -1, -1, -1, -1, -1,  0,  0,  0, -1, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, -1, -1],
  [-1,  0,  0,  0,  0,  0,  0, -1, -1, -1, -1,  0,  0,  0,  0, -1, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, -1, -1],
  [-1,  0,  0,  0,  0,  0,  0, -1, -1, -1,  0,  0,  0,  0,  0, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, -1, -1],
  [-1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, -1, -1],
  [-1, -1,  0,  0,  0,  0, -1, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, -1, -1],
  [-1, -1, -1,  0,  0, -1, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
];

const units = [
  { id: 'marth', x: 24, y: 5 },
  { id: 'caeda', x: 25, y: 5 },
  { id: 'jagen', x: 23, y: 4 },
  { id: 'cain', x: 22, y: 7 },
  { id: 'abel', x: 23, y: 7 },
  { id: 'draug', x: 22, y: 3 },
  { id: 'gordin', x: 23, y: 3 },
  { id: 'gazzak', x: 4, y: 4 },
  { id: 'p1', x: 4, y: 0 },
  { id: 'p2', x: 5, y: 0 },
  { id: 'p3', x: 6, y: 0 },
  { id: 'p4', x: 4, y: 1 },
  { id: 'p5', x: 13, y: 4 },
  { id: 'p6', x: 2, y: 5 },
  { id: 'p7', x: 4, y: 6 },
  { id: 'p8', x: 5, y: 6 },
  { id: 'hunter', x: 6, y: 7 },
  { id: 'p9', x: 11, y: 8 },
  { id: 'p10', x: 5, y: 9 },
  { id: 'p11', x: 12, y: 9 },
  { id: 'thief', x: 21, y: 9 },
];

console.log('Grid dimensions:', grid[0].length, 'x', grid.length);
console.log('Elevations dimensions:', elevations[0].length, 'x', elevations.length);

for (const u of units) {
  const t = grid[u.y][u.x];
  const e = elevations[u.y][u.x];
  console.log(`${u.id.padEnd(10)} (${u.x}, ${u.y}) -> terrain: ${t}, elev: ${e}`);
}
