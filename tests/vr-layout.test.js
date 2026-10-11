const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function parseVec(attr) {
  const [x, y, z] = attr.trim().split(/\s+/).map(Number);
  return { x, y, z };
}

test('VR tutorial keeps navigation on its panel beyond the rails and score expands upward', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.match(html, /id="vr-rail-left"/);
  assert.match(html, /id="vr-rail-right"/);
  assert.doesNotMatch(html, /position="0 1 -1"/, 'no front rail bar across the view');

  const panel = html.match(/id="vr-panel"\s+position="([^"]+)"/);
  const nav = html.match(/id="vr-navigation"\s+position="([^"]+)"/);
  const score = html.match(/id="vr-score"\s+position="([^"]+)"/);
  const details = html.match(/id="vr-score-details"[^>]*position="([^"]+)"/);
  assert.ok(panel && nav && score && details);

  const railTop = 1.05;
  const panelPos = parseVec(panel[1]);
  const navPos = parseVec(nav[1]);
  const scorePos = parseVec(score[1]);
  const detailsPos = parseVec(details[1]);

  const panelContents = html.match(/id="vr-panel"[^>]*>([\s\S]*?)<\/a-entity>/)[1];
  const panelHeight = Number(panelContents.match(/<a-plane[^>]*height="([^"]+)"/)[1]);
  assert.match(panelContents, /id="vr-text"/);
  assert.match(panelContents, /id="vr-navigation"/, 'navigation shares the tutorial transform');
  assert.ok(panelPos.z < -1, 'tutorial sits beyond the rail ends');
  assert.ok(panelPos.y - panelHeight / 2 > railTop + 0.025, 'tutorial bottom clears the railing');
  assert.ok(Math.abs(navPos.y) + 0.2 + 0.08 < panelHeight / 2, 'both button rows fit on the panel');
  assert.ok(scorePos.y > railTop + 0.6, `score cluster too low: y=${scorePos.y}`);
  assert.ok(detailsPos.y > 0, 'score details expand above the toggle, not down into the rails');

});
