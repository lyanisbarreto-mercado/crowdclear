/* Decision review, comparison text, and score, derived only from run records and final stats. No DOM access. */
(function (root) {
  const sim = typeof module !== 'undefined' && module.exports ? require('./simulation') : root.CrowdSimulation;
  const LABELS = {
    'clear-hazard': 'Clear hazard · Exit',
    'open-exit': 'Open door · Exit',
    redirect: 'Redirect crowd · Exit',
    calm: 'Reassure guest'
  };
  const secs = ticks => `${(ticks * sim.DT).toFixed(1)} s`;
  function targetLabel(action, target) {
    return action === 'calm' ? `#${target}` : String(target);
  }
  function result(state) {
    const { evacuated, remaining, panicking } = sim.stats(state);
    // Successful calms: person was targeted and is no longer panicking at end.
    const calmedIds = new Set();
    for (const c of state.commands) {
      if (c.action !== 'calm') continue;
      const person = state.people.find(p => p.id === Number(c.target));
      if (person && !person.panic) calmedIds.add(person.id);
    }
    return {
      evacuated, remaining, ticks: state.tick,
      peakQueue: state.peak.size, peakExit: state.peak.exit,
      calmed: calmedIds.size, panicking: panicking ?? 0
    };
  }
  function outcome(r) {
    const queue = r.peakExit ? ` Longest line: ${r.peakQueue} people at Exit ${r.peakExit}.` : '';
    const panic = (r.calmed || r.panicking)
      ? ` Calmed ${r.calmed || 0} panicking guest(s); ${r.panicking || 0} still panicking.`
      : '';
    return (r.remaining
      ? `Time is up. ${r.evacuated} people got out. ${r.remaining} are still inside.`
      : `All ${r.evacuated} people got out in ${secs(r.ticks)}.`) + queue + panic;
  }
  function timelineEntries(commands) {
    if (!commands.length) return [{ time: '', label: 'No actions taken.', line: 'No actions taken.' }];
    return commands.map(c => {
      const time = secs(c.tick);
      const label = `${LABELS[c.action] || c.action} ${targetLabel(c.action, c.target)}`;
      return { time, label, line: `${time}  ${label}` };
    });
  }
  function timeline(commands) {
    return timelineEntries(commands).map(entry => entry.line);
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
      : (stats.panicking > 0
        ? 'Next time, reassure panicking guests (mic or Hold Reassure), clear the blocked door early, then send people to open exits.'
        : 'Next time, clear the blocked door early. Open it, then send people to open exits.');
    return { seconds, exits, score: stats.evacuated + (stats.remaining === 0 ? seconds : 0), message, tip };
  }
  const average = list => list.reduce((a, b) => a + b, 0) / list.length;
  // Presage readings are session-only; empty drill log means the sensor never produced a steady sample.
  function vitals(log = {}) {
    const practice = log.practice || [];
    const drill = log.drill || [];
    if (!drill.length) return 'Breathing (Presage): not enough steady readings during the drill.';
    const during = `${Math.round(average(drill))} /min during the drill`;
    return `Breathing (Presage): ${practice.length ? `${Math.round(average(practice))} /min in practice, ` : ''}${during}.`;
  }
  // One report for laptop results/review and the headset score panel.
  function report({ result: r, score: s, total, commands = [], vitalsText = '' }) {
    const peak = r.peakExit ? `Longest line: ${r.peakQueue} people at Exit ${r.peakExit}` : '';
    const entries = timelineEntries(commands);
    // Laptop <dd> values; metrics/scoreLines reuse the same strings so VR cannot drift.
    const values = {
      evacuated: `${r.evacuated} / ${total}`,
      time: `${s.seconds} seconds`,
      exits: `${s.exits}`,
      calmed: `${r.calmed}`,
      panicking: `${r.panicking}`,
      score: `${s.score}`
    };
    const metrics = [
      `People out: ${values.evacuated}`,
      `Time left: ${values.time}`,
      `Open exits: ${values.exits}`,
      `Calmed: ${values.calmed}`,
      `Still panicking: ${values.panicking}`,
      `Score: ${values.score}`
    ];
    const actionLines = entries[0]?.line === 'No actions taken.'
      ? ['Actions: none']
      : ['Actions:', ...entries.map(entry => entry.line)];
    return {
      headline: s.message,
      tip: s.tip,
      outcome: outcome(r),
      peak,
      values,
      metrics,
      timeline: entries,
      vitals: vitalsText,
      // Compact brief for the left VR instruction panel after the drill.
      briefLines: [
        'Drill complete',
        s.message,
        `People out: ${values.evacuated}`,
        `Calmed: ${values.calmed}`,
        `Still panicking: ${values.panicking}`,
        'Score panel is on your right.',
        vitalsText
      ].filter(Boolean),
      // Full analytics for the expandable VR score panel (mirrors laptop).
      scoreLines: [
        s.message,
        ...metrics,
        peak,
        s.tip,
        outcome(r),
        ...actionLines,
        vitalsText
      ].filter(Boolean)
    };
  }
  const api = { result, outcome, timeline, timelineEntries, alternative, comparison, score, vitals, report };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CrowdReview = api;
})(typeof window === 'undefined' ? globalThis : window);
