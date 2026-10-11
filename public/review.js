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
  // Best vs current drill stats. Tones match CSS: exit/good, stop/bad, send/info, clear/warn, signal/score.
  function compareBest(current, best, currentScore, bestScore) {
    if (!best) {
      return {
        headline: 'No prior best yet — this run is your baseline.',
        rows: [
          { label: 'People out', current: current.evacuated, best: null, tone: 'exit' },
          { label: 'Time left', current: currentScore?.seconds ?? 0, best: null, tone: 'send', unit: 's' },
          { label: 'Calmed', current: current.calmed || 0, best: null, tone: 'open' },
          { label: 'Still panicking', current: current.panicking || 0, best: null, tone: 'stop' },
          { label: 'Score', current: currentScore?.score ?? 0, best: null, tone: 'signal' }
        ],
        note: outcome(current)
      };
    }
    const outDelta = current.evacuated - best.evacuated;
    const scoreDelta = (currentScore?.score ?? 0) - (bestScore?.score ?? 0);
    const note = scoreDelta > 0 ? 'This run beats your best score.'
      : scoreDelta < 0 ? 'Your best run still has the higher score.'
      : outDelta > 0 ? 'This run got more people out than your best.'
      : outDelta < 0 ? 'Your best run got more people out.'
      : 'This run matches your best.';
    return {
      headline: note,
      rows: [
        { label: 'People out', current: current.evacuated, best: best.evacuated, tone: 'exit', better: 'higher' },
        { label: 'Time left', current: currentScore?.seconds ?? 0, best: bestScore?.seconds ?? 0, tone: 'send', unit: 's', better: 'higher' },
        { label: 'Calmed', current: current.calmed || 0, best: best.calmed || 0, tone: 'open', better: 'higher' },
        { label: 'Still panicking', current: current.panicking || 0, best: best.panicking || 0, tone: 'stop', better: 'lower' },
        { label: 'Score', current: currentScore?.score ?? 0, best: bestScore?.score ?? 0, tone: 'signal', better: 'higher' }
      ],
      note: `Best: ${outcome(best)} This run: ${outcome(current)}`
    };
  }
  // Reward people evacuated and a completion-time bonus; door count is informational.
  function score(stats, open) {
    const seconds = Math.floor(stats.seconds);
    const exits = Object.values(open).filter(Boolean).length;
    const message = stats.remaining === 0 ? (seconds >= 30 ? 'Outstanding!' : 'Great work!') : 'Try again';
    const tip = stats.remaining === 0
      ? 'Everyone got out. Try another drill.'
      : (stats.panicking > 0
        ? 'Next time, reassure panicking guests (Reassure on laptop, or speak in VR), clear the blocked door early, then send people to open exits.'
        : 'Next time, clear the blocked door early. Open it, then send people to open exits.');
    return { seconds, exits, score: stats.evacuated + (stats.remaining === 0 ? seconds : 0), message, tip };
  }
  const average = list => list.reduce((a, b) => a + b, 0) / list.length;
  const fieldOf = (list, key) => list.map(s => (typeof s === 'number' ? (key === 'rate' ? s : null) : s?.[key])).filter(v => v != null);
  // Snapshot of camera vitals for one phase (practice or drill). Lower stress = calmer.
  function vitalsSnapshot(samples = []) {
    const rate = fieldOf(samples, 'rate');
    const pulse = fieldOf(samples, 'pulse');
    const amplitude = fieldOf(samples, 'amplitude');
    const stress = fieldOf(samples, 'stress');
    if (!rate.length && !pulse.length && !amplitude.length && !stress.length) return null;
    return {
      rate: rate.length ? average(rate) : null,
      pulse: pulse.length ? average(pulse) : null,
      amplitude: amplitude.length ? average(amplitude) : null,
      stress: stress.length ? average(stress) : null
    };
  }
  function stressOf(snap) {
    if (!snap) return null;
    let total = 0;
    let n = 0;
    if (snap.rate != null) { total += snap.rate / 16; n++; }
    if (snap.pulse != null) { total += snap.pulse / 72; n++; }
    if (snap.stress != null) { total += snap.stress / 50; n++; }
    // Amplitude has no absolute scale; calmerThan compares it only when rates match.
    return n ? total / n : null;
  }
  function calmerThan(a, b) {
    const sa = stressOf(a);
    const sb = stressOf(b);
    if (sa == null && a?.amplitude == null) return false;
    if (sb == null) return true;
    if (sa != null && sa < sb - 0.02) return true;
    if (sa != null && sa > sb + 0.02) return false;
    if (a?.amplitude != null && b?.amplitude != null) return a.amplitude < b.amplitude * 0.98;
    return sa != null && sb == null;
  }
  // 1 = panicky, 10 = calm. Built from webcam breathing/pulse/stress.
  function calmScore(snap) {
    const s = stressOf(snap);
    if (s == null) return null;
    return Math.round(Math.max(1, Math.min(10, 12 - s * 4)));
  }
  function calmLabel(score) {
    if (score == null) return '';
    if (score >= 8) return 'Steady';
    if (score >= 5) return 'Tense';
    return 'Panicky';
  }
  // Presage-only short scale from the webcam. Never crowd/guest calmness.
  function vitals(log = {}, best = null) {
    const practice = vitalsSnapshot(log.practice || []);
    const drill = vitalsSnapshot(log.drill || []) || practice;
    if (!drill) return '';
    const score = calmScore(drill);
    if (score == null) return '';
    const bestScore = calmScore(best);
    let line = `Presage ${score}/10 · ${calmLabel(score)}`;
    if (!best || bestScore == null) line += ' · baseline';
    else if (calmerThan(drill, best)) line += ` · best yet (was ${bestScore}/10)`;
    else if (score === bestScore) line += ` · matches best`;
    else line += ` · best ${bestScore}/10`;
    return line;
  }
  function analysis(r, s, commands = []) {
    const parts = [
      `${r.evacuated} people got out with ${s.seconds} seconds left.`,
      r.peakExit ? `The longest line was ${r.peakQueue} at Exit ${r.peakExit}.` : '',
      (r.calmed || r.panicking)
        ? (!r.panicking && r.calmed
          ? `You calmed every panicking guest you reached (${r.calmed}).`
          : `You calmed ${r.calmed || 0}; ${r.panicking || 0} were still panicking at the end.`)
        : '',
      commands.length
        ? `You took ${commands.length} action${commands.length === 1 ? '' : 's'}. Use the time slider to scrub the side-by-side replay (best vs this run) across the full minute.`
        : 'You took no actions this drill.'
    ];
    return parts.filter(Boolean).join(' ');
  }
  // One report for laptop results/review and the headset panels.
  function report({ result: r, score: s, total, commands = [], vitalsText = '' }) {
    const peak = r.peakExit ? `Longest line: ${r.peakQueue} people at Exit ${r.peakExit}` : '';
    const entries = timelineEntries(commands);
    const analysisText = analysis(r, s, commands);
    // Laptop <dd> values; metrics/scoreLines reuse the same strings so VR cannot drift.
    const values = {
      evacuated: `${r.evacuated} / ${total}`,
      time: `${s.seconds} seconds`,
      calmed: `${r.calmed}`,
      panicking: `${r.panicking}`,
      score: `${s.score}`
    };
    const metrics = [
      `People out: ${values.evacuated}`,
      `Time left: ${values.time}`,
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
      analysis: analysisText,
      values,
      metrics,
      timeline: entries,
      vitals: vitalsText,
      briefLines: [
        'Drill complete',
        s.message,
        'Analysis is in the center panel. Compare is on your right.'
      ].filter(Boolean),
      scoreLines: [
        s.message,
        analysisText,
        ...metrics,
        peak,
        s.tip,
        ...actionLines,
        vitalsText
      ].filter(Boolean)
    };
  }
  const api = {
    result, outcome, timeline, timelineEntries, alternative, comparison, compareBest, score,
    vitals, vitalsSnapshot, calmScore, calmLabel, calmerThan, stressOf, analysis, report
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CrowdReview = api;
})(typeof window === 'undefined' ? globalThis : window);
