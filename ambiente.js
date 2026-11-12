/* Sonido ambiente por secciones y chimenea.
   El audio solo arranca tras un gesto del usuario (botón de sonido o chimenea). */
(function () {
  var SOUNDS = {
    grillos: { src: 'audio/grillos.mp3', vol: 0.9, label: 'Grillos de Ordal' },
    sinc1: { src: 'audio/sinc-1-r.mp3', vol: 1, label: 'Cenital: Fragmento ajeno' },
    sinc2: { src: 'audio/sinc-2-r.mp3', vol: 1, label: 'Cenital: Voz prestada' },
    sinc3: { src: 'audio/sinc-3-r.mp3', vol: 1, label: 'Cenital: El ni\u00f1o sin registro' },
    sinc4: { src: 'audio/sinc-4-r.mp3', vol: 1, label: 'Cenital: Los Registros Bajos' },
    sinc5: { src: 'audio/sinc-5-r.mp3', vol: 1, label: 'Cenital: La firma de Kessel' },
    sinc6: { src: 'audio/sinc-6-r.mp3', vol: 1, label: 'Cenital: La duda de Teo' },
    sinc7: { src: 'audio/sinc-7-r.mp3', vol: 1, label: 'Cenital: Treinta y ocho casos' },
    sinc8: { src: 'audio/sinc-8-r.mp3', vol: 1, label: 'Cenital: La firma de Praga' },
    sinc9: { src: 'audio/sinc-9-r.mp3', vol: 1, label: 'Cenital: El campo vacío' },
    sinc10: { src: 'audio/sinc-10-r.mp3', vol: 1, label: 'Cenital: El inventario' },
    sinc11: { src: 'audio/sinc-11-r.mp3', vol: 1, label: 'Cenital: Para quien vuelva primero' },
    luz: { src: 'audio/lo-que-la-luz-r.mp3', vol: 1, label: 'Vallormes: Lo que la luz dejó atrás' },
    vecino: { src: 'audio/un-vecino-r.mp3', vol: 1, label: 'Navalsarda: Un vecino de más' },
    buho: { src: 'audio/buho.mp3', vol: 0.9, label: 'Búho del jardín' },
    tren: { src: 'audio/tren-2.mp3', vol: 0.9, label: 'Tren lejano' },
    musica: { src: 'audio/musica-tres-reglas.mp3', vol: 0.8, label: 'Jazz de Tres reglas' },
    fuego: { src: 'audio/fuego.mp3', vol: 1, label: 'Chimenea' }
  };
  var ZONES = [['proximamente', 'grillos'], ['tres-reglas', 'musica'], ['lo-que-la-luz-dejo-atras', 'luz'], ['un-vecino-de-mas', 'vecino'], ['el-jardin-que-mira', 'buho'], ['via-libre', 'tren']];

  var SINC = ['fragmento-ajeno', 'voz-prestada', 'el-nino-sin-registro', 'los-registros-bajos', 'la-firma-de-kessel', 'la-duda-de-teo', 'treinta-y-ocho-casos', 'la-firma-de-praga', 'el-campo-vacio', 'el-inventario', 'para-quien-vuelva-primero'];
  var MAXV = 0.07; /* tope del volumen general: sonido de fondo muy suave; el control llega a 100 % = 0.07 */
  var ctx = null, master = null, nodes = {};
  var state = { ambient: false, fire: false, fireMuted: false, zone: null };
  var vol = 0.5;
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
    master.gain.value = vol * MAXV;
    master.connect(ctx.destination);
  }

  function ensure(name) {
    if (nodes[name]) return nodes[name].ready;
    var g = ctx.createGain();
    g.gain.value = 0;
    g.connect(master);
    var n = nodes[name] = { gain: g };
    n.ready = fetch(SOUNDS[name].src)
      .then(function (r) { if (!r.ok) throw new Error('audio ' + r.status); return r.arrayBuffer(); })
      .then(function (b) {
        return new Promise(function (res, rej) { ctx.decodeAudioData(b, res, rej); });
      })
      .then(function (buf) {
        var s = ctx.createBufferSource();
        s.buffer = buf; s.loop = true; s.connect(g); s.start();
        n.src = s;
        update();
      })
      .catch(function () { delete nodes[name]; setTimeout(update, 4000); });
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
    var sec = document.getElementById('sincronia');
    if (sec) {
      var sr = sec.getBoundingClientRect();
      if (sr.top <= y && sr.bottom >= y) {
        var best = null, bd = 1e9;
        SINC.forEach(function (id, n) {
          var b = document.getElementById(id);
          if (!b) return;
          var br = b.getBoundingClientRect(), d = Math.abs((br.top + br.bottom) / 2 - y);
          if (d < bd) { bd = d; best = 'sinc' + (n + 1); }
        });
        return best;
      }
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
  SINC.forEach(function (id, n) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('mouseenter', function () { var z = 'sinc' + (n + 1); if (state.zone !== z) { state.zone = z; update(); } });
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
    if (master) master.gain.setTargetAtTime(vol * MAXV, ctx.currentTime, 0.05);
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
    if (on) { init(); setFull(true); size(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
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

  /* Hoguera: fotografías reales de fuego que se funden entre sí, con calor que ondula,
     parpadeo de luz y brasas que suben por encima. */
  var frames = panel.querySelectorAll('.fire-frames img.l'), dim = document.getElementById('fire-dim');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, cur = 0, nextSwap = 0, flick = 1, nextFlick = 0;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var r = cvs.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    cvs.width = W * dpr; cvs.height = H * dpr;
  }
  window.addEventListener('resize', function () { if (state.fire) size(); });

  function swap() {
    var n = cur;
    while (n === cur) n = Math.floor(Math.random() * frames.length);
    frames[cur].classList.remove('on');
    frames[n].classList.add('on');
    cur = n;
  }

  function spawn(dt) {
    var n = dt * 22 + (Math.random() < (dt * 22) % 1 ? 1 : 0);
    for (var i = 0; i < n && parts.length < 70; i++) {
      parts.push({ x: W * (0.3 + Math.random() * 0.4), y: H * (0.78 + Math.random() * 0.12), vx: (Math.random() - 0.5) * 30, vy: -(H * (0.22 + Math.random() * 0.4)), life: 0, max: 1.6 + Math.random() * 2.4, s: 0.7 + Math.random() * 1.6, ph: Math.random() * 6.28 });
    }
  }

  function frame(now) {
    raf = state.fire ? requestAnimationFrame(frame) : 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;

    if (now > nextSwap) { if (nextSwap) swap(); nextSwap = now + 2600 + Math.random() * 2600; }
    if (now > nextFlick) { flick = 0.86 + Math.random() * 0.14; nextFlick = now + 60 + Math.random() * 110; }
    var f = reduce ? 1 : flick * (0.97 + Math.sin(now / 900) * 0.03);
    dim.style.opacity = ((1 - f) * 1.3).toFixed(3);
    glow.style.opacity = state.fire ? (0.55 * f).toFixed(3) : 0;

    var c = cvs.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    if (reduce) return;
    spawn(dt);
    c.globalCompositeOperation = 'lighter';
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      var k = p.life / p.max;
      p.x += (p.vx + Math.sin(now / 420 + p.ph) * 26) * dt;
      p.y += p.vy * dt;
      p.vy *= 0.992;
      var a = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
      var r = p.s * (1 - k * 0.5), g = Math.round(190 - k * 110);
      var rg = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
      rg.addColorStop(0, 'rgba(255,' + g + ',70,' + (0.95 * a) + ')');
      rg.addColorStop(1, 'rgba(255,100,20,0)');
      c.fillStyle = rg;
      c.fillRect(p.x - r * 4, p.y - r * 4, r * 8, r * 8);
    }
    c.globalCompositeOperation = 'source-over';
  }
})();