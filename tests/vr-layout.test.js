const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function parseVec(attr) {
  const [x, y, z] = attr.trim().split(/\s+/).map(Number);
  return { x, y, z };
}

test('VR UI sits at chest/rail height with nav on the panel plane', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../public/game.js'), 'utf8');
  assert.match(html, /id="vr-rail-left"/);
  assert.match(html, /id="vr-rail-right"/);
  assert.doesNotMatch(html, /position="0 1 -1"/, 'no front rail bar across the view');

  const ui = html.match(/id="vr-ui"\s+position="([^"]+)"/);
  const panelBlock = html.match(/id="vr-panel"[\s\S]*?id="vr-navigation"/);
  const score = html.match(/id="vr-score"\s+position="([^"]+)"/);
  const details = html.match(/id="vr-score-details"[^>]*position="([^"]+)"/);
  assert.ok(ui && panelBlock && score && details, 'vr-ui, panel+nav, and score cluster must exist');

  const uiPos = parseVec(ui[1]);
  const scorePos = parseVec(score[1]);
  const detailsPos = parseVec(details[1]);

  // Overlook gaze looks slightly down — UI rides the rail line, not above the head.
  assert.ok(uiPos.y >= 0.9 && uiPos.y <= 1.25, `vr-ui should be chest/rail height, got y=${uiPos.y}`);
  assert.ok(uiPos.z <= -0.9 && uiPos.z >= -1.4, `vr-ui should sit just in front of the post, got z=${uiPos.z}`);
  assert.ok(scorePos.x > 0, 'score cluster stays on the right');
  assert.ok(detailsPos.y > 0, 'score details expand above the toggle');
  assert.match(panelBlock[0], /id="vr-navigation"/, 'nav buttons parent under the instruction panel');
  assert.match(js, /y:\s*1\.6/, 'enter-vr resets laptop overhead camera to eye height');
  assert.match(js, /vrCopy/, 'VR copy mirrors laptop steps with point/speak verbs');
  assert.match(js, /el\('vr-navigation'\)\.append/, 'VR nav meshes append onto the panel');
});
