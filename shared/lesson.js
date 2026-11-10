/* האקדמיה של רוני · interactive lesson player
 * Lesson.play(lesson, {tid, skin, onDone, onExit})
 * Slide types: hero | tap | steps | rings | compare | timeline | choose | treasure | index | mapmaker | check | summary
 * Audio keys: L_<tid>_<i> (slide text), L_<tid>_<i>_<j> (item), L_<tid>_<i>_<j>_<k> (item.lines[k]) */
window.Lesson = (() => {
  const { $, esc, shuffle } = UI;
  const PAL = ['#7b3fe4', '#1d7bd8', '#e0457b', '#18a87a', '#e08a1a', '#5a4ad8', '#c0392b', '#138d9c'];

  function play(lesson, { tid, skin = '', onDone, onExit, onProgress, startAt = 0, seen: seen0 = [], questions = [] } = {}) {
    const slides = lesson.slides;
    const seen = new Set(seen0);
    const progress = () => onProgress && onProgress(idx, [...seen]);
    let idx = 0, ready = false;

    const root = document.createElement('div');
    root.className = 'lesson ' + (skin ? 'skin-' + skin : '');
    root.innerHTML = `<div class="l-head"><button class="icon-btn" data-x aria-label="יציאה">✖</button><span class="lt">${lesson.emoji} ${esc(lesson.title)}</span><span class="chip">📖 שיעור</span></div>
      <div class="l-prog">${slides.map(() => '<i></i>').join('')}</div>
      <div class="l-stage"></div>
      <div class="l-foot"><button class="btn ghost" data-prev>→ הקודם</button><button class="icon-btn" data-replay aria-label="שמיעה חוזרת">🔊</button><button class="btn next" data-next>הבא ←</button></div>`;
    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';
    const stage = $('.l-stage', root), nextBtn = $('[data-next]', root), prevBtn = $('[data-prev]', root);

    const close = () => { Sound.stop(); root.remove(); document.body.style.overflow = ''; };
    $('[data-x]', root).onclick = () => UI.confirmBox('לצאת מהשיעור?', '<p class="muted">אפשר לחזור אליו בכל רגע.</p>', 'כן, לצאת', () => { close(); onExit && onExit(); });

    let talkTimer;
    function say(key, text, cb) {
      const ava = $('.guide .ava', root);
      ava && ava.classList.add('talk');
      clearTimeout(talkTimer);
      Sound.say(key, text, () => { ava && ava.classList.remove('talk'); cb && cb(); });
      talkTimer = setTimeout(() => ava && ava.classList.remove('talk'), 12000);
    }
    function setReady(v = true) {
      ready = v;
      nextBtn.disabled = !v;
      nextBtn.classList.toggle('ready', v);
      if (v && !seen.has(idx)) { seen.add(idx); progress(); }
    }

    function show(i, dir = 1) {
      Sound.stop();
      idx = i;
      progress();
      const s = slides[i];
      const K = `L_${tid}_${i}`;
      root.querySelectorAll('.l-prog i').forEach((b, n) => { b.className = n < i || seen.has(n) ? 'on' : ''; if (n === i) b.className = 'cur'; });
      prevBtn.style.visibility = i ? 'visible' : 'hidden';
      nextBtn.innerHTML = i === slides.length - 1 ? 'סיימתי! 🎉' : 'הבא ←';
      stage.innerHTML = `<div class="l-slide ${dir < 0 ? 'back' : ''}">
          ${s.h ? `<h2 class="l-h">${esc(s.h)}</h2>` : ''}
          ${s.p && window.Book ? `<div style="text-align:center;margin:-2px 0 8px">${Book.chip(s.p, `בספר: עמ' ${s.p}`)}</div>` : ''}
          ${s.t ? `<div class="guide"><div class="ava">${lesson.guide || '🧭'}</div><div class="bub">${esc(s.t)}</div></div>` : ''}
          <div class="body"></div></div>`;
      stage.scrollTop = 0;
      const body = $('.body', stage);
      setReady(false);
      let introDone = !s.t, introCbs = [];
      const fireIntro = () => { if (introDone || idx !== i || !root.isConnected) return; introDone = true; introCbs.splice(0).forEach(f => f()); };
      const api = {
        afterIntro: f => introDone ? setTimeout(f, 200) : introCbs.push(f),
        key: (j, k) => k == null ? `${K}_${j}` : `${K}_${j}_${k}`,
        say, ready: () => setReady(true),
        tell(text, key, cb) { const b = $('.bub', stage); if (b) { b.textContent = text; b.parentElement.animate([{ transform: 'scale(.97)' }, { transform: 'scale(1)' }], { duration: 250 }); } say(key, text, cb); },
        next: () => go(1), seen: seen.has(i), tid, questions
      };
      if (s.t) {
        setTimeout(() => { if (idx === i) say(K, s.t, fireIntro); }, 300);
        setTimeout(fireIntro, 300 + (Store.settings.voice ? s.t.length * 75 + 1200 : 0));
      }
      (R[s.type] || R.hero)(body, s, api);
      if (seen.has(i)) setReady(true);
    }

    function go(d) {
      if (d > 0 && !ready) { Sound.sfx('wrong'); UI.toast('קודם נסיים את מה שבשקופית 😉'); return; }
      Sound.sfx('whoosh');
      if (d > 0 && idx === slides.length - 1) { finish(); return; }
      show(Math.max(0, Math.min(slides.length - 1, idx + d)), d);
    }
    function finish() {
      close();
      Sound.sfx('fanfare'); UI.confetti(120);
      setTimeout(() => Sound.say('lesson_done'), 600);
      onDone && onDone();
    }
    nextBtn.onclick = () => go(1);
    prevBtn.onclick = () => go(-1);
    $('[data-replay]', root).onclick = () => { const s = slides[idx]; if (s.t) say(`L_${tid}_${idx}`, s.t); };
    show(Math.min(startAt, slides.length - 1));
  }

  /* ================= slide renderers ================= */
  const R = {
    hero(body, s, api) {
      body.innerHTML = `<div class="hero-e">${s.e || '✨'}</div>`;
      Sound.sfx('pop');
      setTimeout(api.ready, 700);
    },

    tap(body, s, api) {
      let opened = 0;
      body.innerHTML = `<div class="l-hint">👆 לחצי על כל הכרטיסים <span class="cnt">0/${s.items.length}</span></div>
        <div class="tapgrid">${s.items.map((it, j) => `<button class="fc" data-j="${j}" style="--c:${it.c || PAL[j % PAL.length]}"><div class="in">
          <div class="fa front"><span class="e">${it.e}</span><h4>${esc(it.h)}</h4><small>👆 לחצי</small></div>
          <div class="fa back"><h4>${esc(it.h)}</h4><div>${esc(it.t)}</div></div></div></button>`).join('')}</div>`;
      body.querySelectorAll('.fc').forEach(c => c.onclick = () => {
        const j = +c.dataset.j, it = s.items[j];
        if (!c.classList.contains('open')) {
          c.classList.add('open'); opened++; Sound.sfx('whoosh');
          body.querySelector('.cnt').textContent = `${opened}/${s.items.length}`;
          if (opened === s.items.length) { setTimeout(() => Sound.sfx('star'), 300); api.ready(); }
        }
        api.say(api.key(j), it.t);
      });
    },

    steps(body, s, api) {
      let j = -1;
      body.innerHTML = `<div class="${s.style || ''}"><div class="track">${s.items.map(it => `<span>${it.e}</span>`).join('')}</div>
        <div class="card-slot"></div><div class="center-btn"><button class="btn mint">${esc(s.start || 'בואי נתחיל ⟵')}</button></div></div>`;
      const btn = body.querySelector('.center-btn .btn');
      const step = () => {
        j++;
        const it = s.items[j];
        body.querySelectorAll('.track span').forEach((t, n) => { t.classList.toggle('on', n <= j); t.classList.toggle('cur', n === j); });
        body.querySelector('.card-slot').innerHTML = `<div class="stepcard"><div class="e">${it.e}</div><span class="num">${s.numLabel || 'שלב'} ${j + 1}</span><h4>${esc(it.h)}</h4><p>${esc(it.t)}</p></div>`;
        Sound.sfx(s.style === 'book' ? 'whoosh' : 'pop');
        api.say(api.key(j), it.t);
        if (j === s.items.length - 1) { btn.parentElement.classList.add('hidden'); api.ready(); }
        else btn.textContent = s.nextLabel || 'השלב הבא ⟵';
      };
      btn.onclick = step;
    },

    rings(body, s, api) {
      const n = s.items.length;
      body.innerHTML = `<div class="rings">${s.items.map((it, j) => {
        const size = 26 + j * (74 / (n - 1));
        return `<div class="ring" style="--c:${it.c || PAL[j % PAL.length]};width:${size}%;height:${size}%;z-index:${n - j}"><b>${esc(it.h)}</b>${j === 0 ? `<span class="ce">${it.e}</span>` : ''}</div>`;
      }).join('')}</div><div class="center-btn"><button class="btn mint">${esc(s.start || '🔭 מתחילים')}</button></div>`;
      let j = -1;
      const btn = body.querySelector('.center-btn .btn');
      btn.onclick = () => {
        j++;
        body.querySelectorAll('.ring')[j].classList.add('on');
        Sound.sfx('pop'); api.say(api.key(j), s.items[j].t);
        if (j === n - 1) { btn.parentElement.classList.add('hidden'); api.ready(); }
        else btn.textContent = s.nextLabel || '🔭 התרחקי';
      };
    },

    compare(body, s, api) {
      body.innerHTML = `<div class="cmp-head"><div class="L"><span class="e">${s.left.e}</span>${esc(s.left.h)}</div><div class="R"><span class="e">${s.right.e}</span>${esc(s.right.h)}</div></div>
        <div class="rows"></div><div class="center-btn"><button class="btn mint">✨ ${esc(s.btn || 'הבדל ראשון')}</button></div>`;
      let j = -1;
      const btn = body.querySelector('.center-btn .btn');
      btn.onclick = () => {
        j++;
        const it = s.items[j];
        body.querySelector('.rows').insertAdjacentHTML('beforeend', `<div class="cmp-row"><div class="L">${esc(it.l)}</div><div class="R">${esc(it.r)}</div></div>`);
        Sound.sfx('pop'); api.say(api.key(j), it.say);
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (j === s.items.length - 1) { btn.parentElement.classList.add('hidden'); api.ready(); }
        else btn.textContent = '✨ עוד הבדל';
      };
    },

    timeline(body, s, api) {
      body.innerHTML = `<div class="tline"></div><div class="center-btn"><button class="btn mint">⏩ ${esc(s.start || 'יוצאים למסע בזמן')}</button></div>`;
      let j = -1;
      const btn = body.querySelector('.center-btn .btn');
      btn.onclick = () => {
        j++;
        const it = s.items[j];
        body.querySelector('.tline').insertAdjacentHTML('beforeend', `<div class="tev"><span class="dot">${it.e}</span><div class="y">${esc(it.y)}</div><h4>${esc(it.h)}</h4><p>${esc(it.t)}</p></div>`);
        Sound.sfx('warp'); api.say(api.key(j), it.t);
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (j === s.items.length - 1) { btn.parentElement.classList.add('hidden'); api.ready(); }
        else btn.textContent = '⏩ קדימה בזמן';
      };
    },

    choose(body, s, api) {
      let j = 0, coins = 0;
      const round = () => {
        const it = s.items[j];
        body.innerHTML = `<div class="cust"><span class="e">${it.e}</span><div><b>${esc(it.who)}:</b> "${esc(it.need)}"</div></div>
          <div class="l-hint" style="margin-top:12px">איזו מפה תתאים? (${j + 1}/${s.items.length})</div>
          <div class="chopts">${shuffle(it.opts.map((o, n) => [o, n])).map(([o, n]) => `<button class="chopt" data-n="${n}"><span class="e">${o[0]}</span>${esc(o[1])}</button>`).join('')}</div>
          <div class="coinrow">${'🪙'.repeat(coins)}</div>`;
        api.say(api.key(j), it.say);
        body.querySelectorAll('.chopt').forEach(b => b.onclick = () => {
          const o = it.opts[+b.dataset.n];
          if (o[2]) {
            b.classList.add('ok'); coins++; Sound.sfx('coin'); Sound.sayRandom('ok', 10);
            body.querySelectorAll('.chopt').forEach(x => x.disabled = true);
            setTimeout(() => { j++; if (j < s.items.length) round(); else { body.querySelector('.coinrow').textContent = '🪙'.repeat(coins) + ' 🎉'; Sound.sfx('fanfare'); api.ready(); } }, 1500);
          } else { b.classList.add('bad'); Sound.sfx('wrong'); Sound.say('lesson_try'); setTimeout(() => b.classList.remove('bad'), 450); }
        });
      };
      round();
    },

    treasure(body, s, api) {
      const st = s.stations;
      body.innerHTML = `<div class="parch"><div class="ttl">${esc(s.title || 'מפת הדרך אל המטמון')}</div><div class="stream"></div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="" fill="none" stroke="#b03a2e" stroke-width="1.2" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" style="stroke-width:3px"/></svg>
          ${st.map((p, n) => `<div class="stn ${n === st.length - 1 ? 'goal' : ''}" style="left:${p.x}%;top:${p.y}%">${p.e}<small>${esc(p.n)}</small></div>`).join('')}
          <div class="walker" style="left:${st[0].x}%;top:${st[0].y}%">🚶‍♀️</div></div>
        <div class="dirs"><button class="btn" data-d="ישר">⬆️ ישר</button><button class="btn" data-d="ימינה">➡️ ימינה</button><button class="btn" data-d="שמאלה">⬅️ שמאלה</button></div>`;
      let j = 0;
      const pts = [st[0]];
      const line = body.querySelector('polyline'), walker = body.querySelector('.walker'), dirs = body.querySelector('.dirs');
      const ask = () => { dirs.classList.remove('hidden'); api.tell(s.items[j].lines[0], api.key(j, 0)); };
      api.afterIntro(ask);
      dirs.onclick = e => {
        const b = e.target.closest('[data-d]'); if (!b) return;
        const mv = s.items[j];
        if (b.dataset.d !== mv.a) { Sound.sfx('wrong'); Sound.say('lesson_try'); b.animate([{ transform: 'translateX(6px)' }, { transform: 'translateX(-6px)' }, { transform: 'none' }], { duration: 300 }); UI.toast('💡 דמייני שאת ההולכת על המפה, ופני לאותו כיוון'); return; }
        Sound.sfx('correct'); dirs.classList.add('hidden');
        const to = st[j + 1];
        walker.style.left = to.x + '%'; walker.style.top = to.y + '%';
        pts.push(to); line.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
        j++;
        api.tell(mv.lines[1], api.key(j - 1, 1), () => {
          if (j < s.items.length) ask();
          else { body.querySelector('.goal').animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(1.6)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 900 }); body.querySelector('.goal').firstChild.textContent = '💎'; Sound.sfx('fanfare'); UI.confetti(60); api.ready(); }
        });
      };
      dirs.classList.add('hidden');
    },

    index(body, s, api) {
      let j = 0;
      body.innerHTML = `<div class="atl"><div class="idx"><h4>🔤 מפתח השמות</h4>${s.entries.map((e, n) => `<button data-n="${n}"><span>${esc(e[0])}</span><span>${e[1]} &nbsp; ${e[2]}${e[3]}</span></button>`).join('')}</div>
        <div class="pageslot"><div class="page" style="text-align:center;padding:40px 12px"><div style="font-size:3rem">📖</div><div class="muted" style="color:#667">כאן ייפתח עמוד המפה</div></div></div></div>`;
      const slot = body.querySelector('.pageslot');
      let phase = 0;
      const startTask = () => {
        phase = 0; const t = s.items[j];
        slot.innerHTML = `<div class="page" style="text-align:center;padding:40px 12px"><div style="font-size:3rem">📖</div><div style="color:#667">כאן ייפתח עמוד המפה</div></div>`;
        body.querySelectorAll('.idx button').forEach(b => b.classList.remove('hl'));
        api.tell(t.lines[0], api.key(j, 0));
      };
      api.afterIntro(startTask);
      body.querySelector('.idx').onclick = e => {
        const b = e.target.closest('button'); if (!b || phase !== 0) return;
        const t = s.items[j], en = s.entries[+b.dataset.n];
        if (en[0] !== t.place) { Sound.sfx('wrong'); UI.toast(`זה ${en[0]}. חפשי את ${t.place} 🔍`); return; }
        phase = 1; b.classList.add('hl'); Sound.sfx('pop');
        const [, page, col, row] = en;
        slot.innerHTML = `<div class="idx-explain"><span class="k">${page}</span> = מספר העמוד<br><span class="k">${col}${row}</span> = המשבצת: <b>${col}</b> = הטור, <b>${row}</b> = השורה
          <div class="center-btn" style="margin-top:10px"><button class="btn mint sm">📖 פתחי את עמוד ${page}</button></div></div>`;
        api.tell(t.lines[1], api.key(j, 1));
        slot.querySelector('.btn').onclick = () => {
          phase = 2; Sound.sfx('whoosh');
          const cols = ['א', 'ב', 'ג', 'ד'];
          slot.innerHTML = `<div class="page"><div class="pn">עמוד ${page}</div><div class="grid4"><span></span>${cols.map(c => `<span class="lab">${c}</span>`).join('')}
            ${[1, 2, 3, 4].map(r => `<span class="lab">${r}</span>${cols.map(c => `<button class="cell" data-c="${c}" data-r="${r}"></button>`).join('')}`).join('')}</div></div>`;
          api.tell(t.lines[2], api.key(j, 2));
          slot.querySelector('.grid4').onclick = ev => {
            const c = ev.target.closest('.cell'); if (!c || phase !== 2) return;
            if (c.dataset.c === col && +c.dataset.r === row) {
              phase = 3; c.classList.add('found'); c.textContent = t.e; Sound.sfx('star'); UI.confetti(40);
              api.tell(t.lines[3], api.key(j, 3), () => { j++; if (j < s.items.length) startTask(); else api.ready(); });
            } else { c.classList.add('no'); Sound.sfx('wrong'); setTimeout(() => c.classList.remove('no'), 450); UI.toast(`זו משבצת ${c.dataset.c}${c.dataset.r}. חפשי טור ${col}, שורה ${row}`); }
          };
        };
      };
    },

    mapmaker(body, s, api) {
      const L = ['HHSHHMHT', 'HBSHHMPP', 'SSSSSMPP', 'HHSTHMHH', 'MMMMMMMM', 'HTSHBMHT'];
      const E = { H: '🏠', T: '🌳', P: '🌲', B: '🏫', M: '', S: '' };
      body.innerHTML = `<div class="mm-wrap"><div class="copies"><i></i><i></i></div>
          <div class="mm s0"><div class="plane">✈️📸</div><div class="flash"></div><div class="ttl">מפת תחבורה · מרכז העיר</div>
            <div class="city">${L.join('').split('').map((c, n) => `<div class="c" data-c="${c}" style="transition-delay:${(n % 8) * 40 + Math.floor(n / 8) * 60}ms">${E[c]}</div>`).join('')}</div>
            <div class="leg"><span><i style="background:#ff9f43"></i>רחוב ראשי</span><span><i style="background:#ffe08a"></i>רחוב משני</span><span><i style="background:#7fe0a8"></i>פארק</span><span><i style="background:#ff8a8a"></i>מבנה ציבורי</span></div></div></div>
        <div class="devices">🗺️📱💻🛰️</div>
        <div class="mmcap"><h4>מוכנות? בואי נכין מפה!</h4></div>
        <div class="center-btn"><button class="btn mint">${esc(s.items[0].btn)}</button></div>`;
      const mm = body.querySelector('.mm'), wrap = body.querySelector('.mm-wrap'), btn = body.querySelector('.center-btn .btn'), cap = body.querySelector('.mmcap h4');
      let j = -1;
      btn.onclick = () => {
        j++;
        const it = s.items[j];
        btn.disabled = true;
        cap.textContent = `${it.e} ${it.h}`;
        const apply = () => {
          mm.className = 'mm s' + (j + 1); wrap.className = 'mm-wrap s' + (j + 1);
          api.say(api.key(j), it.t);
          if (j === s.items.length - 1) { btn.parentElement.classList.add('hidden'); Sound.sfx('fanfare'); UI.confetti(60); api.ready(); }
          else { btn.textContent = s.items[j + 1].btn; setTimeout(() => btn.disabled = false, 900); }
        };
        if (j === 0) { mm.classList.add('flying'); Sound.sfx('whoosh'); [300, 780, 1260, 1740].forEach(t => setTimeout(() => Sound.sfx('tick'), t)); setTimeout(apply, 2400); }
        else { Sound.sfx(j === 4 ? 'drum' : 'pop'); apply(); }
      };
    },

    check(body, s, api) {
      const q = api.questions.find(q => q.id === s.q);
      body.innerHTML = `<div class="chk-wrap"></div>`;
      const host = body.querySelector('.chk-wrap');
      Engine.render(host, q, { read: false, label: '🧠 בדיקה קטנה', onResult: res => {
        Store.record(GEO.id, q.id, res.correct);
        Engine.feedback(host, q, res, { nextLabel: 'ממשיכים ⟵', onNext: api.next });
        api.ready();
      } });
    },

    summary(body, s, api) {
      body.innerHTML = `<div class="sumlist">${s.items.map((it, j) => `<button data-j="${j}"><span class="ck">✓</span>${esc(it.t)}</button>`).join('')}</div>`;
      const btns = body.querySelectorAll('.sumlist button');
      btns.forEach((b, j) => setTimeout(() => { b.classList.add('in'); Sound.sfx('pop'); if (j === btns.length - 1) api.ready(); }, 600 + j * 450));
      btns.forEach(b => b.onclick = () => api.say(api.key(+b.dataset.j), s.items[+b.dataset.j].t));
    }
  };

  return { play };
})();
