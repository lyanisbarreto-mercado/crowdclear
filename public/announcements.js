/* Spoken announcement lines, shared by the game and scripts/generate-voice.js so captions match the audio. */
(function (root) {
  const lines = { 'drill-start': 'Attention. This is an evacuation drill. Please follow staff directions to the nearest open exit.' };
  for (const exit of ['A', 'B', 'C']) {
    lines[`hazard-${exit}`] = `Attention. Exit ${exit} is blocked. Staff, respond now.`;
    lines[`redirect-${exit}`] = `Attention please. Proceed to Exit ${exit}.`;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = lines;
  else root.CrowdAnnouncements = lines;
})(typeof window === 'undefined' ? globalThis : window);
