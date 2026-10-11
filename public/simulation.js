/* Shared deterministic simulation: no rendering or wall-clock dependencies. */
(function (root) {
  const DT = 0.1;
  const DURATION = 60;
  const EXIT_X = { A: -8, B: 0, C: 8 };
  const EXITS = Object.keys(EXIT_X);
  const REDIRECT_COOLDOWN = 50; // ticks: staff need 5 s to move one group before taking the next order
  const SPACING = 0.65; // metres between people standing in an exit's line
  const PERSONAL_SPACE = 0.55; // metres; closer pairs step apart instead of walking through each other
  const CALM_QUEUE = 10; // beyond this many waiting, each extra person slows the exit
  const CRUSH_DELAY = 0.05; // seconds added to the release interval per extra waiting person
  function createState({ blockedExit = null, hazardTick = null } = {}) {
    if (hazardTick !== null && (!Number.isInteger(hazardTick) || hazardTick < 100 || hazardTick > 200)) throw new Error("Hazard must occur between 10 and 20 seconds");
    if (blockedExit !== null && !Object.hasOwn(EXIT_X, blockedExit)) throw new Error("Unknown exit");
    // The hazard tick doubles as the scenario seed: it also picks the exit most people head for, so the
    // hazard (which hits the busiest exit) lands on different exits across drills while replays stay exact.
    const familiar = hazardTick === null ? 'A' : EXITS[hazardTick % EXITS.length];
    const other = EXITS[(EXITS.indexOf(familiar) + 2) % EXITS.length];
    return {
      tick: 0, blockedExit, hazardTick, hazard: hazardTick === null ? blockedExit : null,
      open: hazardTick !== null ? { A: true, B: true, C: true } : blockedExit ? Object.fromEntries(Object.keys(EXIT_X).map(e => [e, e !== blockedExit])) : { A: true, B: false, C: true }, redirected: false, lastRedirect: null,
      cooldown: { A: 0, B: 0, C: 0 }, commands: [], redirectReady: 0, peak: { size: 0, exit: null },
      people: Array.from({ length: 30 }, (_, id) => ({
        id, x: -7 + (id % 6) * 2.5, z: 1 + Math.floor(id / 6) * 1.3,
        exit: id < 24 ? familiar : other, evacuated: false
      }))
    };
  }
  function act(state, action, target = 'B') {
    if (!Object.hasOwn(EXIT_X, target)) return false;
    if (action === 'clear-hazard' && state.hazard === target) {
      state.hazard = null;
    } else if (action === 'open-exit' && !state.open[target] && state.hazard !== target) {
      state.open[target] = true;
    } else if (action === 'redirect' && state.open[target] && state.hazard !== target && state.lastRedirect !== target && state.tick >= state.redirectReady) {
      const candidates = state.people.filter(p => !p.evacuated && p.exit !== target && (state.hazardTick !== null || state.blockedExit !== null || p.exit === 'A'));
      if (!candidates.length) return false;
      candidates.filter((_, i) => i % 2 === 0).forEach(p => { p.exit = target; });
      state.redirected = true;
      state.lastRedirect = target;
      state.redirectReady = state.tick + REDIRECT_COOLDOWN;
    } else return false;
    state.commands.push({ tick: state.tick, action, target });
    return true;
  }
  function step(state, schedule = []) {
    // Trigger before commands at this tick, so reaction commands replay consistently.
    if (state.hazardTick !== null && state.tick === state.hazardTick) {
      const queues = stats(state).queues;
      const exit = state.blockedExit || Object.keys(EXIT_X).reduce((best, e) => queues[e] > queues[best] ? e : best, 'A');
      state.blockedExit = exit;
      state.hazard = exit;
      state.open[exit] = false;
      state.lastRedirect = null;
      state.redirectReady = state.tick;
    }
    schedule.filter(c => c.tick === state.tick).forEach(c => act(state, c.action, c.target));
    state.tick++;
    for (const exit of EXITS) {
      state.cooldown[exit] = Math.max(0, state.cooldown[exit] - DT);
      const queue = state.people.filter(p => !p.evacuated && p.exit === exit);
      // People standing at their place in the line, as opposed to still walking toward it.
      const crowd = queue.filter((p, rank) => Math.hypot(EXIT_X[exit] - p.x, -10 + rank * SPACING - p.z) < 0.5).length;
      if (crowd > state.peak.size) state.peak = { size: crowd, exit };
      if (!state.open[exit] || state.hazard === exit) continue;
      queue.forEach((p, rank) => {
        const dx = EXIT_X[exit] - p.x;
        const dz = -10 + rank * SPACING - p.z;
        const distance = Math.hypot(dx, dz);
        const movement = Math.min(distance, 2.4 * DT);
        if (distance) { p.x += dx / distance * movement; p.z += dz / distance * movement; }
      });
      const first = queue[0];
      if (first && Math.hypot(first.x - EXIT_X[exit], first.z + 10) < 0.25 && !state.cooldown[exit]) {
        first.evacuated = true;
        state.cooldown[exit] = 1.8 + CRUSH_DELAY * Math.max(0, crowd - CALM_QUEUE);
      }
    }
    separate(state);
    return state;
  }
  // Fixed pair order keeps the push deterministic, so replays still reproduce exactly. A few passes,
  // because fixing one close pair can push another pair together.
  function separate(state) {
    const present = state.people.filter(p => !p.evacuated);
    for (let pass = 0; pass < 3; pass++) for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        const a = present[i], b = present[j];
        const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (!d || d >= PERSONAL_SPACE) continue;
        const push = (PERSONAL_SPACE - d) / 2 / d;
        a.x -= dx * push; a.z -= dz * push;
        b.x += dx * push; b.z += dz * push;
      }
    }
  }
  function stats(state) {
    const evacuated = state.people.filter(p => p.evacuated).length;
    const queues = Object.fromEntries(Object.keys(EXIT_X).map(exit => [exit,
      state.people.filter(p => !p.evacuated && p.exit === exit).length]));
    return { evacuated, remaining: state.people.length - evacuated, queues,
      seconds: Math.max(0, DURATION - state.tick * DT) };
  }
  function isDone(state) {
    return state.tick >= DURATION / DT || state.people.every(p => p.evacuated);
  }
  // Bump when step/act behavior changes so saved runs are not replayed against different rules.
  const VERSION = 5;
  const api = { VERSION, DT, DURATION, REDIRECT_COOLDOWN, createState, act, step, stats, isDone };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CrowdSimulation = api;
})(typeof window === 'undefined' ? globalThis : window);
