/* Decision review, comparison text, and score, derived only from run records and final stats. No DOM access. */
(function (root) {
  const sim = typeof module !== 'undefined' && module.exports ? require('./simulation') : root.CrowdSimulation;
  const LABELS = { 'clear-hazard': 'Started clearing Exit', 'open-exit': 'Opened Exit', redirect: 'Sent people to Exit' };
  const secs = ticks => `${(ticks * sim.DT).toFixed(1)} s`;
  function result(state) {
    const { evacuated, remaining } = sim.stats(state);
    return { evacuated, remaining, ticks: state.tick, peakQueue: state.peak.size, peakExit: state.peak.exit };
  }
  function outcome(r) {
    const queue = r.peakExit ? ` Longest line: ${r.peakQueue} people at Exit ${r.peakExit}.` : '';
    return (r.remaining
      ? `Time is up. ${r.evacuated} people got out. ${r.remaining} are still inside.`
      : `All ${r.evacuated} people got out in ${secs(r.ticks)}.`) + queue;
  }
  function timeline(commands) {
    return commands.length ? commands.map(c => `${secs(c.tick)} · ${LABELS[c.action]} ${c.target}`) : ['No actions taken.'];
  }
  function alternative(commands, index, tick) {
    return commands.map((c, i) => (i === index ? { ...c, tick } : c));
  }
  function difference(original, alt) {
    if (original.remaining || alt.remaining) {
      const d = alt.evacuated - original.evacuated;
      return d ? `The new run got ${Math.abs(d)} ${d > 0 ? 'more' : 'fewer'} people out.` : 'Both runs got the same number of people out.';
    }
    const d = original.ticks - alt.ticks;
    return d ? `Everyone got out ${secs(Math.abs(d))} ${d > 0 ? 'sooner' : 'later'} in the new run.` : 'Everyone got out at the same time in both runs.';
  }
  function comparison(run, original, alt, rejected) {
    const reproduced = original.ticks === run.result.ticks && original.evacuated === run.result.evacuated;
    return [
      reproduced ? 'Your original run replayed exactly.' : 'Warning: replaying your original decisions did not reproduce the recorded result.',
      `Original: ${outcome(original)}`,
      `New run: ${outcome(alt)}`,
      difference(original, alt),
      rejected ? `${rejected} action(s) could not happen at the new time. Clear the exit, then open it, then send people there.` : ''
    ].filter(Boolean);
  }
  // Reward people evacuated and a completion-time bonus; door count is informational.
  function score(stats, open) {
    const seconds = Math.floor(stats.seconds);
    const exits = Object.values(open).filter(Boolean).length;
    const message = stats.remaining === 0 ? (seconds >= 30 ? 'Outstanding!' : 'Great work!') : 'Try again';
    const tip = stats.remaining === 0
      ? 'Everyone got out. Try another drill.'
      : 'Next time, clear the blocked door early. Open it, then send people to open exits.';
    return { seconds, exits, score: stats.evacuated + (stats.remaining === 0 ? seconds : 0), message, tip };
  }
  const api = { result, outcome, timeline, alternative, comparison, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CrowdReview = api;
})(typeof window === 'undefined' ? globalThis : window);
