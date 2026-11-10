/* האקדמיה של רוני · progress store (localStorage) */
window.Store = (() => {
  const KEY = 'roni-academy:v1';
  const blank = () => ({
    v: 1,
    profile: { name: 'רוני', coins: 0, boat: '⛵', boats: ['⛵'] },
    settings: { sfx: true, voice: true, autoRead: true },
    streak: { days: 0, last: null },
    subjects: {},
    created: Date.now()
  });

  let data = load();

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.v === 1) {
        const b = blank();
        return { ...b, ...d, profile: { ...b.profile, ...d.profile }, settings: { ...b.settings, ...d.settings } };
      }
    } catch (e) {}
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }

  function subject(id) {
    return data.subjects[id] ||= { games: {}, leitner: {}, exams: [], answered: 0 };
  }
  function game(sid, gid, init = {}) {
    const s = subject(sid);
    return s.games[gid] ||= JSON.parse(JSON.stringify(init));
  }

  const today = () => new Date().toLocaleDateString('en-CA');
  function touchStreak() {
    const t = today(), s = data.streak;
    if (s.last === t) return;
    const y = new Date(Date.now() - 864e5).toLocaleDateString('en-CA');
    s.days = s.last === y ? s.days + 1 : 1;
    s.last = t;
  }

  /* Leitner: box 1..5. correct moves up, wrong drops to 1 */
  function record(sid, qid, correct) {
    const s = subject(sid);
    const l = s.leitner[qid] ||= { box: 1, right: 0, wrong: 0 };
    if (correct) { l.right++; l.box = Math.min(5, l.box + 1); }
    else { l.wrong++; l.box = 1; }
    l.last = Date.now();
    s.answered++;
    touchStreak();
    save();
  }
  function box(sid, qid) { return subject(sid).leitner[qid]?.box || 0; }

  /* 0..1 – average knowledge of a pool (unseen = 0) */
  function mastery(sid, qids) {
    if (!qids.length) return 0;
    const L = subject(sid).leitner;
    return qids.reduce((a, id) => a + (L[id] ? (L[id].box - 1) / 4 : 0), 0) / qids.length;
  }
  function mistakes(sid, qids) {
    const L = subject(sid).leitner;
    return qids.filter(id => L[id] && L[id].wrong > 0 && L[id].box <= 2);
  }

  function addCoins(n) { data.profile.coins = Math.max(0, data.profile.coins + n); save(); }

  function exportCode() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  }
  function importCode(code) {
    const d = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!d || d.v !== 1) throw new Error('bad code');
    data = d; save();
  }
  function reset() { data = blank(); save(); }

  /* where the player is right now, so a refresh lands on the same screen & step */
  function setResume(r) { data.resume = { ...r, at: Date.now() }; save(); }
  function getResume(page) {
    const r = data.resume;
    return r && r.page === page && Date.now() - r.at < 7 * 864e5 ? r : null;
  }
  function clearResume(page) { if (!page || data.resume?.page === page) { delete data.resume; save(); } }

  return {
    get data() { return data; },
    get settings() { return data.settings; },
    save, subject, game, record, box, mastery, mistakes, addCoins, exportCode, importCode, reset, setResume, getResume, clearResume
  };
})();
