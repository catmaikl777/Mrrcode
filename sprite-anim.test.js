const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/index.html', 'utf8');
for (const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  new vm.Script(match[1]);
}
const lookup = source.match(/function spriteByName\(name\)\{[\s\S]*?\n\}/);
const registration = source.match(/  N\('spriteAnim',\(a\)=>\{[^\n]+\}\);/);
assert.ok(lookup && registration, 'spriteAnim registration and sprite lookup exist');
const drawn = [];
let now = 1000;
const sheet = {name: 'имя', img: {complete: true, naturalWidth: 64, naturalHeight: 32}};
const context = {
  state: {sprites: [sheet]},
  Engine: {camera: {x: 0, y: 0}, startTime: 1000},
  performance: {now: () => now},
  gctx: {drawImage: (...args) => drawn.push(args), imageSmoothingEnabled: true},
  numArg: (value, fallback = 0) => value == null ? fallback : Number(value),
  drawPlaceholder: () => { throw new Error('unexpected missing sprite placeholder'); },
  N: (name, fn) => { context.anim = fn; }
};
vm.createContext(context);
const helper = source.match(/function drawSpriteFrame\([\s\S]*?\n\}/)[0];
vm.runInContext(helper + '\n' + lookup[0] + '\n' + registration[0], context);
assert.equal(context.spriteByName('имя.png'), sheet);
assert.equal(context.spriteByName('имя'), sheet);
assert.equal(context.spriteByName('другое.png'), null);
const args = ['имя.png', 320, 150, 64, 32, 32, 32, 8];
for (const elapsed of [0, 124, 125, 249, 250]) {
  now = 1000 + elapsed;
  context.anim(args);
}
assert.deepEqual(drawn.map(d => [d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8]]), [
  [0, 0, 32, 32, 320, 150, 64, 32],
  [0, 0, 32, 32, 320, 150, 64, 32],
  [32, 0, 32, 32, 320, 150, 64, 32],
  [32, 0, 32, 32, 320, 150, 64, 32],
  [0, 0, 32, 32, 320, 150, 64, 32]
]);
assert.equal(context.gctx.imageSmoothingEnabled, false);
const exportLookup = source.match(/function spriteImage\(name\)\{[^\n]+\}/);
assert.ok(exportLookup, 'export uses sprite image lookup');
const exported = {images: {'имя': sheet.img}};
vm.createContext(exported);
vm.runInContext(exportLookup[0], exported);
assert.equal(exported.spriteImage('имя.png'), sheet.img);
console.log('spriteAnim: PNG lookup, 8 fps frame sequence, 32x32 source and 64x32 destination passed');
