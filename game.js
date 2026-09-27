'use strict';
/*
 * GB TENNIS — clone jouable du jeu "Tennis" Game Boy (1989)
 * Vanilla JS + Canvas 2D, résolution native 160x144, palette 4 tons de vert.
 */

// ---------------------------------------------------------------------------
// Canvas & palette
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const PAL = {
  lightest: '#9bbc0f',
  light:    '#8bac0f',
  dark:     '#306230',
  darkest:  '#0f380f',
};

// ---------------------------------------------------------------------------
// Audio (bips 8-bit via WebAudio, générés, pas de fichier externe)
// ---------------------------------------------------------------------------
const Audio8 = (() => {
  let actx = null;
  function ctxReady() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function beep(freq, dur, type = 'square', vol = 0.06) {
    try {
      const ac = ctxReady();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + dur);
    } catch (e) { /* audio indisponible, silencieux */ }
  }
  return {
    hit()    { beep(320, 0.06, 'square', 0.07); },
    bounce() { beep(180, 0.05, 'square', 0.05); },
    net()    { beep(90,  0.15, 'sawtooth', 0.06); },
    out()    { beep(140, 0.2,  'sawtooth', 0.05); },
    point()  { beep(520, 0.09, 'square', 0.06); setTimeout(() => beep(660, 0.12, 'square', 0.06), 90); },
    game()   { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.14, 'square', 0.07), i * 110)); },
    menu()   { beep(440, 0.04, 'square', 0.05); },
    start()  { beep(300, 0.05, 'square', 0.06); setTimeout(() => beep(500, 0.08, 'square', 0.06), 60); },
  };
})();

// ---------------------------------------------------------------------------
// Entrées clavier / tactile
// ---------------------------------------------------------------------------
const Input = {
  p1: { up: false, down: false, left: false, right: false, hit: false, lob: false },
  p2: { up: false, down: false, left: false, right: false, hit: false, lob: false },
  start: false, select: false,
  _pressedEdge: { start: false, select: false, p1hit: false, p1lob: false, p2hit: false, p2lob: false },
};

const KEYMAP_P1 = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  Space: 'hit', KeyZ: 'hit', ShiftLeft: 'lob', ShiftRight: 'lob', KeyX: 'lob',
};
const KEYMAP_P2 = {
  KeyI: 'up', KeyK: 'down', KeyJ: 'left', KeyL: 'right',
  KeyO: 'hit', KeyP: 'lob',
};

window.addEventListener('keydown', (e) => {
  if (KEYMAP_P1[e.code]) {
    const act = KEYMAP_P1[e.code];
    if (act === 'hit' && !Input.p1.hit) Input._pressedEdge.p1hit = true;
    if (act === 'lob' && !Input.p1.lob) Input._pressedEdge.p1lob = true;
    Input.p1[act] = true;
    e.preventDefault();
  }
  if (KEYMAP_P2[e.code]) {
    const act = KEYMAP_P2[e.code];
    if (act === 'hit' && !Input.p2.hit) Input._pressedEdge.p2hit = true;
    if (act === 'lob' && !Input.p2.lob) Input._pressedEdge.p2lob = true;
    Input.p2[act] = true;
    e.preventDefault();
  }
  if (e.code === 'Enter') { if (!Input.start) Input._pressedEdge.start = true; Input.start = true; e.preventDefault(); }
  if (e.code === 'Tab')   { if (!Input.select) Input._pressedEdge.select = true; Input.select = true; e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  if (KEYMAP_P1[e.code]) Input.p1[KEYMAP_P1[e.code]] = false;
  if (KEYMAP_P2[e.code]) Input.p2[KEYMAP_P2[e.code]] = false;
  if (e.code === 'Enter') Input.start = false;
  if (e.code === 'Tab') Input.select = false;
});

// Boutons tactiles / souris (D-pad, A, B, Start, Select)
function bindHold(el, onDown, onUp) {
  if (!el) return;
  const down = (ev) => { ev.preventDefault(); onDown(); };
  const up = (ev) => { ev.preventDefault(); onUp(); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointerleave', up);
  el.addEventListener('pointercancel', up);
}
document.querySelectorAll('.dpad-btn').forEach((btn) => {
  const dir = btn.dataset.dir;
  bindHold(btn, () => { Input.p1[dir] = true; }, () => { Input.p1[dir] = false; });
});
bindHold(document.getElementById('btnA'),
  () => { if (!Input.p1.hit) Input._pressedEdge.p1hit = true; Input.p1.hit = true; },
  () => { Input.p1.hit = false; });
bindHold(document.getElementById('btnB'),
  () => { if (!Input.p1.lob) Input._pressedEdge.p1lob = true; Input.p1.lob = true; },
  () => { Input.p1.lob = false; });
bindHold(document.getElementById('btnStart'),
  () => { if (!Input.start) Input._pressedEdge.start = true; Input.start = true; },
  () => { Input.start = false; });
bindHold(document.getElementById('btnSelect'),
  () => { if (!Input.select) Input._pressedEdge.select = true; Input.select = true; },
  () => { Input.select = false; });
canvas.addEventListener('pointerdown', () => {
  if (!Input.p1.hit) Input._pressedEdge.p1hit = true;
  Input.p1.hit = true;
});
canvas.addEventListener('pointerup', () => { Input.p1.hit = false; });

function consumeEdge(name) {
  if (Input._pressedEdge[name]) { Input._pressedEdge[name] = false; return true; }
  return false;
}

// ---------------------------------------------------------------------------
// Géométrie du court & projection pseudo-3D (style Game Boy Tennis)
// ---------------------------------------------------------------------------
const COURT_W = 100;      // largeur simple (couloir de simple)
const COURT_H = 220;      // profondeur totale ligne de fond à ligne de fond
const NET_Y = COURT_H / 2;
const SERVICE_DEPTH = 62; // distance filet -> ligne de service

const PROJ = {
  topY: 30, bottomY: 140,
  farHalfW: 26, nearHalfW: 76,
  centerX: 80,
};

function project(wx, wy) {
  const t = Math.min(1, Math.max(0, wy / COURT_H));
  const tp = Math.pow(t, 1.2);
  const screenY = PROJ.topY + tp * (PROJ.bottomY - PROJ.topY);
  const halfW = PROJ.farHalfW + t * (PROJ.nearHalfW - PROJ.farHalfW);
  const screenX = PROJ.centerX + (wx - COURT_W / 2) / (COURT_W / 2) * halfW;
  const scale = 0.55 + t * 0.85;
  return { x: screenX, y: screenY, scale, halfW };
}

// ---------------------------------------------------------------------------
// État du jeu
// ---------------------------------------------------------------------------
const DIFFICULTIES = [
  { name: 'FACILE',   speed: 0.85, reaction: 14, noise: 12 },
  { name: 'NORMAL',   speed: 1.05, reaction: 8,  noise: 7  },
  { name: 'DIFFICILE',speed: 1.3,  reaction: 3,  noise: 3  },
];

const G = {
  state: 'TITLE',       // TITLE, READY, SERVE, RALLY, POINT, GAME_OVER
  mode: '1P',            // '1P' ou '2P'
  diffIndex: 1,
  stateTimer: 0,
  message: '',
  messageSub: '',
  server: 'player',      // qui sert : 'player' | 'cpu'
  pointsInGame: { player: 0, cpu: 0 }, // 0,1,2,3 -> 0/15/30/40 (>=3 & diff -> deuce logic)
  games: { player: 0, cpu: 0 },
  faultCount: 0,
  rallyBounces: 0,        // rebonds depuis le dernier coup
  lastHitter: null,
  winner: null,
  frame: 0,
};

const player = { x: COURT_W / 2, y: COURT_H - 20, speed: 1.5, reach: 15 };
const cpu    = { x: COURT_W / 2, y: 20, speed: 1.4, reach: 15 };

const ball = {
  x: COURT_W / 2, y: COURT_H - 20, z: 0,
  vx: 0, vy: 0, vz: 0,
  visible: true,
};

function currentDifficulty() { return DIFFICULTIES[G.diffIndex]; }

// ---------------------------------------------------------------------------
// Score tennis (0/15/30/40, égalité, avantage, jeu, manche)
// ---------------------------------------------------------------------------
const POINT_NAMES = ['0', '15', '30', '40'];

function scoreLabel(side) {
  const me = G.pointsInGame[side];
  const opp = G.pointsInGame[side === 'player' ? 'cpu' : 'player'];
  if (me >= 3 && opp >= 3) {
    if (me === opp) return 'EGA';
    return me > opp ? 'AD' : '40';
  }
  return POINT_NAMES[Math.min(me, 3)];
}

function awardPoint(side) {
  Audio8.point();
  G.pointsInGame[side]++;
  const me = G.pointsInGame[side];
  const opp = G.pointsInGame[side === 'player' ? 'cpu' : 'player'];
  let gameWon = false;
  if (me >= 4 && me - opp >= 2) gameWon = true;
  if (gameWon) {
    Audio8.game();
    G.games[side]++;
    G.pointsInGame.player = 0;
    G.pointsInGame.cpu = 0;
    // alterner le service à chaque jeu
    G.server = G.server === 'player' ? 'cpu' : 'player';
    checkSetOrMatch(side);
  } else {
    goToReady(`POINT ${side === 'player' ? 'JOUEUR' : 'CPU'} !`, `${scoreLabel('cpu')} - ${scoreLabel('player')}`);
  }
}

function checkSetOrMatch(lastScorer) {
  const p = G.games.player, c = G.games.cpu;
  const setOver = (p >= 6 || c >= 6) && Math.abs(p - c) >= 2;
  const hardCap = p >= 7 || c >= 7; // sécurité anti-boucle infinie
  if (setOver || hardCap) {
    G.winner = p > c ? 'player' : 'cpu';
    G.state = 'GAME_OVER';
    G.stateTimer = 0;
    return;
  }
  goToReady(`JEU ${lastScorer === 'player' ? 'JOUEUR' : 'CPU'} !`, `${G.games.player} - ${G.games.cpu}`);
}

// ---------------------------------------------------------------------------
// Cycle de point / service
// ---------------------------------------------------------------------------
function goToReady(msg, sub) {
  G.state = 'READY';
  G.stateTimer = 0;
  G.message = msg || '';
  G.messageSub = sub || '';
  G.faultCount = 0;
}

function totalPointsServed() {
  return G.pointsInGame.player + G.pointsInGame.cpu;
}

function serviceSideIsRight() {
  // droite (deuce court) au score pair, gauche (ad court) au score impair
  return totalPointsServed() % 2 === 0;
}

function startServe() {
  G.state = 'SERVE';
  G.stateTimer = 0;
  G.rallyBounces = 0;
  cpuReactionCounter = 0;
  const right = serviceSideIsRight();
  const sx = right ? COURT_W * 0.75 : COURT_W * 0.25;
  if (G.server === 'player') {
    player.x = sx; player.y = COURT_H - 8;
    ball.x = sx; ball.y = COURT_H - 8; ball.z = 6;
  } else {
    cpu.x = sx; cpu.y = 8;
    ball.x = sx; ball.y = 8; ball.z = 6;
  }
  ball.vx = 0; ball.vy = 0; ball.vz = 0;
  G.lastHitter = G.server === 'player' ? 'player' : 'cpu';
  G._serveBobT = 0;
}

function serviceBoxFor(server, right) {
  const xMin = right ? COURT_W / 2 : 0;
  const xMax = right ? COURT_W : COURT_W / 2;
  let yMin, yMax;
  if (server === 'player') { yMin = NET_Y - SERVICE_DEPTH; yMax = NET_Y; }
  else { yMin = NET_Y; yMax = NET_Y + SERVICE_DEPTH; }
  return { xMin, xMax, yMin, yMax };
}

// ---------------------------------------------------------------------------
// Physique de la balle
// ---------------------------------------------------------------------------
const GRAVITY = 0.05;
const BOUNCE_DAMP = 0.6;
const NET_HEIGHT = 8;
const OUT_MARGIN = 6; // marge hors terrain avant de considérer "out" visuellement

// La durée de vol T détermine à la fois la vitesse horizontale (distance/T)
// et la hauteur d'arc (pic = 0.125 * GRAVITY * T^2), donc le point d'atterrissage
// visé est toujours atteint pile à t=T, quel que soit le type de coup.
function hitBall(hitter, aimX, aimY, flightFrames) {
  const dx = aimX - ball.x;
  const dy = aimY - ball.y;
  const T = Math.max(10, flightFrames);
  ball.vx = dx / T;
  ball.vy = dy / T;
  ball.vz = 0.5 * GRAVITY * T;
  G.lastHitter = hitter;
  G.rallyBounces = 0;
  Audio8.hit();
}

function aimTarget(hitterSide, steerX, isLob) {
  const targetSide = hitterSide === 'player' ? 'cpu' : 'player';
  let cx = COURT_W / 2 + steerX * 38;
  cx = Math.max(6, Math.min(COURT_W - 6, cx));
  let ty;
  if (isLob) {
    ty = targetSide === 'cpu'
      ? rand(6, NET_Y - SERVICE_DEPTH - 6)
      : rand(NET_Y + SERVICE_DEPTH + 6, COURT_H - 6);
  } else {
    ty = targetSide === 'cpu'
      ? rand(NET_Y - SERVICE_DEPTH - 2, NET_Y - 18)
      : rand(NET_Y + 18, NET_Y + SERVICE_DEPTH + 2);
  }
  return { x: cx, y: ty };
}

function rand(a, b) { return a + Math.random() * (b - a); }

function doServeHit(server, steerX) {
  const right = serviceSideIsRight();
  const box = serviceBoxFor(server, right);
  const margin = 14; // permet de rater le service si on force le steer
  let tx = (box.xMin + box.xMax) / 2 + steerX * (box.xMax - box.xMin) / 2 * 1.6;
  tx = Math.max(box.xMin - margin, Math.min(box.xMax + margin, tx));
  const ty = (box.yMin + box.yMax) / 2;
  hitBall(server, tx, ty, 52);
  G.state = 'RALLY';
  G._servingBox = box;
  G._servePending = true; // le prochain rebond doit être vérifié contre la boîte de service
}

// ---------------------------------------------------------------------------
// IA du CPU
// ---------------------------------------------------------------------------
let cpuReactionCounter = 0;

function updateCpuAI() {
  const diff = currentDifficulty();
  // suivi horizontal en permanence
  let desiredX = ball.x;
  if (ball.vy < 0 || ball.y > NET_Y) {
    // balle qui s'éloigne ou côté joueur : se replacer au centre en douceur
    desiredX = COURT_W / 2 + (ball.x - COURT_W / 2) * 0.3;
  }
  const dx = desiredX - cpu.x;
  cpu.x += Math.sign(dx) * Math.min(Math.abs(dx), cpu.speed * diff.speed);

  // profondeur : revenir vers une position de base, avancer si balle courte
  let desiredY = NET_Y - 35;
  if (G.state === 'RALLY' && ball.y < NET_Y && ball.vy < 0) {
    desiredY = Math.max(6, Math.min(NET_Y - 6, ball.y - 4));
  }
  const dy = desiredY - cpu.y;
  cpu.y += Math.sign(dy) * Math.min(Math.abs(dy), cpu.speed * diff.speed * 0.7);

  cpu.x = clamp(cpu.x, 2, COURT_W - 2);
  cpu.y = clamp(cpu.y, 4, NET_Y - 4);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function distTo(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

// ---------------------------------------------------------------------------
// Boucle de mise à jour principale
// ---------------------------------------------------------------------------
function updatePlayerMovement(p, input, isPlayerSide) {
  let mx = 0, my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (mx !== 0 && my !== 0) { mx *= 0.7071; my *= 0.7071; }
  p.x += mx * p.speed * 2.1;
  p.y += my * p.speed * 2.1;
  p.x = clamp(p.x, -6, COURT_W + 6);
  if (isPlayerSide) p.y = clamp(p.y, NET_Y + 4, COURT_H + 16);
  else p.y = clamp(p.y, -16, NET_Y - 4);
}

function tryHumanHit(p, input, side, edgeHit, edgeLob) {
  if (!(edgeHit || edgeLob)) return;
  const d = distTo(ball.x, ball.y, p.x, p.y);
  const sideOk = side === 'player' ? ball.y > NET_Y - 6 : ball.y < NET_Y + 6;
  if (d > p.reach || !sideOk || ball.z > 26) return;
  if (G.lastHitter === side) return; // ne peut pas toucher deux fois de suite
  let steer = 0;
  if (input.left) steer -= 1;
  if (input.right) steer += 1;
  const isLob = !!edgeLob;
  const target = aimTarget(side, steer, isLob);
  const flight = isLob ? rand(90, 120) : rand(48, 64);
  hitBall(side, target.x, target.y, flight);
}

function update() {
  G.frame++;
  if (G.state === 'TITLE') { updateTitle(); return; }
  if (G.state === 'GAME_OVER') { updateGameOver(); return; }
  if (G.state === 'READY') {
    G.stateTimer++;
    if (G.stateTimer > 70) startServe();
    return;
  }

  // Déplacement des joueurs (autorisé aussi pendant SERVE pour se placer)
  updatePlayerMovement(player, Input.p1, true);
  if (G.mode === '2P') updatePlayerMovement(cpu, Input.p2, false);
  else updateCpuAI();

  if (G.state === 'SERVE') {
    G._serveBobT = (G._serveBobT || 0) + 1;
    ball.z = 6 + Math.sin(G._serveBobT * 0.12) * 3 + Math.max(0, G._serveBobT - 20) * 0.15;
    if (G.server === 'player') {
      ball.x = player.x; ball.y = COURT_H - 8;
      if (consumeEdge('p1hit') || consumeEdge('p1lob')) {
        let steer = 0;
        if (Input.p1.left) steer -= 1;
        if (Input.p1.right) steer += 1;
        doServeHit('player', steer);
      }
    } else {
      ball.x = cpu.x; ball.y = 8;
      cpuReactionCounter++;
      if (cpuReactionCounter > 40) {
        cpuReactionCounter = 0;
        const steer = rand(-0.4, 0.4);
        doServeHit('cpu', steer);
      }
    }
    return;
  }

  if (G.state === 'RALLY') {
    // physique
    ball.vz -= GRAVITY;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.z += ball.vz;

    // collision filet
    const prevY = ball.y - ball.vy;
    const crossedNet = (prevY - NET_Y) * (ball.y - NET_Y) < 0;
    if (crossedNet && ball.z < NET_HEIGHT) {
      Audio8.net();
      const faulter = G.lastHitter;
      endPoint(faulter === 'player' ? 'cpu' : 'player', 'FILET !');
      return;
    }

    // rebond
    if (ball.z <= 0) {
      ball.z = 0;
      ball.vz = -ball.vz * BOUNCE_DAMP;
      G.rallyBounces++;
      Audio8.bounce();

      const inSingles = ball.x >= -OUT_MARGIN && ball.x <= COURT_W + OUT_MARGIN;
      const inCourt = ball.y >= -OUT_MARGIN && ball.y <= COURT_H + OUT_MARGIN;

      if (G._servePending) {
        G._servePending = false;
        const box = G._servingBox;
        const good = ball.x >= box.xMin - 0.5 && ball.x <= box.xMax + 0.5 &&
                     ball.y >= box.yMin - 0.5 && ball.y <= box.yMax + 0.5;
        if (!good) {
          handleFault();
          return;
        }
      } else {
        // rebond normal hors des limites => faute
        if (!inSingles || !inCourt) {
          const faulter = G.lastHitter;
          endPoint(faulter === 'player' ? 'cpu' : 'player', 'DEHORS !');
          return;
        }
        if (G.rallyBounces >= 2) {
          const missed = G.lastHitter === 'player' ? 'cpu' : 'player';
          endPoint(missed === 'player' ? 'cpu' : 'player', 'DOUBLE REBOND !');
          return;
        }
      }
    }

    // frappes
    if (G.mode === '2P') {
      tryHumanHit(player, Input.p1, 'player', consumeEdge('p1hit'), consumeEdge('p1lob'));
      tryHumanHit(cpu, Input.p2, 'cpu', consumeEdge('p2hit'), consumeEdge('p2lob'));
    } else {
      tryHumanHit(player, Input.p1, 'player', consumeEdge('p1hit'), consumeEdge('p1lob'));
      updateCpuAutoHit();
    }
  }
}

function updateCpuAutoHit() {
  if (G.lastHitter === 'cpu') return;
  if (ball.y >= NET_Y - 2 || ball.z > 26) return;
  const d = distTo(ball.x, ball.y, cpu.x, cpu.y);
  const diff = currentDifficulty();
  if (d > cpu.reach + 6) return;
  cpuReactionCounter++;
  if (cpuReactionCounter < diff.reaction) return;
  cpuReactionCounter = 0;
  const noise = diff.noise;
  const steer = clamp((cpu.x - COURT_W / 2) / (COURT_W / 2) + rand(-1, 1) * (noise / 20), -1, 1);
  const isLob = Math.random() < 0.18;
  const target = aimTarget('cpu', steer, isLob);
  target.x = clamp(target.x + rand(-noise, noise), 4, COURT_W - 4);
  const flight = isLob ? rand(90, 120) : rand(48, 64);
  hitBall('cpu', target.x, target.y, flight);
}

function handleFault() {
  G.faultCount++;
  Audio8.out();
  if (G.faultCount >= 2) {
    const faulter = G.server;
    endPoint(faulter === 'player' ? 'cpu' : 'player', 'DOUBLE FAUTE !');
  } else {
    G.state = 'POINT';
    G.stateTimer = 0;
    G.message = 'FAUTE !';
    G.messageSub = '2e SERVICE';
    G._retryServe = true;
  }
}

function endPoint(winnerSide, reason) {
  G.state = 'POINT';
  G.stateTimer = 0;
  G.message = reason;
  G.messageSub = winnerSide === 'player' ? 'POINT JOUEUR' : 'POINT CPU';
  G._pendingAward = winnerSide;
  G._retryServe = false;
}

function updateTitle() {
  if (consumeEdge('select')) {
    G.mode = G.mode === '1P' ? '2P' : '1P';
    Audio8.menu();
  }
  if (Input.p1.left && consumeMoveEdge('left')) { G.diffIndex = clamp(G.diffIndex - 1, 0, DIFFICULTIES.length - 1); Audio8.menu(); }
  if (Input.p1.right && consumeMoveEdge('right')) { G.diffIndex = clamp(G.diffIndex + 1, 0, DIFFICULTIES.length - 1); Audio8.menu(); }
  if (!Input.p1.left) _moveEdge.left = false;
  if (!Input.p1.right) _moveEdge.right = false;

  if (consumeEdge('start')) {
    Audio8.start();
    resetMatch();
    goToReady('PRÊT ?', '');
  }
}
const _moveEdge = { left: false, right: false };
function consumeMoveEdge(dir) {
  if (_moveEdge[dir]) return false;
  _moveEdge[dir] = true;
  return true;
}

function updateGameOver() {
  G.stateTimer++;
  if (G.stateTimer > 30 && consumeEdge('start')) {
    G.state = 'TITLE';
  }
}

function resetMatch() {
  G.games.player = 0; G.games.cpu = 0;
  G.pointsInGame.player = 0; G.pointsInGame.cpu = 0;
  G.server = Math.random() < 0.5 ? 'player' : 'cpu';
  G.winner = null;
  player.x = COURT_W / 2; player.y = COURT_H - 20;
  cpu.x = COURT_W / 2; cpu.y = 20;
}

// Gestion différée de l'octroi du point / relance de service (fin d'état POINT)
function updatePointState() {
  G.stateTimer++;
  if (G.stateTimer === 1) return;
  if (G.stateTimer > 55) {
    if (G._retryServe) {
      G._retryServe = false;
      startServe();
      return;
    }
    if (G._pendingAward) {
      const w = G._pendingAward;
      G._pendingAward = null;
      awardPoint(w);
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------
function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawCourt() {
  drawRect(0, 0, 160, 144, PAL.lightest);

  const farL = project(0, 0), farR = project(COURT_W, 0);
  const nearL = project(0, COURT_H), nearR = project(COURT_W, COURT_H);

  ctx.fillStyle = PAL.light;
  ctx.beginPath();
  ctx.moveTo(farL.x, farL.y);
  ctx.lineTo(farR.x, farR.y);
  ctx.lineTo(nearR.x, nearR.y);
  ctx.lineTo(nearL.x, nearL.y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = PAL.darkest;
  ctx.lineWidth = 1;

  function lineSeg(x1, y1, x2, y2) {
    const a = project(x1, y1), b = project(x2, y2);
    ctx.beginPath();
    ctx.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5);
    ctx.lineTo(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5);
    ctx.stroke();
  }

  // lignes de fond, côtés
  lineSeg(0, 0, COURT_W, 0);
  lineSeg(0, COURT_H, COURT_W, COURT_H);
  lineSeg(0, 0, 0, COURT_H);
  lineSeg(COURT_W, 0, COURT_W, COURT_H);
  // ligne médiane de service
  lineSeg(COURT_W / 2, NET_Y - SERVICE_DEPTH, COURT_W / 2, NET_Y + SERVICE_DEPTH);
  // lignes de service
  lineSeg(0, NET_Y - SERVICE_DEPTH, COURT_W, NET_Y - SERVICE_DEPTH);
  lineSeg(0, NET_Y + SERVICE_DEPTH, COURT_W, NET_Y + SERVICE_DEPTH);

  // filet
  const netL = project(-4, NET_Y), netR = project(COURT_W + 4, NET_Y);
  drawRect(netL.x, netL.y - 6, netR.x - netL.x, 2, PAL.darkest);
  for (let i = 0; i <= 10; i++) {
    const wx = -4 + (COURT_W + 8) * (i / 10);
    const p = project(wx, NET_Y);
    drawRect(p.x, p.y - 6, 1, 6, PAL.dark);
  }
  drawRect(netL.x - 1, netL.y - 8, 1, 10, PAL.darkest);
  drawRect(netR.x, netR.y - 8, 1, 10, PAL.darkest);
}

function drawFigure(px, py, scale, color, isServing) {
  const w = 5 * scale, h = 9 * scale;
  drawRect(px - w / 2, py - h, w, h * 0.6, color);       // torse
  drawRect(px - w / 2, py - h * 0.4, w, h * 0.4, PAL.darkest); // jambes
  drawRect(px - 1.5 * scale, py - h - 3 * scale, 3 * scale, 3 * scale, color); // tête
  if (isServing) {
    drawRect(px + w / 2, py - h * 1.1, 1.5 * scale, 3.5 * scale, color); // bras/raquette levé
  } else {
    drawRect(px + w / 2, py - h * 0.7, 2 * scale, 1.5 * scale, color);
  }
}

function drawBallAndShadow() {
  const ground = project(ball.x, ball.y);
  // ombre
  const shScale = ground.scale;
  ctx.fillStyle = PAL.dark;
  ctx.beginPath();
  ctx.ellipse(ground.x, ground.y, 2.2 * shScale, 1 * shScale, 0, 0, Math.PI * 2);
  ctx.fill();
  // balle (décalée verticalement selon la hauteur z)
  const heightPx = ball.z * ground.scale * 0.9;
  ctx.fillStyle = PAL.darkest;
  const r = Math.max(1, 1.6 * ground.scale);
  ctx.beginPath();
  ctx.arc(ground.x, ground.y - heightPx, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawHUD() {
  ctx.fillStyle = PAL.darkest;
  ctx.font = '8px monospace';
  ctx.textBaseline = 'top';
  const pLabel = scoreLabel('player');
  const cLabel = scoreLabel('cpu');
  const cpuMark = G.server === 'cpu' ? '*' : ' ';
  const playerMark = G.server === 'player' ? '*' : ' ';
  ctx.fillText(`${cpuMark}CPU ${G.games.cpu} [${cLabel}]`, 4, 2);
  const jTxt = `JOU ${G.games.player} [${pLabel}]${playerMark}`;
  const w = ctx.measureText(jTxt).width;
  ctx.fillText(jTxt, 156 - w, 2);
}

function centerText(text, y, sizePx = 8) {
  ctx.font = `${sizePx}px monospace`;
  ctx.fillStyle = PAL.darkest;
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  ctx.fillText(text, 80 - w / 2, y);
}

function drawTitleScreen() {
  drawRect(0, 0, 160, 144, PAL.lightest);
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = PAL.darkest;
  ctx.textBaseline = 'middle';
  let t = 'TENNIS';
  let w = ctx.measureText(t).width;
  ctx.fillText(t, 80 - w / 2, 34);

  centerText('- CLONE GAME BOY -', 54, 6);

  const modeTxt = `< MODE: ${G.mode === '1P' ? '1 JOUEUR' : '2 JOUEURS'} >`;
  centerText(modeTxt, 76, 7);
  if (G.mode === '1P') {
    centerText(`< DIFFICULTE: ${currentDifficulty().name} >`, 90, 7);
  }

  if (Math.floor(G.frame / 20) % 2 === 0) {
    centerText('PRESS START', 112, 8);
  }
  centerText('SELECT: MODE   ←→: DIFF', 132, 6);
}

function drawReadyOrPoint() {
  if (G.message) centerText(G.message, 64, 9);
  if (G.messageSub) centerText(G.messageSub, 78, 7);
}

function drawGameOver() {
  drawRect(0, 0, 160, 144, PAL.lightest);
  const txt = G.winner === 'player' ? 'VOUS GAGNEZ !' : 'CPU GAGNE !';
  centerText(txt, 60, 10);
  centerText(`JEUX  ${G.games.player} - ${G.games.cpu}`, 80, 8);
  if (G.stateTimer > 30 && Math.floor(G.frame / 20) % 2 === 0) {
    centerText('PRESS START', 110, 8);
  }
}

function render() {
  if (G.state === 'TITLE') { drawTitleScreen(); return; }
  if (G.state === 'GAME_OVER') { drawGameOver(); return; }

  drawCourt();

  const pP = project(player.x, player.y);
  const pC = project(cpu.x, cpu.y);
  const servingPlayer = G.state === 'SERVE' && G.server === 'player';
  const servingCpu = G.state === 'SERVE' && G.server === 'cpu';

  // CPU dessiné avant le joueur (plus loin = derrière)
  drawFigure(pC.x, pC.y, pC.scale, '#3a3a55', servingCpu);
  if (ball.visible && (G.state === 'SERVE' || G.state === 'RALLY')) drawBallAndShadow();
  drawFigure(pP.x, pP.y, pP.scale, '#7a2020', servingPlayer);

  drawHUD();
  if (G.state === 'READY' || G.state === 'POINT') drawReadyOrPoint();
}

// ---------------------------------------------------------------------------
// Boucle principale
// ---------------------------------------------------------------------------
let lastTime = 0;
let acc = 0;
const STEP = 1000 / 60;

function loop(ts) {
  requestAnimationFrame(loop);
  if (!lastTime) lastTime = ts;
  let delta = ts - lastTime;
  lastTime = ts;
  if (delta > 250) delta = 250;
  acc += delta;
  while (acc >= STEP) {
    if (G.state === 'POINT') updatePointState();
    update();
    acc -= STEP;
  }
  render();
}
requestAnimationFrame(loop);
