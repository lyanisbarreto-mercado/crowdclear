/* Results derived from the finished simulation; no fixture scores. */
window.CrowdReview = {
  result(stats, open) {
    const seconds = Math.floor(stats.seconds);
    const exits = Object.values(open).filter(Boolean).length;
    const score = (stats.evacuated + seconds) * exits;
    const message = stats.remaining === 0 ? (seconds >= 30 ? 'Outstanding!' : 'Great work!') : 'Keep building your skills!';
    const tip = stats.remaining === 0
      ? 'You helped everyone reach an exit. Try another drill to practice a different hazard.'
      : 'You are learning the controls. Next time, try clearing and opening the blocked exit early, then spread the crowd across open routes.';
    return { seconds, exits, score, message, tip };
  },
  show(state, stats) {
    const result = this.result(stats, state.open);
    const set = (id, text) => { document.getElementById(id).textContent = text; };
    set('result-evacuated', `${stats.evacuated} / ${state.people.length}`);
    set('result-time', `${result.seconds} seconds`);
    set('result-exits', `${result.exits}`);
    set('result-score', `${result.score}`);
    set('result-message', result.message);
    set('result-tip', result.tip);
    document.getElementById('results').hidden = false;
  }
};
