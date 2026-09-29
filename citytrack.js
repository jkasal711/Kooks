/* ══════════════════════════════════════════════════════
   CITYTRACK — AFK minihra na herní stránce
   Spustí se po 15 min nečinnosti nebo napsáním „kooksbigboobs“.
   Jsme tým T (hráč + 2 boti): prostřílet se do budovy CityTrack,
   položit bombu a ubránit ji, dokud nevybuchne.
   CT mají štíty a plynové granáty.
   ══════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var IDLE_MS = 15 * 60 * 1000;
  var CHEAT = 'kooksbigboobs';

  // ── Styly + DOM ────────────────────────────────────────
  var css = `
  #ctAlert, #ctGame {
    position: fixed; inset: 0; z-index: 9500; display: none;
    font-family: 'DM Mono', monospace; color: #e8e2d9;
  }
  #ctAlert {
    background: rgba(5,8,11,0.97);
    flex-direction: column; align-items: center; justify-content: center;
    text-align: center; padding: 1.5rem;
  }
  #ctAlert.active { display: flex; animation: fadeUp 0.4s ease both; }
  #ctAlert .ct-eyebrow {
    font-size: 0.6rem; letter-spacing: 0.45em; text-transform: uppercase;
    color: #ff9f1c; margin-bottom: 1.5rem; animation: blink 0.8s step-end infinite;
  }
  #ctAlert h2 {
    font-family: 'Bebas Neue', sans-serif; font-weight: 400;
    font-size: clamp(2.5rem, 6vw, 5rem); letter-spacing: 0.06em; margin-bottom: 0.8rem;
  }
  #ctAlert h2 b { color: #2ec4ff; font-weight: 400; }
  #ctAlert p {
    max-width: 36rem; font-size: 0.65rem; line-height: 1.9; letter-spacing: 0.15em;
    text-transform: uppercase; color: #5d6b75; margin-bottom: 2.5rem;
  }
  .ct-btn {
    font-family: 'DM Mono', monospace; font-size: 0.6rem; letter-spacing: 0.25em;
    text-transform: uppercase; background: none; cursor: crosshair;
    color: #ff9f1c; border: 1px solid #ff9f1c; padding: 0.8rem 2.5rem;
    transition: background 0.2s, color 0.2s;
  }
  .ct-btn:hover { background: #ff9f1c; color: #05080b; }
  .ct-link {
    margin-top: 1.2rem; background: none; border: 0; cursor: crosshair;
    font-family: 'DM Mono', monospace; font-size: 0.55rem; letter-spacing: 0.25em;
    text-transform: uppercase; color: #5d6b75;
  }
  .ct-link:hover { color: #e8e2d9; }

  #ctGame { background: #030507; cursor: crosshair; }
  #ctGame.active { display: block; }
  #ctCanvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .ct-hud {
    position: absolute; left: 0; right: 0; top: 0; z-index: 2; pointer-events: none;
    display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;
    padding: 0.9rem 1.2rem; font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase;
    background: linear-gradient(rgba(3,5,7,0.85), transparent);
  }
  .ct-hud .obj { color: #ff9f1c; }
  .ct-hud .mid { text-align: center; font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; letter-spacing: 0.1em; }
  .ct-hud .mid small { display: block; font-family: 'DM Mono', monospace; font-size: 0.55rem; color: #5d6b75; letter-spacing: 0.2em; }
  .ct-hud .team { text-align: right; line-height: 1.9; }
  .ct-hud .team .dead { color: #5d6b75; text-decoration: line-through; }
  .ct-hint {
    position: absolute; bottom: 0.8rem; left: 0; right: 0; text-align: center; z-index: 2;
    pointer-events: none; font-size: 0.55rem; letter-spacing: 0.2em; text-transform: uppercase; color: #5d6b75;
  }
  .ct-result {
    position: absolute; inset: 0; z-index: 3; display: none;
    flex-direction: column; align-items: center; justify-content: center; text-align: center;
    background: rgba(3,5,7,0.7); padding: 1.5rem;
  }
  .ct-result.show { display: flex; animation: fadeUp 0.5s ease both; }
  .ct-result h2 {
    font-family: 'Bebas Neue', sans-serif; font-weight: 400;
    font-size: clamp(3rem, 8vw, 7rem); letter-spacing: 0.06em; line-height: 0.95; margin-bottom: 1rem;
  }
  .ct-result p { font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: #9aa7b0; margin-bottom: 2.5rem; }
  .ct-result .row { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
  `;
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var wrap = document.createElement('div');
  wrap.innerHTML = `
  <div id="ctAlert" role="dialog" aria-label="CityTrack">
    <p class="ct-eyebrow">&#9888; Intercepted transmission &#9888;</p>
    <h2><b>CityTrack</b> is watching everyone</h2>
    <p>The government is tracking every click and every camera in the city.
       Break into the CityTrack building, plant the bomb and hold it until it blows.</p>
    <button class="ct-btn" id="ctStart">Join the crew &mdash; go</button>
    <button class="ct-link" id="ctDecline">Stay offline</button>
  </div>
  <div id="ctGame">
    <canvas id="ctCanvas"></canvas>
    <div class="ct-hud">
      <div class="obj" id="ctObj"></div>
      <div class="mid" id="ctMid"></div>
      <div class="team" id="ctTeam"></div>
    </div>
    <div class="ct-hint">WASD move &middot; mouse aim &middot; click shoot &middot; hold E plant &middot; Esc quit</div>
    <div class="ct-result" id="ctResult">
      <h2 id="ctResTitle"></h2>
      <p id="ctResSub"></p>
      <div class="row">
        <button class="ct-btn" id="ctAgain">Play again</button>
        <button class="ct-btn" id="ctQuit">&larr; Back to site</button>
      </div>
    </div>
  </div>`;
  while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

  var $ = function(id) { return document.getElementById(id); };
  var alertEl = $('ctAlert'), gameEl = $('ctGame'), canvas = $('ctCanvas'), ctx = canvas.getContext('2d');

  // ── Spouštění: nečinnost + cheat ───────────────────────
  var mode = 'idle', idleTimer = null, cheatBuf = '';
  var finePointer = window.matchMedia && matchMedia('(pointer: fine)').matches;

  function resetIdle() {
    if (mode !== 'idle' || !finePointer) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showAlert, IDLE_MS);
  }
  ['mousemove', 'keydown', 'scroll', 'touchstart', 'pointerdown'].forEach(function(e) {
    window.addEventListener(e, resetIdle, { passive: true });
  });
  resetIdle();

  document.addEventListener('keydown', function(e) {
    if (mode !== 'idle' || !e.key || e.key.length !== 1) return;
    cheatBuf = (cheatBuf + e.key.toLowerCase()).slice(-CHEAT.length);
    if (cheatBuf === CHEAT) { cheatBuf = ''; showAlert(); }
  });

  function showAlert() {
    if (mode !== 'idle') return;
    mode = 'alert';
    clearTimeout(idleTimer);
    alertEl.classList.add('active');
  }
  function backToSite() {
    stopGame();
    alertEl.classList.remove('active');
    gameEl.classList.remove('active');
    document.body.style.overflow = '';
    mode = 'idle';
    resetIdle();
  }
  $('ctDecline').onclick = backToSite;
  $('ctQuit').onclick = backToSite;
  $('ctStart').onclick = function() {
    alertEl.classList.remove('active');
    gameEl.classList.add('active');
    document.body.style.overflow = 'hidden';
    mode = 'game';
    startGame();
  };
  $('ctAgain').onclick = function() { startGame(); };

  // ── Zvuky (Web Audio, bez souborů) ─────────────────────
  var ac = null, noiseBuf = null;
  function audio() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { return null; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  var lastShotSnd = 0;
  function sfx(kind, vol) {
    var a = audio(); if (!a) return;
    var now = a.currentTime;
    if (kind === 'shot') {
      if (now - lastShotSnd < 0.03) return;
      lastShotSnd = now;
    }
    var src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noiseBuf;
    var dur = { shot: 0.08, block: 0.05, gas: 0.6, boom: 2.6, hit: 0.06 }[kind] || 0.1;
    f.type = kind === 'boom' ? 'lowpass' : (kind === 'block' ? 'highpass' : 'bandpass');
    f.frequency.value = { shot: 1800, block: 3500, gas: 900, boom: 300, hit: 600 }[kind] || 1000;
    g.gain.setValueAtTime((vol || 1) * ({ shot: 0.05, block: 0.04, gas: 0.05, boom: 0.35, hit: 0.05 }[kind] || 0.05), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(now, Math.random() * 0.5); src.stop(now + dur + 0.05);
  }
  function beep(freq, dur, vol) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), now = a.currentTime;
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.03, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
  }

  // ── Mapa ───────────────────────────────────────────────
  var W = 1400, H = 900;
  var B = { x: 700, y: 180, w: 600, h: 540 };           // budova CityTrack
  var WALL = 18;
  var SITE = { x: 1000, y: 450, r: 55 };                  // místo pro bombu
  var walls = [
    [700, 180, 260, WALL], [1040, 180, 260, WALL],        // horní zeď (dveře uprostřed)
    [700, 702, 260, WALL], [1040, 702, 260, WALL],        // spodní zeď
    [700, 180, WALL, 230], [700, 490, WALL, 230],         // levá zeď (hlavní vchod)
    [1282, 180, WALL, 540]                                // pravá zeď
  ];
  var cover = [
    // venku: auta a zátarasy
    [290, 250, 120, 60], [250, 600, 120, 60], [540, 250, 26, 90], [540, 560, 26, 90],
    [470, 150, 120, 24], [470, 726, 120, 24],
    // uvnitř: servery a stoly
    [790, 250, 30, 100], [790, 550, 30, 100], [1180, 250, 30, 100], [1180, 550, 30, 100],
    [935, 300, 130, 24], [935, 576, 130, 24]
  ];
  var solids = walls.concat(cover);
  var DOORS = [
    { out: { x: 665, y: 450 }, inn: { x: 745, y: 450 } },
    { out: { x: 1000, y: 145 }, inn: { x: 1000, y: 220 } },
    { out: { x: 1000, y: 755 }, inn: { x: 1000, y: 680 } }
  ];
  var SPAWNS = [
    { x: 1380, y: 110 }, { x: 1380, y: 790 }, { x: 1000, y: 20 },
    { x: 1000, y: 880 }, { x: 1380, y: 450 }, { x: 800, y: 20 }, { x: 800, y: 880 }
  ];

  function inside(p) { return p.x > B.x + WALL && p.x < B.x + B.w - WALL && p.y > B.y + WALL && p.y < B.y + B.h - WALL; }
  function pointBlocked(x, y) {
    if (x < 0 || y < 0 || x > W || y > H) return true;
    for (var i = 0; i < solids.length; i++) {
      var s = solids[i];
      if (x >= s[0] && x <= s[0] + s[2] && y >= s[1] && y <= s[1] + s[3]) return true;
    }
    return false;
  }
  function circleHits(x, y, r) {
    if (x < r || y < r || x > W - r || y > H - r) return true;
    for (var i = 0; i < solids.length; i++) {
      var s = solids[i];
      var nx = Math.max(s[0], Math.min(x, s[0] + s[2])), ny = Math.max(s[1], Math.min(y, s[1] + s[3]));
      if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r) return true;
    }
    return false;
  }
  function los(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), n = Math.ceil(d / 10);
    for (var i = 1; i < n; i++) if (pointBlocked(a.x + dx * i / n, a.y + dy * i / n)) return false;
    return true;
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // Další bod cesty: přes nejbližší dveře, když je cíl na druhé straně zdi
  function waypoint(e, t) {
    var ei = inside(e), ti = inside(t);
    if (ei === ti) return t;
    var best = null, bd = 1e9;
    DOORS.forEach(function(d) {
      var v = dist(e, ei ? d.inn : d.out) + dist(ei ? d.out : d.inn, t);
      if (v < bd) { bd = v; best = d; }
    });
    var first = ei ? best.inn : best.out, second = ei ? best.out : best.inn;
    // už ve dveřích (blíž k druhé straně než vnější bod) → projít dovnitř/ven
    if (dist(e, second) < dist(first, second) + 6) return second;
    // venku za rohem budovy: obejít přes nejbližší roh
    if (!ei && !los(e, first)) {
      var bc = null, bcd = 1e9;
      CORNERS.forEach(function(c) {
        if (!los(e, c)) return;
        var v = dist(e, c) + dist(c, first);
        if (v < bcd) { bcd = v; bc = c; }
      });
      if (bc) return bc;
    }
    return first;
  }
  var CORNERS = [{ x: 672, y: 150 }, { x: 1330, y: 150 }, { x: 672, y: 750 }, { x: 1330, y: 750 }];

  // ── Stav hry ───────────────────────────────────────────
  var S = null, raf = 0, last = 0;
  var keys = {}, mouse = { x: 0, y: 0, down: false };
  var view = { s: 1, ox: 0, oy: 0 };

  function makeUnit(team, x, y, o) {
    var u = {
      team: team, x: x, y: y, r: 13, angle: team === 'T' ? 0 : Math.PI,
      hp: 100, maxHp: 100, speed: 150, cool: rnd(0, 0.5), think: rnd(0, 0.2),
      target: null, goal: null, post: { x: x, y: y }, stuck: 0, side: 0, sideT: 0, slow: 0, flash: 0
    };
    for (var k in o) u[k] = o[k];
    return u;
  }
  function makeCT(x, y, wave) {
    var roll = Math.random();
    var shield = roll < 0.22, gren = !shield && roll < 0.55;
    return makeUnit('CT', x, y, {
      hp: shield ? 90 : 60, maxHp: shield ? 90 : 60, speed: shield ? 70 : 95,
      shield: shield, shieldHp: 140, gren: gren, grenCool: rnd(3, 7), wave: !!wave
    });
  }

  function startGame() {
    $('ctResult').classList.remove('show');
    S = {
      phase: 'assault', t: 0,
      units: [], bullets: [], nades: [], gas: [], parts: [], sparks: [],
      plant: 0, bomb: null, bombT: 40, defuse: 0, waveT: 2, wave: 0,
      roofA: 1, shake: 0, hole: null, boomT: 0, over: false, kills: 0
    };
    S.player = makeUnit('T', 90, 450, { isPlayer: true, speed: 175, name: 'You', hp: 150, maxHp: 150 });
    S.units.push(S.player);
    S.units.push(makeUnit('T', 70, 395, { bot: true, name: 'Bot Rook', off: { x: -40, y: -45 } }));
    S.units.push(makeUnit('T', 70, 505, { bot: true, name: 'Bot Vex', off: { x: -40, y: 45 } }));
    [[600, 300], [610, 610], [640, 450], [450, 330], [440, 560],
     [860, 300], [860, 610], [1150, 450], [1060, 380], [1230, 250]].forEach(function(p) {
      S.units.push(makeCT(p[0], p[1], false));
    });
    resize();
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  window.__citytrack = function() { return S; }; // pro ladění
  function stopGame() { cancelAnimationFrame(raf); raf = 0; S = null; keys = {}; mouse.down = false; }

  // ── Vstup ──────────────────────────────────────────────
  window.addEventListener('keydown', function(e) {
    if (mode !== 'game') return;
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'Escape') backToSite();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(e.key.toLowerCase()) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', function(e) { keys[e.key.toLowerCase()] = false; });
  canvas.addEventListener('mousemove', function(e) { mouse.x = e.clientX; mouse.y = e.clientY; });
  canvas.addEventListener('mousedown', function(e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.down = true; });
  window.addEventListener('mouseup', function() { mouse.down = false; });
  canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  window.addEventListener('resize', function() { if (mode === 'game') resize(); });

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    var s = Math.min(innerWidth / W, (innerHeight - 20) / H);
    view.s = s * dpr; view.ox = (innerWidth - W * s) / 2 * dpr; view.oy = (innerHeight - H * s) / 2 * dpr + 10 * dpr;
    view.dpr = dpr;
  }
  function mouseWorld() {
    return { x: (mouse.x * view.dpr - view.ox) / view.s, y: (mouse.y * view.dpr - view.oy) / view.s };
  }

  // ── Pohyb a střelba ────────────────────────────────────
  function moveUnit(u, dx, dy, dt) {
    var len = Math.hypot(dx, dy);
    if (len < 0.001) return 0;
    var sp = u.speed * (u.slow > 0 ? 0.6 : 1) * dt;
    var mx = dx / len * sp, my = dy / len * sp, moved = 0;
    if (!circleHits(u.x + mx, u.y, u.r)) { u.x += mx; moved += Math.abs(mx); }
    if (!circleHits(u.x, u.y + my, u.r)) { u.y += my; moved += Math.abs(my); }
    return moved / sp;
  }
  function steer(u, goal, dt) {
    u.wpT = (u.wpT || 0) - dt;
    if (u.wpT <= 0 || !u.wp) { u.wpT = 0.25; u.wp = waypoint(u, goal); }
    var wp = u.wp;
    if (dist(u, wp) < 20) { u.wp = waypoint(u, goal); wp = u.wp; }
    var dx = wp.x - u.x, dy = wp.y - u.y;
    if (u.sideT > 0) { // obcházení překážky
      u.sideT -= dt;
      var px = -dy * u.side, py = dx * u.side;
      dx = dx * 0.3 + px; dy = dy * 0.3 + py;
    }
    var eff = moveUnit(u, dx, dy, dt);
    if (eff < 0.35) { u.stuck += dt; if (u.stuck > 0.3) { u.stuck = 0; u.side = Math.random() < 0.5 ? 1 : -1; u.sideT = 0.6; } }
    else u.stuck = 0;
  }
  function shoot(u, ang, o) {
    var spread = o.spread || 0.05;
    var a = ang + rnd(-spread, spread);
    var sx = u.x + Math.cos(ang) * (u.r + 6), sy = u.y + Math.sin(ang) * (u.r + 6);
    S.bullets.push({ x: sx, y: sy, vx: Math.cos(a) * 950, vy: Math.sin(a) * 950, team: u.team, dmg: o.dmg, life: 0.7 });
    u.flash = 0.05;
    sfx('shot', u.isPlayer ? 1 : 0.5);
  }
  function enemiesOf(u) { return S.units.filter(function(o) { return o.hp > 0 && o.team !== u.team; }); }
  function nearestVisible(u, range) {
    var best = null, bd = range;
    enemiesOf(u).forEach(function(o) {
      var d = dist(u, o);
      if (d < bd && los(u, o)) { bd = d; best = o; }
    });
    return best;
  }

  // ── Umělá inteligence ──────────────────────────────────
  function aiBot(u, dt) {
    u.think -= dt;
    if (u.think <= 0) { u.think = 0.2; u.target = nearestVisible(u, 480); }
    var p = S.player, goal;
    if (S.bomb) {
      var a = u.off.y < 0 ? -2.2 : 2.2;
      goal = { x: S.bomb.x + Math.cos(a) * 70, y: S.bomb.y + Math.sin(a) * 70 };
    } else if (p.hp > 0) {
      goal = { x: p.x + u.off.x, y: p.y + u.off.y };
      if (inside(p) !== inside(goal)) goal = { x: p.x, y: p.y };
    } else goal = SITE;
    var t = u.target;
    if (t && t.hp > 0) {
      u.angle = Math.atan2(t.y - u.y, t.x - u.x);
      u.cool -= dt;
      if (u.cool <= 0) { u.cool = rnd(0.22, 0.34); shoot(u, u.angle, { dmg: 13, spread: 0.1 }); }
    }
    if (dist(u, goal) > 30) {
      if (!t) u.angle = Math.atan2(goal.y - u.y, goal.x - u.x);
      steer(u, goal, dt * (t ? 0.7 : 1));
    }
  }
  function aiCT(u, dt) {
    u.think -= dt;
    if (u.think <= 0) { u.think = 0.25; u.target = nearestVisible(u, u.wave ? 520 : 460); }
    var t = u.target;
    if (t && t.hp <= 0) t = u.target = null;
    var goal = null;
    if (S.bomb) goal = S.bomb;
    else if (t) goal = dist(u, t) > 200 ? t : null;
    else if (u.alerted) goal = u.alerted;
    else goal = dist(u, u.post) > 20 ? u.post : null;

    if (t) {
      var aim = Math.atan2(t.y - u.y, t.x - u.x);
      u.angle += angDiff(aim, u.angle) * Math.min(1, dt * (u.shield ? 5 : 9));
      u.cool -= dt;
      if (u.cool <= 0 && Math.abs(angDiff(aim, u.angle)) < 0.25) {
        u.cool = u.shield ? rnd(1.0, 1.4) : rnd(0.7, 1.0);
        shoot(u, u.angle, { dmg: 6, spread: 0.13 });
      }
      if (u.gren) {
        u.grenCool -= dt;
        var d = dist(u, t);
        if (u.grenCool <= 0 && d < 400 && d > 90) {
          u.grenCool = rnd(6, 9);
          S.nades.push({ sx: u.x, sy: u.y, tx: t.x + rnd(-20, 20), ty: t.y + rnd(-20, 20), t: 0, dur: 0.8 });
        }
      }
      // zvednout poplach u ostatních v okolí
      S.units.forEach(function(o) { if (o.team === 'CT' && !o.alerted && dist(o, u) < 300) o.alerted = { x: t.x, y: t.y }; });
    } else if (goal) {
      u.angle += angDiff(Math.atan2(goal.y - u.y, goal.x - u.x), u.angle) * Math.min(1, dt * 6);
    }
    if (goal) {
      if (S.bomb && dist(u, S.bomb) < 32) return; // zneškodňuje
      steer(u, goal, dt * (t ? 0.6 : 1));
      if (!S.bomb && u.alerted && !t && dist(u, u.alerted) < 40) u.alerted = null;
    }
  }

  // ── Herní smyčka ───────────────────────────────────────
  function loop(now) {
    if (!S) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    S.t += dt;
    var p = S.player;

    // hráč
    if (p.hp > 0 && !S.over) {
      var mx = 0, my = 0;
      if (keys['w'] || keys['arrowup']) my -= 1;
      if (keys['s'] || keys['arrowdown']) my += 1;
      if (keys['a'] || keys['arrowleft']) mx -= 1;
      if (keys['d'] || keys['arrowright']) mx += 1;
      moveUnit(p, mx, my, dt);
      var mw = mouseWorld();
      p.angle = Math.atan2(mw.y - p.y, mw.x - p.x);
      p.cool -= dt;
      if (mouse.down && p.cool <= 0) { p.cool = 0.11; shoot(p, p.angle, { dmg: 20, spread: 0.035 }); }

      // pokládání bomby
      if (!S.bomb && dist(p, SITE) < SITE.r && (keys['e'] || keys['f'])) {
        S.plant += dt;
        if (Math.floor(S.plant * 4) !== Math.floor((S.plant - dt) * 4)) beep(880, 0.05);
        if (S.plant >= 3) {
          S.bomb = { x: p.x, y: p.y };
          S.phase = 'defend';
          beep(1320, 0.3, 0.05);
          S.units.forEach(function(u) { if (u.team === 'CT') u.alerted = S.bomb; });
        }
      } else if (!S.bomb) S.plant = Math.max(0, S.plant - dt * 2);
    }

    S.units.forEach(function(u) {
      if (u.hp <= 0 || S.over) return;
      u.flash = Math.max(0, u.flash - dt);
      u.slow = Math.max(0, u.slow - dt);
      // tým T se po 4 s bez zásahu pomalu léčí
      if (u.team === 'T') { u.calm = (u.calm || 0) + dt; if (u.calm > 4) u.hp = Math.min(u.maxHp, u.hp + 4 * dt); }
      if (u.bot) aiBot(u, dt);
      else if (u.team === 'CT') aiCT(u, dt);
    });

    // střely
    S.bullets = S.bullets.filter(function(b) {
      for (var k = 0; k < 3; k++) {
        b.x += b.vx * dt / 3; b.y += b.vy * dt / 3;
        if (pointBlocked(b.x, b.y)) { S.sparks.push({ x: b.x, y: b.y, t: 0.15, c: '#ffd9a0' }); return false; }
        for (var i = 0; i < S.units.length; i++) {
          var u = S.units[i];
          if (u.hp <= 0 || u.team === b.team) continue;
          if ((b.x - u.x) * (b.x - u.x) + (b.y - u.y) * (b.y - u.y) < (u.r + 3) * (u.r + 3)) {
            if (u.shield && Math.abs(angDiff(Math.atan2(-b.vy, -b.vx), u.angle)) < 1.1) {
              S.sparks.push({ x: b.x, y: b.y, t: 0.2, c: '#9fe6ff' }); sfx('block');
              u.shieldHp -= b.dmg;
              if (u.shieldHp <= 0) { // štít praskl
                u.shield = false; u.speed = 95;
                for (var j = 0; j < 12; j++) S.parts.push({ x: u.x, y: u.y, vx: rnd(-160, 160), vy: rnd(-160, 160), life: rnd(0.3, 0.6), c: '#9fe6ff', s: 3 });
              }
              return false;
            }
            hurt(u, b.dmg);
            return false;
          }
        }
      }
      b.life -= dt;
      return b.life > 0;
    });

    // plynové granáty
    S.nades = S.nades.filter(function(n) {
      n.t += dt;
      if (n.t >= n.dur) { S.gas.push({ x: n.tx, y: n.ty, r: 78, life: 5, max: 5 }); sfx('gas'); return false; }
      return true;
    });
    S.gas = S.gas.filter(function(g) {
      g.life -= dt;
      S.units.forEach(function(u) {
        if (u.team === 'T' && u.hp > 0 && dist(u, g) < g.r) { u.slow = 0.3; hurt(u, 14 * dt, true); }
      });
      return g.life > 0;
    });

    // bomba, vlny CT, zneškodňování
    if (S.bomb && !S.over) {
      S.bombT -= dt;
      var interval = S.bombT < 10 ? 0.25 : S.bombT < 25 ? 0.5 : 1;
      if (Math.floor(S.bombT / interval) !== Math.floor((S.bombT + dt) / interval)) beep(1800, 0.05, 0.025);
      S.waveT -= dt;
      if (S.waveT <= 0) {
        S.wave++;
        S.waveT = 5;
        var n = Math.min(5, 2 + Math.floor(S.wave / 2));
        for (var i = 0; i < n; i++) {
          var sp = SPAWNS[Math.floor(Math.random() * SPAWNS.length)];
          S.units.push(makeCT(sp.x + rnd(-20, 20), sp.y + rnd(-10, 10), true));
        }
      }
      var defusing = S.units.some(function(u) { return u.team === 'CT' && u.hp > 0 && dist(u, S.bomb) < 32; });
      S.defuse = defusing ? S.defuse + dt : Math.max(0, S.defuse - dt);
      if (S.defuse >= 7) endGame(false, 'Bomb defused', 'CityTrack keeps watching. The cameras never blink.');
      else if (S.bombT <= 0) explode();
    }
    if (p.hp <= 0 && !S.over) endGame(false, 'You were taken down', 'CityTrack keeps watching. Try a different way in.');

    // výbuch
    if (S.phase === 'boom') {
      S.boomT += dt;
      if (S.boomT > 3.2 && !S.over) endGame(true, 'CityTrack is down', 'The cameras are dark. Nobody is watching tonight.');
    }

    // střecha: průhledná, když je hráč uvnitř
    var targetA = S.hole ? 0.85 : (inside(p) ? 0.12 : 1);
    S.roofA += (targetA - S.roofA) * Math.min(1, dt * 5);

    // efekty
    S.shake = Math.max(0, S.shake - dt * 2.5);
    S.sparks = S.sparks.filter(function(s) { s.t -= dt; return s.t > 0; });
    S.parts = S.parts.filter(function(q) {
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; q.life -= dt;
      return q.life > 0;
    });
    hud();
  }

  function hurt(u, dmg, silent) {
    u.hp -= dmg;
    u.calm = 0;
    if (!silent) { sfx('hit', 0.6); S.sparks.push({ x: u.x, y: u.y, t: 0.12, c: u.team === 'T' ? '#ff9f1c' : '#2ec4ff' }); }
    if (u.hp <= 0) {
      u.hp = 0;
      if (u.team === 'CT') S.kills++;
      for (var i = 0; i < 10; i++) S.parts.push({ x: u.x, y: u.y, vx: rnd(-120, 120), vy: rnd(-120, 120), life: rnd(0.3, 0.7), c: u.team === 'T' ? '#ff9f1c' : '#2ec4ff', s: 3 });
    }
  }

  function explode() {
    S.phase = 'boom';
    S.hole = { x: S.bomb.x, y: S.bomb.y, r: 135 };
    S.shake = 1.6;
    sfx('boom');
    S.units.forEach(function(u) {
      if (u.hp > 0 && dist(u, S.bomb) < 320 && u.team === 'CT') hurt(u, 999, true);
    });
    for (var i = 0; i < 220; i++) {
      var a = rnd(0, Math.PI * 2), sp = rnd(80, 620);
      S.parts.push({ x: S.bomb.x, y: S.bomb.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.6, 2.2),
        c: ['#fff4d6', '#ffcc66', '#ff9f1c', '#ff5a1f', '#444'][Math.floor(Math.random() * 5)], s: rnd(2, 7) });
    }
    S.bomb = null;
  }

  function endGame(win, title, sub) {
    if (S.over) return;
    S.over = true;
    mouse.down = false;
    $('ctResTitle').innerHTML = title;
    $('ctResTitle').style.color = win ? '#ff9f1c' : '#2ec4ff';
    $('ctResSub').textContent = sub + ' · CT down: ' + S.kills;
    setTimeout(function() { if (S) $('ctResult').classList.add('show'); }, win ? 200 : 700);
  }

  function hud() {
    var obj, mid = '';
    if (S.phase === 'assault') {
      obj = inside(S.player) ? 'Reach the server room (A) — hold E to plant' : 'Break into CityTrack';
      if (S.plant > 0) mid = 'Planting ' + Math.min(100, Math.round(S.plant / 3 * 100)) + '%<small>hold E</small>';
    } else if (S.phase === 'defend') {
      obj = 'Defend the bomb — ' + (S.defuse > 0 ? 'CT is defusing!' : 'hold the line');
      mid = Math.max(0, S.bombT).toFixed(1) + '<small>' + (S.defuse > 0 ? 'defuse ' + Math.round(S.defuse / 7 * 100) + '%' : 'until detonation') + '</small>';
    } else obj = 'CityTrack is burning';
    $('ctObj').textContent = obj;
    $('ctMid').innerHTML = mid;
    var ct = S.units.filter(function(u) { return u.team === 'CT' && u.hp > 0; }).length;
    $('ctTeam').innerHTML = S.units.filter(function(u) { return u.team === 'T'; }).map(function(u) {
      return '<span class="' + (u.hp > 0 ? '' : 'dead') + '">' + u.name + ' ' + Math.ceil(u.hp) + '</span>';
    }).join('<br>') + '<br><span style="color:#2ec4ff">CT alive ' + ct + '</span>';
  }

  // ── Kreslení ───────────────────────────────────────────
  function holeClip() {
    // oblast bez díry po výbuchu (evenodd)
    ctx.beginPath();
    ctx.rect(-50, -50, W + 100, H + 100);
    ctx.arc(S.hole.x, S.hole.y, S.hole.r, 0, Math.PI * 2);
    ctx.clip('evenodd');
  }

  function draw() {
    var c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#030507';
    c.fillRect(0, 0, canvas.width, canvas.height);
    var sh = S.shake * 14;
    c.setTransform(view.s, 0, 0, view.s, view.ox + rnd(-sh, sh) * view.s, view.oy + rnd(-sh, sh) * view.s);

    // ulice
    c.fillStyle = '#0b1117'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(46,196,255,0.06)'; c.lineWidth = 1;
    for (var gx = 0; gx <= W; gx += 50) { c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, H); c.stroke(); }
    for (var gy = 0; gy <= H; gy += 50) { c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke(); }
    c.strokeStyle = 'rgba(232,226,217,0.12)'; c.setLineDash([24, 18]); c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, 450); c.lineTo(660, 450); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(255,159,28,0.12)'; c.fillRect(20, 380, 110, 140);
    c.fillStyle = 'rgba(255,159,28,0.5)'; c.font = '12px "DM Mono", monospace'; c.fillText('T SPAWN', 40, 372);

    // podlaha budovy
    c.fillStyle = '#131c24'; c.fillRect(B.x, B.y, B.w, B.h);
    c.strokeStyle = 'rgba(255,255,255,0.04)';
    for (var tx = B.x; tx < B.x + B.w; tx += 30) { c.beginPath(); c.moveTo(tx, B.y); c.lineTo(tx, B.y + B.h); c.stroke(); }
    for (var ty = B.y; ty < B.y + B.h; ty += 30) { c.beginPath(); c.moveTo(B.x, ty); c.lineTo(B.x + B.w, ty); c.stroke(); }
    // místo A
    c.strokeStyle = 'rgba(255,159,28,0.55)'; c.lineWidth = 2; c.setLineDash([8, 6]);
    c.beginPath(); c.arc(SITE.x, SITE.y, SITE.r, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(255,159,28,0.6)'; c.font = '28px "Bebas Neue", sans-serif'; c.textAlign = 'center';
    c.fillText('A', SITE.x, SITE.y + 10); c.textAlign = 'left';

    // překážky
    cover.forEach(function(s, i) {
      c.fillStyle = i < 6 ? '#26313b' : '#1d2b36';
      c.fillRect(s[0], s[1], s[2], s[3]);
      c.strokeStyle = i < 6 ? 'rgba(232,226,217,0.15)' : 'rgba(46,196,255,0.35)';
      c.strokeRect(s[0] + 0.5, s[1] + 0.5, s[2] - 1, s[3] - 1);
      if (i >= 6 && s[3] > s[2]) { // blikající diody serverů
        for (var k = 0; k < 4; k++) {
          c.fillStyle = ((S.t * 3 + k + i) | 0) % 3 ? '#2ec4ff' : '#0a3b4d';
          c.fillRect(s[0] + 8, s[1] + 12 + k * 22, 4, 4);
        }
      }
    });

    // zdi (s dírou po výbuchu)
    c.save();
    if (S.hole) holeClip();
    c.fillStyle = '#3a4854';
    walls.forEach(function(s) { c.fillRect(s[0], s[1], s[2], s[3]); });
    c.restore();
    if (S.hole) { // spálené okraje
      c.strokeStyle = 'rgba(255,120,40,' + Math.max(0.15, 0.8 - S.boomT * 0.2) + ')'; c.lineWidth = 6;
      c.beginPath(); c.arc(S.hole.x, S.hole.y, S.hole.r, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(S.hole.x, S.hole.y, S.hole.r - 4, 0, Math.PI * 2); c.fill();
    }

    // bomba
    if (S.bomb) {
      var blink = (S.t * (S.bombT < 10 ? 8 : 3)) % 1 < 0.5;
      c.fillStyle = '#222'; c.fillRect(S.bomb.x - 10, S.bomb.y - 7, 20, 14);
      c.fillStyle = blink ? '#ff3b30' : '#551010'; c.fillRect(S.bomb.x - 3, S.bomb.y - 3, 6, 6);
      if (S.defuse > 0) {
        c.strokeStyle = '#2ec4ff'; c.lineWidth = 3;
        c.beginPath(); c.arc(S.bomb.x, S.bomb.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * S.defuse / 7); c.stroke();
      }
    }

    // plyn
    S.gas.forEach(function(g) {
      var a = Math.min(1, g.life / 1.2) * 0.55;
      var gr = c.createRadialGradient(g.x, g.y, 5, g.x, g.y, g.r);
      gr.addColorStop(0, 'rgba(170,220,120,' + a + ')');
      gr.addColorStop(1, 'rgba(120,170,90,0)');
      c.fillStyle = gr;
      for (var k = 0; k < 3; k++) {
        var o = S.t * 0.8 + k * 2.1;
        c.beginPath(); c.arc(g.x + Math.cos(o) * 12, g.y + Math.sin(o) * 12, g.r * (0.8 + k * 0.1), 0, Math.PI * 2); c.fill();
      }
    });
    S.nades.forEach(function(n) {
      var k = n.t / n.dur, x = n.sx + (n.tx - n.sx) * k, y = n.sy + (n.ty - n.sy) * k - Math.sin(k * Math.PI) * 40;
      c.fillStyle = '#9fd67a'; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
    });

    // jednotky
    S.units.forEach(function(u) {
      if (u.hp <= 0) {
        c.fillStyle = u.team === 'T' ? 'rgba(255,159,28,0.25)' : 'rgba(46,196,255,0.2)';
        c.beginPath(); c.arc(u.x, u.y, u.r, 0, Math.PI * 2); c.fill();
        return;
      }
      var col = u.team === 'T' ? '#ff9f1c' : '#2ec4ff';
      // zbraň
      c.strokeStyle = '#cfd6db'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(u.x, u.y); c.lineTo(u.x + Math.cos(u.angle) * (u.r + 10), u.y + Math.sin(u.angle) * (u.r + 10)); c.stroke();
      if (u.flash > 0) {
        c.fillStyle = '#fff2b0';
        c.beginPath(); c.arc(u.x + Math.cos(u.angle) * (u.r + 13), u.y + Math.sin(u.angle) * (u.r + 13), 5, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = col;
      c.beginPath(); c.arc(u.x, u.y, u.r, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.beginPath(); c.arc(u.x, u.y, u.r * 0.55, 0, Math.PI * 2); c.fill();
      if (u.isPlayer) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(u.x, u.y, u.r + 4, 0, Math.PI * 2); c.stroke(); }
      if (u.shield) {
        c.strokeStyle = '#9fe6ff'; c.lineWidth = 5;
        c.beginPath(); c.arc(u.x, u.y, u.r + 7, u.angle - 1.0, u.angle + 1.0); c.stroke();
      }
      if (u.gren) { c.fillStyle = '#9fd67a'; c.fillRect(u.x - 3, u.y - u.r - 9, 6, 6); }
      if (u.hp < u.maxHp) {
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(u.x - 14, u.y + u.r + 5, 28, 4);
        c.fillStyle = col; c.fillRect(u.x - 14, u.y + u.r + 5, 28 * u.hp / u.maxHp, 4);
      }
    });

    // střely a jiskry
    c.strokeStyle = 'rgba(255,240,200,0.9)'; c.lineWidth = 2;
    S.bullets.forEach(function(b) {
      c.strokeStyle = b.team === 'T' ? 'rgba(255,200,120,0.95)' : 'rgba(160,230,255,0.95)';
      c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012); c.stroke();
    });
    S.sparks.forEach(function(s) { c.fillStyle = s.c; c.fillRect(s.x - 2, s.y - 2, 4, 4); });

    // střecha CityTrack — zprůhlední, když jsme uvnitř
    if (S.roofA > 0.02) {
      c.save();
      c.globalAlpha = S.roofA;
      if (S.hole) holeClip();
      c.fillStyle = '#0e161d'; c.fillRect(B.x - 6, B.y - 6, B.w + 12, B.h + 12);
      c.strokeStyle = 'rgba(46,196,255,0.08)';
      for (var rx = B.x; rx < B.x + B.w; rx += 40) { c.beginPath(); c.moveTo(rx, B.y - 6); c.lineTo(rx, B.y + B.h + 6); c.stroke(); }
      c.strokeStyle = 'rgba(46,196,255,0.5)'; c.lineWidth = 2; c.strokeRect(B.x - 6, B.y - 6, B.w + 12, B.h + 12);
      // klimatizace
      c.fillStyle = '#1b2731';
      [[B.x + 40, B.y + 40], [B.x + B.w - 110, B.y + 40], [B.x + 40, B.y + B.h - 100], [B.x + B.w - 110, B.y + B.h - 100]].forEach(function(q) {
        c.fillRect(q[0], q[1], 70, 60);
        c.strokeStyle = 'rgba(255,255,255,0.08)'; c.beginPath(); c.arc(q[0] + 35, q[1] + 30, 20, 0, Math.PI * 2); c.stroke();
      });
      // logo: oko kamery
      var cx = B.x + B.w / 2, cy = B.y + B.h / 2 - 40;
      c.strokeStyle = '#2ec4ff'; c.lineWidth = 4;
      c.beginPath(); c.ellipse(cx, cy, 60, 30, 0, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#2ec4ff'; c.beginPath(); c.arc(cx, cy, 14, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#0e161d'; c.beginPath(); c.arc(cx + 4, cy - 4, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e8e2d9'; c.font = '64px "Bebas Neue", sans-serif'; c.textAlign = 'center';
      c.fillText('CITYTRACK', cx, cy + 95);
      c.fillStyle = 'rgba(232,226,217,0.4)'; c.font = '11px "DM Mono", monospace';
      c.fillText('WE SEE EVERYTHING', cx, cy + 118); c.textAlign = 'left';
      // blikající červená světla v rozích
      if ((S.t * 1.5) % 1 < 0.5) {
        c.fillStyle = '#ff3b30';
        [[B.x + 8, B.y + 8], [B.x + B.w - 8, B.y + 8], [B.x + 8, B.y + B.h - 8], [B.x + B.w - 8, B.y + B.h - 8]].forEach(function(q) {
          c.beginPath(); c.arc(q[0], q[1], 4, 0, Math.PI * 2); c.fill();
        });
      }
      c.restore();
    }

    // záblesk a částice výbuchu
    S.parts.forEach(function(q) {
      c.globalAlpha = Math.min(1, q.life * 1.5);
      c.fillStyle = q.c; c.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
    });
    c.globalAlpha = 1;
    if (S.phase === 'boom' && S.boomT < 0.5) {
      c.fillStyle = 'rgba(255,240,210,' + (0.9 - S.boomT * 1.8) + ')';
      c.fillRect(0, 0, W, H);
    }
    if (S.phase === 'boom') { // oheň v díře
      for (var f = 0; f < 6; f++) {
        var fa = S.t * 2 + f, fr = 30 + Math.sin(S.t * 5 + f) * 8;
        c.fillStyle = 'rgba(255,' + (100 + f * 20) + ',30,0.25)';
        c.beginPath(); c.arc(S.hole.x + Math.cos(fa) * 40, S.hole.y + Math.sin(fa) * 40, fr, 0, Math.PI * 2); c.fill();
      }
    }

    // zaměřovač
    if (!S.over) {
      var mw = mouseWorld();
      c.strokeStyle = '#ff9f1c'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(mw.x, mw.y, 8, 0, Math.PI * 2);
      c.moveTo(mw.x - 13, mw.y); c.lineTo(mw.x - 4, mw.y); c.moveTo(mw.x + 4, mw.y); c.lineTo(mw.x + 13, mw.y);
      c.moveTo(mw.x, mw.y - 13); c.lineTo(mw.x, mw.y - 4); c.moveTo(mw.x, mw.y + 4); c.lineTo(mw.x, mw.y + 13);
      c.stroke();
    }
    // okraj herní plochy
    c.strokeStyle = 'rgba(46,196,255,0.25)'; c.lineWidth = 2; c.strokeRect(0, 0, W, H);
  }
})();
