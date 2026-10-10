/* Decision review, comparison text, and score, derived only from run records and final stats. No DOM access. */
(function (root) {
  const sim = typeof module !== 'undefined' && module.exports ? require('./simulation') : root.CrowdSimulation;
  const LABELS = { 'clear-hazard': 'Cleared the hazard at Exit', 'open-exit': 'Opened Exit', redirect: 'Redirected crowd to Exit' };
  const secs = ticks => `${(ticks * sim.DT).toFixed(1)} s`;
  function result(state) {
    const { evacuated, remaining } = sim.stats(state);
    return { evacuated, remaining, ticks: state.tick };
  }
  function outcome(r) {
    return r.remaining
      ? `Time ran out after ${secs(r.ticks)}. ${r.evacuated} of ${r.evacuated + r.remaining} people evacuated; ${r.remaining} still inside.`
      : `All ${r.evacuated} people evacuated in ${secs(r.ticks)}.`;
  }
  function timeline(commands) {
    return commands.length ? commands.map(c => `${secs(c.tick)} · ${LABELS[c.action]} ${c.target}`) : ['No actions taken during the drill.'];
  }
  function alternative(commands, index, tick) {
    return commands.map((c, i) => (i === index ? { ...c, tick } : c));
  }
  function difference(original, alt) {
    if (original.remaining || alt.remaining) {
      const d = alt.evacuated - original.evacuated;
      return d ? `The alternative evacuated ${Math.abs(d)} ${d > 0 ? 'more' : 'fewer'} people.` : 'Both evacuated the same number of people.';
    }
    const d = original.ticks - alt.ticks;
    return d ? `The alternative cleared the venue ${secs(Math.abs(d))} ${d > 0 ? 'sooner' : 'later'}.` : 'Both cleared the venue at the same time.';
  }
  function comparison(run, original, alt, rejected) {
    const reproduced = original.ticks === run.result.ticks && original.evacuated === run.result.evacuated;
    return [
      reproduced ? 'Your original run replayed exactly.' : 'Warning: replaying your original decisions did not reproduce the recorded result.',
      `Original: ${outcome(original)}`,
      `Alternative: ${outcome(alt)}`,
      difference(original, alt),
      rejected ? `${rejected} scheduled action(s) could not happen at the new time. An exit must be cleared before it opens, and open before people can be redirected to it.` : ''
    ].filter(Boolean);
  }
  // Score = (evacuated + whole seconds remaining) × usable open exits, as agreed in BRAND.md.
  function score(stats, open) {
    const seconds = Math.floor(stats.seconds);
    const exits = Object.values(open).filter(Boolean).length;
    const message = stats.remaining === 0 ? (seconds >= 30 ? 'Outstanding!' : 'Great work!') : 'Keep building your skills!';
    const tip = stats.remaining === 0
      ? 'You helped everyone reach an exit. Try another drill to practice a different hazard.'
      : 'You are learning the controls. Next time, try clearing and opening the blocked exit early, then spread the crowd across open routes.';
    return { seconds, exits, score: (stats.evacuated + seconds) * exits, message, tip };
  }
  const api = { result, outcome, timeline, alternative, comparison, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CrowdReview = api;
})(typeof window === 'undefined' ? globalThis : window);
