const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function parseVec(attr) {
  const [x, y, z] = attr.trim().split(/\s+/).map(Number);
  return { x, y, z };
}

test('VR UI is world-fixed on the staff post, not on the camera or hands', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../public/game.js'), 'utf8');
  assert.match(html, /id="vr-rail-left"/);
  assert.match(html, /id="vr-rail-right"/);
  assert.doesNotMatch(html, /position="0 1 -1"/, 'no front rail bar across the view');

  // Post + HUD must live in the scene graph, not under #camera / laser-controls / #rig.
  const cameraBlock = html.match(/id="camera"[\s\S]*?<\/a-entity>\s*<a-entity laser-controls/);
  assert.ok(cameraBlock, 'camera entity block must exist');
  assert.doesNotMatch(cameraBlock[0], /id="vr-ui"/, 'vr-ui is not parented under the camera');
  assert.doesNotMatch(html, /laser-controls[\s\S]{0,400}id="vr-ui"/, 'vr-ui is not on a hand controller');

  const post = html.match(/id="vr-post"[^>]*position="([^"]+)"/);
  const ui = html.match(/id="vr-ui"[^>]*position="([^"]+)"[^>]*rotation="([^"]+)"/);
  const panelBlock = html.match(/id="vr-panel"[\s\S]*?id="vr-navigation"/);
  const score = html.match(/id="vr-score"\s+position="([^"]+)"/);
  const details = html.match(/id="vr-score-details"[^>]*position="([^"]+)"/);
  assert.ok(post && ui && panelBlock && score && details, 'vr-post, vr-ui, panel+nav, and score cluster must exist');

  const postPos = parseVec(post[1]);
  const uiPos = parseVec(ui[1]);
  const uiRot = parseVec(ui[2]);
  const scorePos = parseVec(score[1]);
  const detailsPos = parseVec(details[1]);

  assert.deepEqual(postPos, { x: 0, y: 6, z: 13 }, 'staff post sits at the VR spawn');
  assert.ok(uiPos.x <= -0.5, `HUD should sit further left on the post, got x=${uiPos.x}`);
  assert.ok(uiPos.y - 1.9 / 2 > 1.075, 'instruction panel bottom clears the railing');
  assert.ok(uiPos.z < -1, 'HUD sits beyond the front rail posts');
  assert.ok(uiRot.y >= 15, `HUD should yaw toward the player, got y-rot=${uiRot.y}`);
  assert.ok(scorePos.y < 0, 'score toggle stacks under the instruction card');
  assert.ok(detailsPos.y > 0, 'score details expand above the toggle');
  assert.match(panelBlock[0], /id="vr-navigation"/, 'nav buttons parent under the instruction panel');
  assert.match(js, /vr-ui'\)\.setAttribute\('visible',\s*true\)/, 'enter-vr shows the HUD');
  assert.match(js, /y:\s*1\.6/, 'enter-vr resets laptop overhead camera to eye height');
  assert.match(js, /vrCopy/, 'VR copy mirrors laptop steps with point/speak verbs');
  assert.match(js, /el\('vr-navigation'\)\.append/, 'VR nav meshes append onto the panel');
  assert.match(html, /id="vr-cooldown"/, 'VR panel has a cooldown overlay');
  assert.match(html, /id="door-target-b"[^>]*depth="2"/, 'door hitboxes leave lobby pedestrians selectable');
  assert.match(html, /id="vr-analysis"/, 'post-drill analysis panel sits in the center');
  assert.match(html, /id="vr-compare"/, 'side-by-side compare panel sits on the right');
  assert.match(html, /id="vr-compare-btn"/, 'VR can start the side-by-side replay');
  assert.match(html, /id="vr-compare-minus"/, 'VR has a -5s jump control');
  assert.match(html, /id="vr-compare-plus"/, 'VR has a +5s jump control');
  assert.match(html, /id="compare-when"/, 'laptop compare uses a 0-60s when slider');
  assert.match(html, /Play side by side/, 'VR CTA is not the old five-seconds-earlier copy');
  assert.match(js, /mode !== 'compare'/, 'middle analysis panel hides during replay');
  assert.match(js, /compareBest|fillCompareAnalysis/, 'best vs current analysis is ready before replay');
});
