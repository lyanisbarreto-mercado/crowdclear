/* Shared deterministic simulation: no rendering or wall-clock dependencies. */
(function (root) {
  const DT = 0.1;
  const DURATION = 90;
  const EXIT_X = { A: -8, B: 0, C: 8 };
  function createState({ blockedExit = null } = {}) {
    if (blockedExit !== null && !Object.hasOwn(EXIT_X, blockedExit)) throw new Error("Unknown exit");
    return {
      tick: 0, blockedExit, hazard: blockedExit,
      open: blockedExit ? Object.fromEntries(Object.keys(EXIT_X).map(e => [e, e !== blockedExit])) : { A: true, B: false, C: true }, redirected: false, lastRedirect: null,
      cooldown: { A: 0, B: 0, C: 0 }, commands: [],
      people: Array.from({ length: 30 }, (_, id) => ({
        id, x: -7 + (id % 6) * 2.5, z: 1 + Math.floor(id / 6) * 1.3,
        exit: id < 24 ? 'A' : 'C', evacuated: false
      }))
    };
  }
  function act(state, action, target = 'B') {
    if (!Object.hasOwn(EXIT_X, target)) return false;
    if (action === 'clear-hazard' && state.hazard === target) {
      state.hazard = null;
    } else if (action === 'open-exit' && !state.open[target] && state.hazard !== target) {
      state.open[target] = true;
    } else if (action === 'redirect' && state.open[target] && state.hazard !== target && state.lastRedirect !== target) {
      const candidates = state.people.filter(p => !p.evacuated && p.exit !== target && (state.blockedExit !== null || p.exit === 'A'));
      if (!candidates.length) return false;
      candidates.filter((_, i) => i % 2 === 0).forEach(p => { p.exit = target; });
      state.redirected = true;
      state.lastRedirect = target;
    } else return false;
    state.commands.push({ tick: state.tick, action, target });
    return true;
  }
  function step(state) {
    state.tick++;
    for (const exit of Object.keys(EXIT_X)) {
      state.cooldown[exit] = Math.max(0, state.cooldown[exit] - DT);
      if (!state.open[exit] || state.hazard === exit) continue;
      const queue = state.people.filter(p => !p.evacuated && p.exit === exit);
      queue.forEach((p, rank) => {
        const dx = EXIT_X[exit] - p.x;
        const dz = -10 + rank * 0.65 - p.z;
        const distance = Math.hypot(dx, dz);
        const movement = Math.min(distance, 2.4 * DT);
        if (distance) { p.x += dx / distance * movement; p.z += dz / distance * movement; }
      });
      const first = queue[0];
      if (first && Math.hypot(first.x - EXIT_X[exit], first.z + 10) < 0.25 && !state.cooldown[exit]) {
        first.evacuated = true;
        state.cooldown[exit] = 1.8;
      }
    }
    return state;
  }
  function stats(state) {
    const evacuated = state.people.filter(p => p.evacuated).length;
    const queues = Object.fromEntries(Object.keys(EXIT_X).map(exit => [exit,
      state.people.filter(p => !p.evacuated && p.exit === exit).length]));
    return { evacuated, remaining: state.people.length - evacuated, queues,
      seconds: Math.max(0, DURATION - state.tick * DT) };
  }
  const api = { DT, DURATION, createState, act, step, stats };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CrowdSimulation = api;
})(typeof window === 'undefined' ? globalThis : window);
