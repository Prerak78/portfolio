/* =========================================================
   RoboReach – Interactive Theme, Navigation & Mecanum Sim
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 1. Theme Toggle (Dark / Light) ---------- */
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
    try {
      localStorage.setItem('roboreach-theme', theme);
    } catch (_) {}
  }

  (function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem('roboreach-theme');
    } catch (_) {}

    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      applyTheme('light');
    } else {
      applyTheme('dark');
    }
  })();

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- 2. Responsive Mobile Navigation ---------- */
  const menuToggle = document.getElementById('menu-toggle');
  const primaryNav = document.getElementById('primary-nav');

  function setMenuOpen(isOpen) {
    if (!menuToggle || !primaryNav) return;
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    primaryNav.classList.toggle('open', isOpen);
  }

  if (menuToggle && primaryNav) {
    menuToggle.addEventListener('click', () => {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      setMenuOpen(!expanded);
    });

    primaryNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuOpen(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    });
  }

  /* ---------- 3. Scroll Reveal Animations ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- 4. Footer Year ---------- */
  const copyYear = document.getElementById('copy-year');
  if (copyYear) {
    copyYear.textContent = String(Math.max(2026, new Date().getFullYear()));
  }

  /* ---------- 5. Mecanum Wheel SVG Generator ---------- */
  const ROLLER_L = 'M-4 -6 L26 8 M-4 6 L26 20 M-4 18 L26 32 M-4 30 L26 44 M-4 42 L26 56 M-4 -18 L26 -4';
  const ROLLER_R = 'M-4 8 L26 -6 M-4 20 L26 6 M-4 32 L26 18 M-4 44 L26 30 M-4 56 L26 42 M-4 -4 L26 -18';
  let clipCounter = 0;

  function buildWheelMarkup(x, y, width, height, pattern, running) {
    clipCounter += 1;
    const cid = 'wheel-clip-' + clipCounter;
    const style = running ? 'animation-play-state:running;animation-duration:1.3s' : '';
    return (
      `<g transform="translate(${x},${y})">` +
        `<clipPath id="${cid}"><rect width="${width}" height="${height}" rx="5"/></clipPath>` +
        `<rect width="${width}" height="${height}" rx="5" fill="var(--wheel-bg)" stroke="var(--electric)" stroke-width="1.5"/>` +
        `<g clip-path="url(#${cid})">` +
          `<g class="roll" style="${style}">` +
            `<path d="${pattern}" stroke="var(--accent)" stroke-width="3"/>` +
          `</g>` +
        `</g>` +
      `</g>`
    );
  }

  // Inject animated wheels into the Hero Robot SVG
  const heroWheelLayer = document.querySelector('.hero-wheels-layer');
  if (heroWheelLayer) {
    const heroCoords = [
      [56, 118, 24, 52, ROLLER_L],
      [240, 118, 24, 52, ROLLER_R],
      [56, 198, 24, 52, ROLLER_R],
      [240, 198, 24, 52, ROLLER_L]
    ];
    heroWheelLayer.innerHTML = heroCoords
      .map((c) => buildWheelMarkup(c[0], c[1], c[2], c[3], c[4], true))
      .join('');
  }

  /* ---------- 6. Interactive Mecanum Robot Simulation ---------- */
  const stage = document.getElementById('stage');
  const rb = document.getElementById('rb');
  const demoSvg = document.getElementById('demoSvg');
  const motionReadout = document.getElementById('motion-readout');
  const wheelBoxes = document.querySelectorAll('#wheels-telemetry .wheel-box');
  const ctrlButtons = document.querySelectorAll('.ctrl-btn[data-cmd]');
  const resetBtn = document.getElementById('reset-sim');
  const stopBtn = document.getElementById('stop-sim');
  const armBtn = document.getElementById('toggle-arm');
  const gripBtn = document.getElementById('toggle-grip');
  const simArmSlide = document.getElementById('sim-arm-slide');
  const simGripper = document.getElementById('sim-gripper');

  if (!stage || !rb || !demoSvg) return;

  const simCoords = [
    [20, 82, 22, 46, ROLLER_L],
    [158, 82, 22, 46, ROLLER_R],
    [20, 138, 22, 46, ROLLER_R],
    [158, 138, 22, 46, ROLLER_L]
  ];
  const simWheelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  simWheelGroup.innerHTML = simCoords
    .map((c) => buildWheelMarkup(c[0], c[1], c[2], c[3], c[4], false))
    .join('');
  demoSvg.insertBefore(simWheelGroup, demoSvg.firstChild);

  const simRollers = demoSvg.querySelectorAll('.roll');

  const CMD_VECTORS = {
    fwd:    { f:  1, s:  0, t:  0 },
    bwd:    { f: -1, s:  0, t:  0 },
    right:  { f:  0, s:  1, t:  0 },
    left:   { f:  0, s: -1, t:  0 },
    diagFR: { f:  1, s:  1, t:  0 },
    diagFL: { f:  1, s: -1, t:  0 },
    diagBR: { f: -1, s:  1, t:  0 },
    diagBL: { f: -1, s: -1, t:  0 },
    rotR:   { f:  0, s:  0, t:  1 },
    rotL:   { f:  0, s:  0, t: -1 }
  };

  const activeInputs = new Set();
  let posX = 0;
  let posY = 0;
  let angleDeg = 0;
  let rafId = 0;
  let initialized = false;

  function centerRobot() {
    const rect = stage.getBoundingClientRect();
    posX = rect.width / 2 - 46;
    posY = rect.height / 2 - 55;
    angleDeg = 0;
    renderTransform();
  }

  function renderTransform() {
    rb.style.transform = `translate(${posX}px, ${posY}px) rotate(${angleDeg}deg)`;
  }

  function getCombinedVector() {
    let f = 0;
    let s = 0;
    let t = 0;

    activeInputs.forEach((cmd) => {
      const vec = CMD_VECTORS[cmd];
      if (!vec) return;
      f += vec.f;
      s += vec.s;
      t += vec.t;
    });

    return {
      f: Math.max(-1, Math.min(1, f)),
      s: Math.max(-1, Math.min(1, s)),
      t: Math.max(-1, Math.min(1, t))
    };
  }

  function describeMotion(f, s, t) {
    const parts = [];
    if (f > 0 && s > 0) parts.push('Diagonal Forward-Right');
    else if (f > 0 && s < 0) parts.push('Diagonal Forward-Left');
    else if (f < 0 && s > 0) parts.push('Diagonal Reverse-Right');
    else if (f < 0 && s < 0) parts.push('Diagonal Reverse-Left');
    else if (f > 0) parts.push('Moving Forward');
    else if (f < 0) parts.push('Moving Reverse');
    else if (s > 0) parts.push('Strafing Right');
    else if (s < 0) parts.push('Strafing Left');

    if (t > 0) parts.push('Rotating Clockwise');
    else if (t < 0) parts.push('Rotating Counter-Clockwise');

    return parts.length ? parts.join(' + ') : 'Stationary';
  }

  function updateSimulationState() {
    const { f, s, t } = getCombinedVector();
    const wheels = [f + s + t, f - s - t, f - s + t, f + s - t];

    simRollers.forEach((el, idx) => {
      const val = wheels[idx];
      el.classList.toggle('rv', val > 0);
      el.style.animationPlayState = val !== 0 ? 'running' : 'paused';
    });

    wheelBoxes.forEach((box, idx) => {
      const val = wheels[idx];
      const dirEl = box.querySelector('.w-dir');
      const txtEl = box.querySelector('.w-txt');
      box.classList.remove('is-fwd', 'is-rev');

      if (val > 0) {
        box.classList.add('is-fwd');
        if (dirEl) dirEl.textContent = '▲';
        if (txtEl) txtEl.textContent = 'Fwd';
      } else if (val < 0) {
        box.classList.add('is-rev');
        if (dirEl) dirEl.textContent = '▼';
        if (txtEl) txtEl.textContent = 'Rev';
      } else {
        if (dirEl) dirEl.textContent = '–';
        if (txtEl) txtEl.textContent = 'Idle';
      }
    });

    ctrlButtons.forEach((btn) => {
      btn.classList.toggle('on', activeInputs.has(btn.dataset.cmd));
    });

    if (motionReadout) {
      motionReadout.textContent = 'State: ' + describeMotion(f, s, t);
    }

    const moving = f !== 0 || s !== 0 || t !== 0;
    if (moving && !rafId) {
      rafId = requestAnimationFrame(stepPhysics);
    }
  }

  function stepPhysics() {
    const { f, s, t } = getCombinedVector();
    if (f === 0 && s === 0 && t === 0) {
      rafId = 0;
      return;
    }

    const rect = stage.getBoundingClientRect();
    const rad = (angleDeg * Math.PI) / 180;
    const len = Math.hypot(f, s) || 1;
    const nf = f / len;
    const ns = s / len;
    const speed = 2.8;

    posX += (Math.sin(rad) * nf + Math.cos(rad) * ns) * speed;
    posY += (-Math.cos(rad) * nf + Math.sin(rad) * ns) * speed;
    angleDeg += t * 2.3;

    posX = Math.max(-8, Math.min(rect.width - 84, posX));
    posY = Math.max(-8, Math.min(rect.height - 102, posY));

    renderTransform();
    rafId = requestAnimationFrame(stepPhysics);
  }

  function stopAll() {
    activeInputs.clear();
    updateSimulationState();
  }

  ctrlButtons.forEach((btn) => {
    const cmd = btn.dataset.cmd;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      activeInputs.add(cmd);
      updateSimulationState();
    });

    ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
      btn.addEventListener(evt, () => {
        activeInputs.delete(cmd);
        updateSimulationState();
      });
    });
  });

  if (stopBtn) stopBtn.addEventListener('click', stopAll);
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      stopAll();
      centerRobot();
    });
  }

  if (armBtn && simArmSlide) {
    armBtn.addEventListener('click', () => {
      const next = armBtn.getAttribute('aria-pressed') !== 'true';
      armBtn.setAttribute('aria-pressed', String(next));
      armBtn.textContent = next ? 'Retract Arm' : 'Extend Arm';
      simArmSlide.classList.toggle('extended', next);
    });
  }

  if (gripBtn && simGripper) {
    gripBtn.addEventListener('click', () => {
      const next = gripBtn.getAttribute('aria-pressed') !== 'true';
      gripBtn.setAttribute('aria-pressed', String(next));
      gripBtn.textContent = next ? 'Open Gripper' : 'Close Gripper';
      simGripper.classList.toggle('closed', next);
    });
  }

  const KEY_MAP = {
    ArrowUp: 'fwd',
    ArrowDown: 'bwd',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'fwd',
    W: 'fwd',
    s: 'bwd',
    S: 'bwd',
    a: 'left',
    A: 'left',
    d: 'right',
    D: 'right',
    q: 'rotL',
    Q: 'rotL',
    e: 'rotR',
    E: 'rotR'
  };

  window.addEventListener('keydown', (e) => {
    const cmd = KEY_MAP[e.key];
    if (!cmd) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) return;
    e.preventDefault();
    if (!activeInputs.has(cmd)) {
      activeInputs.add(cmd);
      updateSimulationState();
    }
  });

  window.addEventListener('keyup', (e) => {
    const cmd = KEY_MAP[e.key];
    if (!cmd) return;
    activeInputs.delete(cmd);
    updateSimulationState();
  });

  window.addEventListener('blur', stopAll);

  window.addEventListener('resize', () => {
    if (!initialized) {
      centerRobot();
      initialized = true;
    } else {
      const rect = stage.getBoundingClientRect();
      posX = Math.max(-8, Math.min(rect.width - 84, posX));
      posY = Math.max(-8, Math.min(rect.height - 102, posY));
      renderTransform();
    }
  });

  centerRobot();
  initialized = true;
})();