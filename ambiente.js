/* Sonido ambiente por secciones y chimenea.
   El audio solo arranca tras un gesto del usuario (botón de sonido o chimenea). */
(function () {
  var SOUNDS = {
    grillos: { src: 'audio/grillos.mp3', vol: 0.9, label: 'Grillos de Ordal' },
    zumbido: { src: 'audio/zumbido.mp3', vol: 0.7, label: 'Zumbido de Cenital' },
    buho: { src: 'audio/buho.mp3', vol: 0.9, label: 'Búho del jardín' },
    tren: { src: 'audio/tren.mp3', vol: 0.9, label: 'Tren lejano' },
    fuego: { src: 'audio/fuego.mp3', vol: 1, label: 'Chimenea' }
  };
  var ZONES = [['proximamente', 'grillos'], ['sincronia', 'zumbido'], ['el-jardin-que-mira', 'buho'], ['via-libre', 'tren']];

  var ctx = null, master = null, nodes = {};
  var state = { ambient: false, fire: false, fireMuted: false, zone: null };
  var vol = 0.6;
  try { var sv = parseFloat(localStorage.getItem('volumen')); if (sv >= 0 && sv <= 1) vol = sv; } catch (e) {}

  var btn = document.getElementById('sound-btn'), label = document.getElementById('sound-label'), slider = document.getElementById('sound-vol');
  var box = document.getElementById('sound');
  slider.value = Math.round(vol * 100);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = vol;
    master.connect(ctx.destination);
  }

  function ensure(name) {
    if (nodes[name]) return nodes[name].ready;
    var g = ctx.createGain();
    g.gain.value = 0;
    g.connect(master);
    var n = nodes[name] = { gain: g };
    n.ready = fetch(SOUNDS[name].src)
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (b) {
        return new Promise(function (res, rej) { ctx.decodeAudioData(b, res, rej); });
      })
      .then(function (buf) {
        var s = ctx.createBufferSource();
        s.buffer = buf; s.loop = true; s.connect(g); s.start();
        n.src = s;
        update();
      })
      .catch(function () { delete nodes[name]; });
    return n.ready;
  }

  function level(name) {
    if (name === 'fuego') return state.fire && !state.fireMuted ? 1 : 0;
    if (!state.ambient || state.zone !== name) return 0;
    return state.fire ? 0.2 : 1;
  }

  function update() {
    if (!ctx) return;
    Object.keys(SOUNDS).forEach(function (name) {
      var l = level(name);
      if (l > 0 && !nodes[name]) ensure(name);
      var n = nodes[name];
      if (n && n.src) n.gain.gain.setTargetAtTime(l * SOUNDS[name].vol, ctx.currentTime, 0.7);
    });
    var z = state.ambient && state.zone ? SOUNDS[state.zone].label : 'Sonido ambiente';
    label.textContent = state.ambient ? (state.fire ? 'Sonido ambiente (bajo)' : z) : 'Sonido ambiente';
  }

  /* zona activa según scroll y ratón */
  function zoneAt(y) {
    for (var i = 0; i < ZONES.length; i++) {
      var el = document.getElementById(ZONES[i][0]);
      if (!el) continue;
      var r = el.getBoundingClientRect();
      if (r.top <= y && r.bottom >= y) return ZONES[i][1];
    }
    return null;
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var z = zoneAt(window.innerHeight * 0.5);
      if (z !== state.zone) { state.zone = z; update(); }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  ZONES.forEach(function (z) {
    var el = document.getElementById(z[0]);
    if (!el) return;
    el.addEventListener('mouseenter', function () { if (state.zone !== z[1]) { state.zone = z[1]; update(); } });
  });
  state.zone = zoneAt(window.innerHeight * 0.5);

  btn.addEventListener('click', function () {
    state.ambient = !state.ambient;
    btn.setAttribute('aria-pressed', state.ambient ? 'true' : 'false');
    box.classList.toggle('on', state.ambient);
    if (state.ambient) init();
    update();
  });
  slider.addEventListener('input', function () {
    vol = slider.value / 100;
    if (master) master.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
    try { localStorage.setItem('volumen', String(vol)); } catch (e) {}
  });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (state.ambient || state.fire) ctx.resume();
  });

  /* ---------- chimenea ---------- */
  var panel = document.getElementById('chimenea'), cvs = document.getElementById('fire-canvas');
  var openBtn = document.getElementById('fire-open'), fullBtn = document.getElementById('fire-full');
  var muteBtn = document.getElementById('fire-mute'), closeBtn = document.getElementById('fire-close');
  var glow = document.getElementById('fire-glow');
  var raf = 0, parts = [], last = 0, full = false;

  function setOpen(on) {
    state.fire = on;
    panel.classList.toggle('open', on);
    glow.classList.toggle('on', on);
    document.body.classList.toggle('fire-panel', on && !full);
    openBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
    panel.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (!on) setFull(false);
    if (on) { init(); size(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    update();
  }
  function setFull(on) {
    full = on;
    panel.classList.toggle('full', on);
    document.body.classList.toggle('fire-full', on);
    document.body.classList.toggle('fire-panel', state.fire && !on);
    fullBtn.textContent = on ? 'Reducir' : 'Pantalla completa';
    size();
  }
  openBtn.addEventListener('click', function () { setOpen(!state.fire); });
  closeBtn.addEventListener('click', function () { setOpen(false); });
  fullBtn.addEventListener('click', function () { setFull(!full); });
  muteBtn.addEventListener('click', function () {
    state.fireMuted = !state.fireMuted;
    muteBtn.setAttribute('aria-pressed', state.fireMuted ? 'true' : 'false');
    muteBtn.textContent = state.fireMuted ? 'Activar crepitar' : 'Silenciar crepitar';
    update();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.fire) { if (full) setFull(false); else setOpen(false); }
  });

  var W = 0, H = 0, stones = null, dpr = 1;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var r = cvs.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    cvs.width = W * dpr; cvs.height = H * dpr;
    stones = null;
  }
  window.addEventListener('resize', function () { if (state.fire) size(); });

  function geom() {
    var fw = Math.min(W * 0.94, H * 1.9), fh = Math.min(H * 0.97, fw * 0.66);
    var fx = (W - fw) / 2, fy = H - fh;
    var ow = fw * 0.6, oh = fh * 0.74, ox = fx + (fw - ow) / 2, oy = fy + fh - oh;
    return { fx: fx, fy: fy, fw: fw, fh: fh, ox: ox, oy: oy, ow: ow, oh: oh };
  }
  function openingPath(c, g, keep) {
    var r = g.ow * 0.5;
    if (!keep) c.beginPath();
    c.moveTo(g.ox, g.oy + g.oh);
    c.lineTo(g.ox, g.oy + r * 0.6);
    c.quadraticCurveTo(g.ox, g.oy, g.ox + r, g.oy);
    c.quadraticCurveTo(g.ox + g.ow, g.oy, g.ox + g.ow, g.oy + r * 0.6);
    c.lineTo(g.ox + g.ow, g.oy + g.oh);
    c.closePath();
  }
  function seeded(seed) { return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
  function buildStones(g) {
    var rnd = seeded(77), arr = [], sh = Math.max(14, g.fh / 11), y;
    for (y = g.fy; y < g.fy + g.fh; y += sh) {
      var x = g.fx - (rnd() * 40), row = Math.round((y - g.fy) / sh);
      if (row % 2) x -= 22;
      while (x < g.fx + g.fw) {
        var sw = 38 + rnd() * 54, t = 28 + Math.floor(rnd() * 26);
        arr.push([x, y, sw - 3, sh - 3, 'rgb(' + t + ',' + (t - 4) + ',' + (t - 9) + ')']);
        x += sw;
      }
    }
    return arr;
  }

  function spawn(g, dt) {
    var n = Math.round(dt * 140);
    for (var i = 0; i < n && parts.length < 170; i++) {
      var cx = g.ox + g.ow / 2, spread = g.ow * 0.3;
      var x = cx + (Math.random() + Math.random() - 1) * spread;
      var edge = 1 - Math.abs(x - cx) / spread;
      parts.push({ x: x, y: g.oy + g.oh - g.oh * 0.1, vx: (Math.random() - 0.5) * 16, vy: -(g.oh * (0.35 + Math.random() * 0.45)) * (0.6 + edge * 0.6) / 1.2, life: 0, max: 0.7 + Math.random() * 0.9, s: g.ow * (0.07 + Math.random() * 0.07), ember: false });
    }
    if (Math.random() < dt * 9 && parts.length < 200) {
      parts.push({ x: g.ox + g.ow * (0.3 + Math.random() * 0.4), y: g.oy + g.oh * 0.8, vx: (Math.random() - 0.5) * 40, vy: -(g.oh * (0.5 + Math.random() * 0.7)), life: 0, max: 1.6 + Math.random() * 1.8, s: 2.2, ember: true });
    }
  }

  function frame(now) {
    raf = state.fire ? requestAnimationFrame(frame) : 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var c = cvs.getContext('2d'), g = geom();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#0b0705'; c.fillRect(0, 0, W, H);
    if (!stones) stones = buildStones(g);

    /* interior */
    c.save(); openingPath(c, g); c.clip();
    var bg = c.createLinearGradient(0, g.oy, 0, g.oy + g.oh);
    bg.addColorStop(0, '#0a0503'); bg.addColorStop(1, '#2a0f06');
    c.fillStyle = bg; c.fillRect(g.ox, g.oy, g.ow, g.oh);
    var flick = 0.8 + Math.sin(now / 130) * 0.08 + Math.sin(now / 47) * 0.06;
    var gl = c.createRadialGradient(g.ox + g.ow / 2, g.oy + g.oh, 0, g.ox + g.ow / 2, g.oy + g.oh, g.ow * 0.9);
    gl.addColorStop(0, 'rgba(255,150,40,' + (0.55 * flick) + ')'); gl.addColorStop(1, 'rgba(255,90,10,0)');
    c.fillStyle = gl; c.fillRect(g.ox, g.oy, g.ow, g.oh);

    /* troncos */
    var ly = g.oy + g.oh - g.oh * 0.1;
    function log(x, y, w, h, rot) {
      c.save(); c.translate(x, y); c.rotate(rot);
      var lg = c.createLinearGradient(0, -h / 2, 0, h / 2);
      lg.addColorStop(0, '#5a3a22'); lg.addColorStop(0.5, '#2b1809'); lg.addColorStop(1, '#120a04');
      c.fillStyle = lg; c.beginPath();
      if (c.roundRect) c.roundRect(-w / 2, -h / 2, w, h, h / 2); else c.rect(-w / 2, -h / 2, w, h);
      c.fill(); c.restore();
    }
    log(g.ox + g.ow * 0.5, ly + g.oh * 0.03, g.ow * 0.7, g.oh * 0.11, 0.05);
    log(g.ox + g.ow * 0.36, ly - g.oh * 0.03, g.ow * 0.5, g.oh * 0.1, -0.18);
    log(g.ox + g.ow * 0.64, ly - g.oh * 0.03, g.ow * 0.5, g.oh * 0.1, 0.2);

    /* llamas y brasas */
    spawn(g, dt);
    c.globalCompositeOperation = 'lighter';
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      var k = p.life / p.max;
      p.x += (p.vx + Math.sin(now / 200 + i) * (p.ember ? 22 : 14)) * dt;
      p.y += p.vy * dt;
      p.vy *= p.ember ? 0.995 : 0.985;
      if (p.ember) {
        c.fillStyle = 'rgba(255,' + Math.round(190 - k * 90) + ',60,' + (1 - k) + ')';
        c.beginPath(); c.arc(p.x, p.y, p.s * (1 - k * 0.6), 0, 6.283); c.fill();
      } else {
        var r = p.s * (1 - k * 0.7) * 1.6;
        var R = 255, G = Math.round(235 - k * 175), B = Math.round(160 - k * 150), A = (1 - k) * 0.17;
        var rg = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        rg.addColorStop(0, 'rgba(' + R + ',' + G + ',' + B + ',' + A + ')');
        rg.addColorStop(1, 'rgba(' + R + ',' + Math.round(G * 0.4) + ',0,0)');
        c.fillStyle = rg; c.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      }
    }
    c.globalCompositeOperation = 'source-over';
    c.restore();

    /* marco de piedra, con hueco */
    c.save();
    c.beginPath(); c.rect(g.fx, g.fy, g.fw, g.fh); openingPath(c, g, true);
    c.clip('evenodd');
    stones.forEach(function (s) { c.fillStyle = s[4]; c.fillRect(s[0], s[1], s[2], s[3]); });
    var warm = c.createRadialGradient(g.ox + g.ow / 2, g.oy + g.oh, g.ow * 0.2, g.ox + g.ow / 2, g.oy + g.oh, g.fw * 0.75);
    warm.addColorStop(0, 'rgba(255,140,40,' + (0.34 * flick) + ')'); warm.addColorStop(1, 'rgba(255,140,40,0)');
    c.fillStyle = warm; c.fillRect(g.fx, g.fy, g.fw, g.fh);
    c.restore();
    /* repisa */
    c.fillStyle = '#3a2615'; c.fillRect(g.fx - 6, g.fy - 10, g.fw + 12, 12);
    c.fillStyle = 'rgba(255,200,120,0.25)'; c.fillRect(g.fx - 6, g.fy - 10, g.fw + 12, 2);
    /* suelo del hogar */
    c.fillStyle = '#16100c'; c.fillRect(0, H - 6, W, 6);

    glow.style.opacity = state.fire ? (0.55 * flick).toFixed(3) : 0;
  }
})();
