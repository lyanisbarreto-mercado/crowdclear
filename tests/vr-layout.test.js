const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function parseVec(attr) {
  const [x, y, z] = attr.trim().split(/\s+/).map(Number);
  return { x, y, z };
}

test('VR panels sit above side-rail height and score expands upward', () => {
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

  // Panel center is 1.1 tall → bottom must clear the rail with margin.
  assert.ok(panelPos.y - 0.55 > railTop + 0.35, `panel bottom too low: y=${panelPos.y}`);
  assert.ok(navPos.y > railTop + 0.4, `nav too low: y=${navPos.y}`);
  assert.ok(scorePos.y > railTop + 0.6, `score cluster too low: y=${scorePos.y}`);
  assert.ok(detailsPos.y > 0, 'score details expand above the toggle, not down into the rails');
  assert.ok(panelPos.z > -1, 'panels pull toward the player, not past the front edge');
});
