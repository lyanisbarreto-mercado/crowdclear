/* Shared deterministic simulation: no rendering or wall-clock dependencies. */
(function (root) {
  const DT = 0.1;
  const DURATION = 60;
  const EXIT_X = { A: -8, B: 0, C: 8 };
  const EXITS = Object.keys(EXIT_X);
  const REDIRECT_COOLDOWN = 50; // ticks: staff need 5 s to move one group before taking the next order
  const CLEAR_DURATION = 40; // ticks: equipment clearing takes four seconds, then the door must be opened
  const POPULATION = 60;
  const SPACING = 0.65; // metres between people standing in an exit's line
  const PERSONAL_SPACE = 0.55; // metres; closer pairs step apart instead of walking through each other
  const CALM_QUEUE = 10; // beyond this many waiting, each extra person slows the exit
  const CRUSH_DELAY = 0.05; // seconds added to the release interval per extra waiting person
  function createState({ blockedExit = null, hazardTick = null, incidentCount = 1, fixedIncidents = [] } = {}) {
    if (hazardTick !== null && (!Number.isInteger(hazardTick) || hazardTick < 100 || hazardTick > 200)) throw new Error("Hazard must occur between 10 and 20 seconds");
    if (blockedExit !== null && !Object.hasOwn(EXIT_X, blockedExit)) throw new Error("Unknown exit");
    if (![1, 2, 3].includes(incidentCount)) throw new Error("Invalid incident count");
    const incidentTicks = hazardTick === null ? [] : [hazardTick];
    for (let i = 1; i < incidentCount && hazardTick !== null; i++) incidentTicks.push(incidentTicks[i - 1] + 100 + ((hazardTick * 37 + i * 17) % 61));
    // The hazard tick doubles as the scenario seed: it also picks the exit most people head for, so the
    // hazard (which hits the busiest exit) lands on different exits across drills while replays stay exact.
    const familiar = hazardTick === null ? 'A' : EXITS[hazardTick % EXITS.length];
    const other = EXITS[(EXITS.indexOf(familiar) + 2) % EXITS.length];
    let seed = (hazardTick ?? 0) + 1;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    return {
      tick: 0, blockedExit, hazardTick, incidentCount, incidentTicks, fixedIncidents, incidents: [], hazards: hazardTick === null && blockedExit ? [blockedExit] : [], clearingExit: null, hazard: hazardTick === null ? blockedExit : null,
      open: hazardTick !== null ? { A: true, B: true, C: true } : blockedExit ? Object.fromEntries(Object.keys(EXIT_X).map(e => [e, e !== blockedExit])) : { A: true, B: false, C: true }, redirected: false, lastRedirect: null,
      cooldown: { A: 0, B: 0, C: 0 }, commands: [], redirectReady: 0, clearingUntil: null, peak: { size: 0, exit: null },
      people: Array.from({ length: POPULATION }, (_, id) => ({
        id, x: -8.1 + (id % 10) * 1.8 + (random() - 0.5) * 1.2,
        z: 1 + Math.floor(id / 10) * 1.45 + (random() - 0.5) * 0.8,
        speed: 1.8 + random() * 1.2, hesitation: 4 + Math.floor(random() * 10), pauseUntil: 0,
        exit: id < POPULATION * 0.8 ? familiar : other, evacuated: false,
        panic: false, heading: random() * Math.PI * 2
      }))
    };
  }
  // Deterministic ~45% calm chance from tick + person id (replay-stable).
  function calmSucceeds(tick, id) {
    return ((Math.imul(tick + 1, 1664525) + Math.imul(id + 1, 1013904223)) >>> 0) % 100 < 45;
  }
  function act(state, action, target = 'B') {
    if (action === 'calm') {
      const id = Number(target);
      const person = state.people.find(p => p.id === id);
      if (!person || person.evacuated || !person.panic) return false;
      state.commands.push({ tick: state.tick, action, target: id });
      if (calmSucceeds(state.tick, id)) {
        person.panic = false;
        person.pauseUntil = state.tick + 5;
      }
      return true;
    }
    if (!Object.hasOwn(EXIT_X, target)) return false;
    if (action === 'clear-hazard' && state.hazards.includes(target) && state.clearingUntil === null) {
      state.clearingUntil = state.tick + CLEAR_DURATION;
      state.clearingExit = target;
    } else if (action === 'open-exit' && !state.open[target] && !state.hazards.includes(target)) {
      state.open[target] = true;
    } else if (action === 'redirect' && state.open[target] && !state.hazards.includes(target) && state.lastRedirect !== target && state.tick >= state.redirectReady) {
      const candidates = state.people.filter(p => !p.evacuated && !p.panic && p.exit !== target && (state.hazardTick !== null || state.blockedExit !== null || p.exit === 'A'));
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
    // Live input at this tick precedes the incident, so scheduled input must too.
    schedule.filter(c => c.tick === state.tick).forEach(c => act(state, c.action, c.target));
    if (state.incidentTicks.includes(state.tick)) {
      const queues = stats(state).queues;
      const candidates = EXITS.filter(e => !state.hazards.includes(e));
      const fixed = state.fixedIncidents.find(e => e.tick === state.tick);
      const exit = fixed?.exit || (state.incidents.length === 0 ? state.blockedExit : null) || candidates.reduce((best, e) => queues[e] > queues[best] ? e : best, candidates[0]);
      if (!exit) return state;
      state.incidents.push({ tick: state.tick, exit });
      if (!state.hazards.includes(exit)) state.hazards.push(exit);
      if (state.incidents.length === 1) state.blockedExit = exit;
      state.hazard = exit;
      state.open[exit] = false;
      state.lastRedirect = null;
      state.redirectReady = state.tick;
      state.people.forEach(p => {
        if (p.evacuated) return;
        if (p.id % 4 === 0) p.pauseUntil = state.tick + p.hesitation;
        if (p.id % 5 === 0) p.panic = true;
      });
    }
    state.tick++;
    if (state.clearingUntil !== null && state.tick >= state.clearingUntil) {
      state.hazards = state.hazards.filter(e => e !== state.clearingExit);
      state.hazard = state.hazards.at(-1) || null;
      state.clearingExit = null;
      state.clearingUntil = null;
    }
    for (const p of state.people) {
      if (p.evacuated || !p.panic || state.tick <= p.pauseUntil) continue;
      if ((state.tick + p.id) % 17 === 0) p.heading = (p.heading + ((state.tick * 0.37 + p.id) % (Math.PI * 2))) % (Math.PI * 2);
      const move = p.speed * DT * 0.55;
      p.x += Math.sin(p.heading) * move;
      p.z += Math.cos(p.heading) * move;
      p.x = Math.max(-9.5, Math.min(9.5, p.x));
      p.z = Math.max(0.5, Math.min(10.5, p.z));
    }
    for (const exit of EXITS) {
      state.cooldown[exit] = Math.max(0, state.cooldown[exit] - DT);
      const queue = state.people.filter(p => !p.evacuated && !p.panic && p.exit === exit);
      // Stable columns prevent people swapping places sideways every time someone leaves.
      const ranks = [0, 0, 0];
      const slots = queue.map(p => ({ p, x: EXIT_X[exit] + [0, -1, 1][p.id % 3] * SPACING,
        z: -10 + ranks[p.id % 3]++ * SPACING }));
      // People standing at their place in the line, as opposed to still walking toward it.
      const crowd = slots.filter(({ p, x, z }) => Math.hypot(x - p.x, z - p.z) < 0.5).length;
      if (crowd > state.peak.size) state.peak = { size: crowd, exit };
      if (!state.open[exit] || state.hazards.includes(exit)) continue;
      slots.forEach(({ p, x, z }) => {
        if (state.tick <= p.pauseUntil) return;
        const dx = x - p.x;
        const dz = z - p.z;
        const distance = Math.hypot(dx, dz);
        const movement = Math.min(distance, p.speed * DT);
        if (distance) { p.x += dx / distance * movement; p.z += dz / distance * movement; }
      });
      const first = slots.find(({ p, x }) => state.tick > p.pauseUntil && Math.hypot(p.x - x, p.z + 10) < 0.25)?.p;
      if (first && !state.cooldown[exit]) {
        first.evacuated = true;
        state.cooldown[exit] = 1.2 + CRUSH_DELAY * Math.max(0, crowd - CALM_QUEUE);
      }
    }
    separate(state);
    return state;
  }
  // Fixed pair order keeps the push deterministic, so replays still reproduce exactly. A few passes,
  // because fixing one close pair can push another pair together.
  function separate(state) {
    const present = state.people.filter(p => !p.evacuated);
    for (let pass = 0; pass < 6; pass++) for (let i = 0; i < present.length; i++) {
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
    const panicking = state.people.filter(p => !p.evacuated && p.panic).length;
    const queues = Object.fromEntries(Object.keys(EXIT_X).map(exit => [exit,
      state.people.filter(p => !p.evacuated && p.exit === exit).length]));
    return { evacuated, remaining: state.people.length - evacuated, panicking, queues,
      seconds: Math.max(0, DURATION - state.tick * DT) };
  }
  function isDone(state) {
    return state.tick >= DURATION / DT || state.people.every(p => p.evacuated);
  }
  // Bump when step/act behavior changes so saved runs are not replayed against different rules.
  const VERSION = 9;
  const api = { VERSION, DT, DURATION, REDIRECT_COOLDOWN, CLEAR_DURATION, POPULATION, createState, act, step, stats, isDone };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CrowdSimulation = api;
})(typeof window === 'undefined' ? globalThis : window);
