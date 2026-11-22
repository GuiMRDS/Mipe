// Jarvis — o dashboard vivo: cena 3D (Fase 1) + fios, skills, cards e chat.
import { createScene, STAGE, ORBIT } from './scene3d.js';

const $ = (s, el = document) => el.querySelector(s);
const stage = $('#stage');

// ---------- cena 3D ----------
const scene = createScene($('#gl'));
window.jarvis = { scene };

// ---------- tela inteira e responsivo ----------
// Largo: o canvas 3D cobre a tela toda; a interface fica em 6 grupos (coordenadas de 1536×864, escala u) presos às
// bordas: logo e HUD nos cantos de cima, E-mail/Calendário à esquerda, chat à direita, HUDs nos cantos de baixo.
// O palco do centro (mão, fios, skills, núcleo) tem escala s, centrado, com a cúpula encostada embaixo.
// Estreito ou vertical: o centro vira o "hero" no topo e logo, cards e chat empilham no #flow, com rolagem.
const hero = $('#hero'), flow = $('#flow');
const G = Object.fromEntries(['tl', 'tr', 'l', 'r', 'bl', 'br'].map((n) => [n, $('#g-' + n)]));
const HOME = { '.logo': 'tl', '#detail': 'l', '#mail': 'l', '#cal': 'l', '#chat': 'r' };
const MOVABLE = Object.keys(HOME).map((sel) => [$(sel), G[HOME[sel]]]);
const CROP = { cx: 767, w: 676 };          // o recorte do hero: x de 429 a 1105 px do palco
let k = 1, narrowNow = null;
function place(el, x, y, s) { el.style.transform = `translate(${x}px, ${y}px) scale(${s})`; }
function fit() {
  const W = innerWidth, H = innerHeight;
  const narrow = W < 900 || W / H < 1.15;
  if (narrow !== narrowNow) {
    narrowNow = narrow;
    document.body.classList.toggle('narrow', narrow);
    document.documentElement.style.overflowY = narrow ? 'auto' : 'hidden';
    MOVABLE.forEach(([el, home]) => (narrow ? flow : home).appendChild(el));
  }
  let ox, oy, heroH = H;
  if (narrow) {
    k = Math.min(W / CROP.w, (0.72 * H) / STAGE.h);
    heroH = Math.round(STAGE.h * k);
    hero.style.height = `${heroH}px`;
    ox = W / 2 - CROP.cx * k;
    oy = 0;
    flow.style.zoom = Math.min(1.2, (W - 32) / 416);
  } else {
    hero.style.height = '';
    const u = Math.min(H / STAGE.h, W / STAGE.w);           // escala da interface
    // o centro usa a altura toda; só encolhe se a mão e as skills (≈ 540 px) não couberem entre as colunas
    k = Math.min(H / STAGE.h, (W - 2 * 455 * u) / 540);
    ox = W / 2 - CROP.cx * k;
    oy = H - STAGE.h * k;
    const right = W - STAGE.w * u, midY = H / 2 - (STAGE.h / 2) * u, bottom = H - STAGE.h * u;
    place(G.tl, 0, 0, u); place(G.tr, right, 0, u);
    place(G.l, 0, midY, u); place(G.r, right, midY, u);
    place(G.bl, 0, bottom, u); place(G.br, right, bottom, u);
  }
  place(stage, ox, oy, k);
  scene.setView({ w: W, h: heroH, s: k, ox, oy, pr: Math.min(2, devicePixelRatio || 1) });
}
addEventListener('resize', fit);
fit();
const toStage = (e) => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };

// ---------- quadradinhos do fundo (posições tiradas da imagem) ----------
const SPECKS = [
  [536, 150, 8], [559, 165, 6, 1], [515, 214, 7], [552, 214, 9], [592, 163, 7], [600, 300, 8], [578, 369, 7], [520, 322, 8, 1],
  [487, 226, 6], [690, 94, 8], [705, 104, 6], [698, 120, 9], [915, 72, 8], [931, 86, 7], [940, 196, 8], [921, 150, 6], [951, 306, 7],
  [1011, 226, 6], [1047, 355, 8], [990, 281, 7], [965, 598, 7], [571, 586, 8, 1], [545, 632, 7], [434, 721, 7], [1020, 312, 6],
  [908, 160, 7], [598, 584, 6], [1079, 754, 7], [1033, 560, 7], [512, 645, 8, 1], [579, 805, 6, 1], [585, 805, 6, 1],
];
const specks = $('#specks');
// v1.9: os quadradinhos da imagem só piscam (acendem e apagam), cada um no seu tempo — sem ligação com a mão
SPECKS.forEach(([x, y, s, hi], i) => {
  const b = document.createElement('b');
  b.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;--o:${hi ? .9 : .55};` +
    `animation-duration:${2.4 + ((i * 977) % 4600) / 1000}s;animation-delay:${-((i * 613) % 5000) / 1000}s`;
  if (hi) b.className = 'hi';
  specks.appendChild(b);
});

// v1.9: campo de pixels pela tela inteira, piscando (alguns verdes); refeito quando a tela muda de tamanho
const field = $('#pixfield');
function buildField() {
  const W = hero.clientWidth, H = hero.clientHeight;
  const n = Math.max(50, Math.min(170, Math.round((W * H) / 13000)));
  let html = '';
  for (let i = 0; i < n; i++) {
    const s = [2, 3, 3, 4, 4, 5, 6][Math.floor(Math.random() * 7)];
    // v1.11: estrelas — a maioria azul bebê/branca, algumas azul neon (g) e poucas violeta (v)
    const r = Math.random(), cls = r < .18 ? 'g' : r < .26 ? 'v' : r < .45 ? 'w' : '';
    const o = cls ? .85 : .25 + Math.random() * .45;
    html += `<b class="${cls}" style="left:${(Math.random() * W).toFixed(0)}px;top:${(Math.random() * H).toFixed(0)}px;` +
      `width:${s}px;height:${s}px;--o:${o.toFixed(2)};animation-duration:${(2.2 + Math.random() * 6).toFixed(2)}s;` +
      `animation-delay:${(-Math.random() * 8).toFixed(2)}s"></b>`;
  }
  field.innerHTML = html;
}
let fieldT = 0;
addEventListener('resize', () => { clearTimeout(fieldT); fieldT = setTimeout(buildField, 200); });
buildField();

// ---------- v1.8: cards ----------
// índice de cada linha (a entrada em cascata usa --i)
document.querySelectorAll('.card').forEach((card) => {
  card.querySelectorAll('.rows li, .day, .events li, .msgs li').forEach((li, i) => li.style.setProperty('--i', i));
  // faixa de varredura, cada card no seu tempo
  const sw = document.createElement('div');
  sw.className = 'sweep';
  sw.style.setProperty('--d', `${{ mail: 0, cal: 3, chat: 6 }[card.id] || 0}s`);
  card.appendChild(sw);
  const rim = document.createElement('div');
  rim.className = 'rim';
  rim.style.setProperty('--d', `${{ mail: 0, cal: -2.2, chat: -4.4 }[card.id] || 0}s`);
  card.appendChild(rim);
  // brilho que segue o mouse (em coordenadas do card, descontando a escala do grupo)
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect(), sc = r.width / card.offsetWidth;
    card.style.setProperty('--mx', `${(e.clientX - r.left) / sc}px`);
    card.style.setProperty('--my', `${(e.clientY - r.top) / sc}px`);
  });
  card.addEventListener('mouseleave', () => { card.style.removeProperty('--mx'); card.style.removeProperty('--my'); });
});

// ---------- skills, fios e órbita ----------
// v1.14: as skills são dinâmicas — dá para selecionar (ela pousa debaixo da cápsula, com as conexões em leque e um card
// explicando) e criar novas (o "+" da órbita). As 5 primeiras são ligadas aos dedos (finger = índice do dedo).
const SKILLS = [
  { id: 'pesquisa', label: 'Pesquisa', icon: 'i-search', finger: 0, status: '3 fontes em análise',
    say: 'Pesquisa pronta. O que você quer que eu procure? Posso comparar fontes e te trazer um resumo.',
    desc: 'Busca, lê e compara fontes na web e nos seus documentos, e te entrega um resumo com os links que importam.',
    conns: ['Web', 'Artigos', 'Notícias', 'PDFs', 'Resumos', 'Alertas'], stats: [['Buscas hoje', '18'], ['Fontes', '142'], ['Precisão', '97%']] },
  { id: 'musica', label: 'Música', icon: 'i-music', finger: 1, status: 'Foco · lo-fi tocando',
    say: 'Tocando sua playlist de foco. Quer algo mais calmo para depois das 19h?',
    desc: 'Escolhe o que tocar pelo seu momento — foco, treino, descanso — e aprende com o que você pula ou repete.',
    conns: ['Spotify', 'Playlists', 'Humor', 'Foco', 'Rotina', 'Descobertas'], stats: [['Tocadas hoje', '27'], ['Playlists', '12'], ['Acertos', '91%']] },
  { id: 'casa', label: 'Casa', icon: 'i-home', finger: 2, status: 'Sala 40% · 23 °C',
    say: 'Casa: luzes da sala em 40% e ar em 23 °C. Tranco a porta quando você sair?',
    desc: 'Cuida da casa conectada: luzes, clima, portas e câmeras, com cenas automáticas para cada hora do dia.',
    conns: ['Luzes', 'Clima', 'Portas', 'Câmeras', 'Energia', 'Cenas'], stats: [['Dispositivos', '14'], ['Cenas', '6'], ['Economia', '−18%']] },
  { id: 'codigo', label: 'Código', icon: 'i-code', finger: 3, status: '2 PRs para revisar',
    say: 'Código: 2 PRs esperando revisão e o deploy de ontem passou. Abro o primeiro?',
    desc: 'Acompanha seus repositórios: revisa PRs, roda os testes, avisa quando um deploy quebra e sugere correções.',
    conns: ['GitHub', 'PRs', 'Deploys', 'Testes', 'Bugs', 'Docs'], stats: [['PRs abertos', '2'], ['Testes', '486'], ['Deploys/sem.', '9']] },
  { id: 'financas', label: 'Finanças', icon: 'i-coins', finger: 4, status: '62% do orçamento',
    say: 'Finanças: você gastou 62% do orçamento do mês. A fatura do cartão vence sexta.',
    desc: 'Organiza contas, cartões e investimentos: acompanha o orçamento, lembra das faturas e aponta onde economizar.',
    conns: ['Bancos', 'Cartões', 'Orçamento', 'Faturas', 'Investimentos', 'Metas'], stats: [['Orçamento', '62%'], ['Faturas', '3'], ['Meta', '74%']] },
];
const R_ICON = 34;
const nav = $('#skills');
const strings = $('#strings');
const pulsesG = $('#pulses');
const linksG = $('#links');
const NS = 'http://www.w3.org/2000/svg';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function makeSkillEl(s) {
  const i = SKILLS.indexOf(s);
  const b = document.createElement('button');
  b.className = 'skill' + (s.custom ? ' custom' : '');
  b.title = s.label;
  b.innerHTML = `<svg class="ic"><use href="#${s.icon}"/></svg><span>${esc(s.label)}</span><em>${esc(s.status || 'Nova skill')}</em>`;
  b.addEventListener('mouseenter', () => { light(i, true); orbitHold = true; });
  b.addEventListener('mouseleave', () => { light(i, false); orbitHold = false; });
  b.addEventListener('click', (e) => { e.stopPropagation(); if (selected === i) closeSkill(); else openSkill(i); });
  nav.appendChild(b);
  s.el = b;
  if (s.finger != null) {
    const l = document.createElementNS(NS, 'line');
    strings.appendChild(l);
    s.line = l;
    // v1.5: fluxo contínuo de "dados" pelo fio
    const fl = document.createElementNS(NS, 'line');
    fl.setAttribute('class', 'flow');
    fl.style.animationDuration = `${1.1 + i * 0.13}s`;
    fl.style.animationDelay = `${-i * 0.37}s`;
    strings.appendChild(fl);
    s.flow = fl;
  }
}
// skills criadas antes, neste navegador
try { (JSON.parse(localStorage.getItem('jarvis-skills') || '[]')).forEach((s) => SKILLS.push({ ...s, custom: true })); } catch { /* sem armazenamento */ }
SKILLS.forEach(makeSkillEl);
// o "+" que orbita junto: cria uma skill nova
const addBtn = document.createElement('button');
addBtn.className = 'skill add';
addBtn.title = 'Nova skill';
addBtn.innerHTML = '<svg class="ic"><use href="#i-plus"/></svg><span>nova skill</span><em>Ensinar algo novo ao Jarvis</em>';
addBtn.addEventListener('mouseenter', () => { orbitHold = true; });
addBtn.addEventListener('mouseleave', () => { orbitHold = false; });
addBtn.addEventListener('click', (e) => { e.stopPropagation(); openCreate(); });
nav.appendChild(addBtn);

// fios: saem das pontas reais dos dedos 3D, a cada quadro
let tips = scene.tips();
const pulses = [];   // { i, t0, dur }
let orbitHold = false, orbitA = 0, lastNow = performance.now();
const beamsG = document.createElementNS(NS, 'g');
$('#wires').appendChild(beamsG);
let anchors = scene.anchors();
let selected = -1;                       // índice da skill selecionada (pousada debaixo da cápsula)
const DOCK = { x: 767, y: 776 };         // onde a skill selecionada pousa, sobre o chão holográfico
function orbitPos(k, n, sh) {
  const a = orbitA + (k / n) * Math.PI * 2 + Math.PI / 2;
  const sa = Math.sin(a);
  return { x: ORBIT.cx + sh.x + ORBIT.R * Math.cos(a), y: ORBIT.cy + sh.y + ORBIT.R * sa * Math.sin(ORBIT.phi), front: sa };
}
function placeOrbit(el, p, sh) {
  const depth = (p.front + 1) / 2;
  const behindCore = p.front < 0 && Math.abs(p.x - ORBIT.cx - sh.x) < 165;
  el.style.left = p.x + 'px';
  el.style.top = p.y + 'px';
  el.style.setProperty('--sc', (0.72 + 0.28 * depth).toFixed(3));
  el.style.opacity = (behindCore ? 0.28 : 0.45 + 0.55 * depth).toFixed(3);
  el.style.zIndex = p.front < 0 ? 1 : 3;
}
function frame(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
  if (!orbitHold && selected < 0) orbitA += dt * 0.16;
  tips = scene.tips();
  anchors = scene.anchors();
  const sh = scene.coreShift();
  // v1.16: a órbita tem todas as skills mais o "+"; a selecionada NÃO sai do lugar (a órbita só pausa)
  const n = SKILLS.length + 1;
  SKILLS.forEach((s, k) => { s.pos = orbitPos(k, n, sh); placeOrbit(s.el, s.pos, sh); });
  placeOrbit(addBtn, orbitPos(n - 1, n, sh), sh);
  if (selected >= 0) {
    const s = SKILLS[selected];
    s.el.style.opacity = '1'; s.el.style.zIndex = 6;
    updateLinks(s.pos);                     // as linhas saem da skill, onde ela estiver
  }
  SKILLS.forEach((s) => {
    if (s.finger == null) return;
    const t = tips[s.finger], an = anchors[s.finger];
    s.line.setAttribute('x1', t.x); s.line.setAttribute('y1', t.y);
    s.line.setAttribute('x2', an.x); s.line.setAttribute('y2', an.y);
    s.flow.setAttribute('x1', t.x); s.flow.setAttribute('y1', t.y);
    s.flow.setAttribute('x2', an.x); s.flow.setAttribute('y2', an.y);
  });
  for (let j = pulses.length - 1; j >= 0; j--) {
    const p = pulses[j];
    const u = (now - p.t0) / p.dur;
    if (u >= 1) {
      p.el.remove(); pulses.splice(j, 1);
      if (!p.done) { p.done = true; reachCore(p.i); }
      continue;
    }
    const f = SKILLS[p.i].finger, t = tips[f], an = anchors[f];
    const e = u * u * (3 - 2 * u);
    p.el.setAttribute('cx', t.x + (an.x - t.x) * e);
    p.el.setAttribute('cy', t.y + (an.y - t.y) * e);
    p.el.setAttribute('opacity', Math.sin(Math.PI * Math.min(1, u * 1.1)));
  }
  // feixes da cápsula até a skill (acompanham a skill enquanto ela anda)
  for (let j = beams.length - 1; j >= 0; j--) {
    const b = beams[j], u = (now - b.t0) / 700, s = SKILLS[b.i];
    const an = anchors[s && s.finger != null ? s.finger : 2];
    if (u >= 1 || !s || !s.pos) { b.el.remove(); beams.splice(j, 1); continue; }
    b.el.setAttribute('x1', an.x); b.el.setAttribute('y1', an.y);
    b.el.setAttribute('x2', s.pos.x); b.el.setAttribute('y2', s.pos.y);
    b.el.setAttribute('stroke-dashoffset', (1 - Math.min(1, u * 2.2)).toFixed(3));
    b.el.setAttribute('opacity', u < 0.45 ? 1 : (1 - u) / 0.55);
  }
  // partículas de informação correndo pelas conexões da skill selecionada
  links.forEach((L) => {
    L.dots.forEach((d) => {
      const u = ((now / 1000) * d.speed + d.ph) % 1;
      const pt = L.path.getPointAtLength((d.dir > 0 ? u : 1 - u) * L.len);
      d.el.setAttribute('cx', pt.x); d.el.setAttribute('cy', pt.y);
      d.el.setAttribute('opacity', (Math.sin(Math.PI * u) * 0.95).toFixed(3));
    });
  });
  requestAnimationFrame(frame);
}
const beams = [];
// o pulso chega na cápsula: ela brilha e um feixe sai até a skill, que acende
function reachCore(i) {
  scene.talk(0.6);
  const l = document.createElementNS(NS, 'line');
  l.setAttribute('class', 'beam');
  l.setAttribute('pathLength', '1');
  beamsG.appendChild(l);
  beams.push({ i, t0: performance.now(), el: l });
  setTimeout(() => arrive(i), 320);
}
requestAnimationFrame(frame);

function light(i, on) {
  const s = SKILLS[i];
  if (!s) return;
  if (!(selected === i && !on)) s.el.classList.toggle('lit', on || selected === i);
  if (s.line) s.line.classList.toggle('lit', on);
  if (on && s.finger != null) scene.flareFinger(s.finger, false);
}
// a energia sobe pelo dedo (anel de varredura); ao chegar na ponta, a onda abre e o pulso desce pelo fio até a cápsula
function fire(i, flex = false) {
  const s = SKILLS[i];
  if (!s) return;
  if (s.finger == null) { reachCore(i); return; }
  if (flex) scene.flareFinger(s.finger, true);
  scene.scanFinger(s.finger, () => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', 3.2);
    pulsesG.appendChild(c);
    pulses.push({ i, t0: performance.now(), dur: 850, el: c });
  });
}
const litTimers = [];
function arrive(i) {
  const s = SKILLS[i];
  if (!s) return;
  s.el.classList.add('lit'); if (s.line) s.line.classList.add('lit');
  clearTimeout(litTimers[i]);
  litTimers[i] = setTimeout(() => {
    if (!s.el.matches(':hover') && selected !== i) { s.el.classList.remove('lit'); if (s.line) s.line.classList.remove('lit'); }
  }, 1400);
}

// o ciclo ocioso: os pulsos descem da esquerda para a direita, um após o outro (só as skills dos dedos)
function idle() {
  if (selected >= 0) return;
  [0, 1, 2, 3, 4].forEach((i, k) => setTimeout(() => fire(i), k * 420));
}
idle();
setInterval(idle, 6500);

// ======================================================================
// v1.14 — skill selecionada: pousa debaixo da cápsula, conexões em leque e o card explicando
// ======================================================================
let links = [];
const deg = (d) => (d * Math.PI) / 180;
// v1.15: as conexões viram pontos no anel do chão (a órbita de baixo): a skill pousa no topo do anel e as linhas
// correm pela própria órbita, da skill até cada ponto (metade para a esquerda, metade para a direita)
const FLOOR = { cx: 767, cy: 958, rx: 640, ry: 166 };   // o anel principal do chão, em px do palco
const onFloor = (a) => ({ x: FLOOR.cx + FLOOR.rx * Math.cos(a), y: FLOOR.cy - FLOOR.ry * Math.sin(a) });
function linkTargets(n) {
  // v1.16: os pontos se espalham por todo o arco visível do chão, da esquerda (136°) para a direita (44°)
  const out = [];
  for (let k = 0; k < n; k++) out.push(deg(n === 1 ? 90 : 136 - (k / (n - 1)) * 92));
  return out.map((a) => ({ a, ...onFloor(a) }));
}
// a linha da skill até o ponto: uma curva suave, que se abre em leque como na referência
function linkD(o, t, k, n) {
  const dx = t.x - o.x, dy = t.y - o.y, len = Math.hypot(dx, dy) || 1;
  const bow = (k - (n - 1) / 2) * 9 + 26;                     // cada linha curva um pouco diferente
  const cx = o.x + dx * 0.5 - (dy / len) * bow, cy = o.y + dy * 0.5 + (dx / len) * bow * 0.35;
  return `M${o.x.toFixed(1)},${o.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${t.x.toFixed(1)},${t.y.toFixed(1)}`;
}
function updateLinks(o) {
  links.forEach((L) => {
    L.path.setAttribute('d', linkD({ x: o.x, y: o.y + 12 }, L.t, L.k, links.length));
    L.len = L.path.getTotalLength();
  });
}
function arcPath(a0, a1) {
  const steps = Math.max(8, Math.round(Math.abs(a1 - a0) / deg(2)));
  let d = '';
  for (let s = 0; s <= steps; s++) {
    const p = onFloor(a0 + (a1 - a0) * (s / steps));
    d += `${s ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }
  return d;
}
function drawLinks(s) {
  linksG.innerHTML = '';
  links = [];
  const T = linkTargets(s.conns.length);
  const top = deg(90);
  T.forEach((t, k) => {
    const name = s.conns[k];
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'link floor');
    // a ordem de entrada sai da skill para fora: os pontos mais perto aparecem primeiro
    g.style.setProperty('--k', k);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', linkD(s.pos || { x: t.x, y: t.y - 100 }, t, k, T.length));
    path.setAttribute('pathLength', '1');
    g.appendChild(path);
    // um tique vertical do ponto até o rótulo, como uma marcação na órbita
    const tick = document.createElementNS(NS, 'line');
    tick.setAttribute('class', 'tick');
    tick.setAttribute('x1', t.x); tick.setAttribute('y1', t.y - 9); tick.setAttribute('x2', t.x); tick.setAttribute('y2', t.y - 22);
    const ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('class', 'node-ring'); ring.setAttribute('cx', t.x); ring.setAttribute('cy', t.y); ring.setAttribute('r', 9);
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('class', 'node'); dot.setAttribute('cx', t.x); dot.setAttribute('cy', t.y); dot.setAttribute('r', 3.8);
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', t.x); label.setAttribute('y', t.y - 28);
    label.setAttribute('text-anchor', 'middle');
    label.textContent = name;
    g.append(tick, ring, dot, label);
    linksG.appendChild(g);
    const len = path.getTotalLength();
    const dots = [0, 1].map((m) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'info'); c.setAttribute('r', m ? 1.8 : 2.6);
      g.appendChild(c);
      return { el: c, ph: Math.random(), speed: 0.3 + Math.random() * 0.3, dir: m ? -1 : 1 };
    });
    links.push({ path, len, dots, t, k });
  });
}

const detail = $('#detail');
// o conteúdo vai num contêiner interno: a borda holográfica e a varredura do card (filhos do #detail) ficam
const dBody = document.createElement('div');
dBody.className = 'd-body';
detail.prepend(dBody);
function sparkline(seed) {
  let v = 20, d = '';
  for (let x = 0; x <= 300; x += 15) {
    v = Math.max(6, Math.min(38, v + Math.sin(seed * 7 + x * 0.09) * 9 + Math.cos(seed * 3 + x * 0.21) * 5));
    d += `${x ? 'L' : 'M'}${x},${(44 - v).toFixed(1)}`;
  }
  return `<svg class="spark" viewBox="0 0 300 44" preserveAspectRatio="none"><path class="area" d="${d} L300,44 L0,44 Z"/><path d="${d}"/></svg>`;
}
function renderDetail(s, i) {
  const stats = (s.stats || [['Usos', '0'], ['Conexões', String(s.conns.length)], ['Status', 'nova']])
    .map(([k, v]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('');
  dBody.innerHTML = `
    <header class="d-h">
      <div class="d-ic"><svg class="ic"><use href="#${s.icon}"/></svg></div>
      <div class="d-t"><small>SKILL · ${String(i + 1).padStart(2, '0')}</small><h2>${esc(s.label)}</h2></div>
      <span class="d-on"><i></i>${s.custom ? 'nova' : 'ativa'}</span>
      <button class="d-x" title="Fechar"><svg class="ic"><use href="#i-x"/></svg></button>
    </header>
    <p class="d-desc">${esc(s.desc || 'Uma skill criada por você.')}</p>
    <div class="d-sec">STATUS</div>
    <p class="d-status"><i></i>${esc(s.status || 'Aprendendo com o uso')}</p>
    <div class="d-stats">${stats}</div>
    <div class="d-sec">ATIVIDADE · 24H</div>
    ${sparkline(i + 1)}
    <div class="d-sec">CONEXÕES · ${s.conns.length}</div>
    <div class="d-chips">${s.conns.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
    <div class="d-act">
      <button class="d-run"><svg class="ic"><use href="#i-bolt"/></svg>Executar agora</button>
      <button class="d-ask">Perguntar ao Jarvis</button>
    </div>`;
  detail.querySelector('.d-x').onclick = (e) => { e.stopPropagation(); closeSkill(); };
  detail.querySelector('.d-run').onclick = (e) => { e.stopPropagation(); fire(i, true); botSay(s.say || `Executando ${s.label}.`, -1); };
  detail.querySelector('.d-ask').onclick = (e) => {
    e.stopPropagation();
    const q = $('#q'); q.value = `Me conte o que a skill ${s.label} pode fazer por mim`; q.focus();
  };
}
function showDetail(on) {
  document.body.classList.toggle('detail-on', on);
  detail.setAttribute('aria-hidden', String(!on));
  if (on && narrowNow) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function openSkill(i) {
  const s = SKILLS[i];
  if (selected >= 0 && selected !== i) SKILLS[selected].el.classList.remove('docked', 'lit');
  selected = i;
  s.el.classList.add('docked', 'lit');
  document.body.classList.add('selecting');
  drawLinks(s);
  renderDetail(s, i);
  showDetail(true);
  fire(i, true);
  scene.talk(0.8);
}
function closeSkill() {
  document.body.classList.remove('selecting');
  showDetail(false);
  if (selected < 0) return;
  const s = SKILLS[selected];
  s.el.classList.remove('docked', 'lit');
  if (s.line) s.line.classList.remove('lit');
  selected = -1;
  linksG.classList.add('leaving');
  setTimeout(() => { if (selected < 0) { linksG.innerHTML = ''; links = []; } linksG.classList.remove('leaving'); }, 380);
}
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSkill(); });

// ---------- v1.14: criar uma skill nova (o "+" da órbita) ----------
const ICONS = ['i-spark', 'i-globe', 'i-heart', 'i-bolt', 'i-book', 'i-chat'];
function openCreate() {
  if (selected >= 0) closeSkill();
  let icon = ICONS[0];
  dBody.innerHTML = `
    <header class="d-h">
      <div class="d-ic"><svg class="ic"><use href="#i-plus"/></svg></div>
      <div class="d-t"><small>ÓRBITA DA IA</small><h2>Nova skill</h2></div>
      <button class="d-x" type="button" title="Fechar"><svg class="ic"><use href="#i-x"/></svg></button>
    </header>
    <form class="d-form" autocomplete="off">
      <label>Nome<input name="nome" maxlength="18" placeholder="Ex.: Viagens" required></label>
      <label>O que ela faz<textarea name="desc" rows="3" maxlength="160" placeholder="Ex.: Planeja roteiros, acha voos e guarda as reservas."></textarea></label>
      <div class="d-sec">ÍCONE</div>
      <div class="d-icons">${ICONS.map((ic, k) => `<button type="button" data-ic="${ic}" class="${k ? '' : 'on'}"><svg class="ic"><use href="#${ic}"/></svg></button>`).join('')}</div>
      <label>Conexões <small>(separadas por vírgula)</small><input name="conns" maxlength="90" placeholder="Ex.: Voos, Hotéis, Mapas, Agenda"></label>
      <div class="d-act"><button class="d-run" type="submit"><svg class="ic"><use href="#i-plus"/></svg>Criar skill</button>
        <button class="d-ask d-cancel" type="button">Cancelar</button></div>
    </form>`;
  const form = detail.querySelector('form');
  detail.querySelectorAll('.d-icons button').forEach((b) => { b.onclick = () => {
    detail.querySelectorAll('.d-icons button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on'); icon = b.dataset.ic;
  }; });
  detail.querySelector('.d-x').onclick = (e) => { e.stopPropagation(); closeSkill(); };
  detail.querySelector('.d-cancel').onclick = (e) => { e.stopPropagation(); closeSkill(); };
  form.onsubmit = (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    if (!nome) return;
    const conns = form.conns.value.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 7);
    const s = { id: 'custom-' + Date.now(), label: nome, icon, custom: true, status: 'Aprendendo com o uso',
      desc: form.desc.value.trim() || `Skill ${nome}, criada por você.`, conns: conns.length ? conns : ['Você', 'Agenda', 'Web'],
      say: `${nome} pronta. Me diga como posso usar essa skill para te ajudar.` };
    SKILLS.push(s);
    makeSkillEl(s);
    try {
      localStorage.setItem('jarvis-skills', JSON.stringify(SKILLS.filter((x) => x.custom)
        .map(({ id, label, icon: ic, status, desc, conns: cs, say }) => ({ id, label, icon: ic, status, desc, conns: cs, say }))));
    } catch { /* sem armazenamento */ }
    botSay(`Nova skill na órbita: ${nome}. Já liguei ${s.conns.length} conexões a ela.`);
    openSkill(SKILLS.length - 1);
  };
  document.body.classList.add('selecting');
  showDetail(true);
  setTimeout(() => form.nome.focus(), 350);
}

// ---------- núcleo e pontas dos dedos (o canvas não recebe eventos: perguntamos à cena) ----------
hero.addEventListener('mousemove', (e) => {
  const [x, y] = toStage(e);
  scene.setMouse(x, y);
  const onDom = e.target.closest('.card, .skill, header');
  const overCore = !onDom && scene.overCore(x, y);
  const overTip = !onDom ? scene.overFinger(x, y) : -1;
  scene.boost(overCore);
  hero.style.cursor = overCore || overTip >= 0 ? 'pointer' : '';
});
hero.addEventListener('mouseleave', () => { scene.setMouse(0, 0, false); scene.boost(false); });
hero.addEventListener('click', (e) => {
  if (e.target.closest('.card, .skill, button, input')) return;
  if (selected >= 0 || document.body.classList.contains('detail-on')) { closeSkill(); return; }
  const [x, y] = toStage(e);
  const f = scene.overFinger(x, y);
  if (f >= 0) { fire(f, true); botSay(SKILLS[f].say, f); return; }
  if (scene.overCore(x, y)) { scene.ripple(); scene.talk(1); botSay('Estou aqui. Organizei seu dia: 3 e-mails novos, reunião às 15h e academia às 19h.'); }
});

// ---------- e-mail e calendário ----------
const badge = $('#mail-badge');
let unread = 3;
$('#mail-rows').querySelectorAll('li').forEach((li) => {
  li.addEventListener('click', () => {
    const who = li.querySelector('b').textContent, what = li.querySelector('span').textContent;
    if (!li.classList.contains('read')) {
      li.classList.add('read'); li.classList.remove('unread');
      unread = Math.max(0, unread - 1);
      badge.textContent = unread;
      badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
    }
    botSay(`${who}: "${what}". Resumo: nada urgente, mas pedem retorno até amanhã. Quer que eu responda?`);
  });
});
$('#cal').querySelectorAll('.events li').forEach((li) => {
  li.addEventListener('click', () => {
    const t = li.querySelector('time').textContent, b = li.querySelector('b').textContent;
    botSay(t === '15:00' ? 'Reunião equipe às 15h. Preparei a pauta: status do projeto, riscos e próximos passos.'
      : `${b} às ${t}. Te aviso 30 minutos antes.`);
  });
});

// ---------- chat ----------
const msgs = $('#msgs');
const hhmm = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const avatarLast = () => [...msgs.querySelectorAll('.bot .avatar')].pop();
function add(kind, html) {
  const li = document.createElement('li');
  li.className = kind + ' new';
  li.innerHTML = (kind === 'bot' ? '<i class="avatar"></i>' : '') + `<p>${html}</p>` + (kind === 'typing bot' ? '' : `<time>${hhmm()}</time>`);
  msgs.appendChild(li);
  msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });
  return li;
}
let busy = Promise.resolve();
function botSay(text, skill = -1) {
  busy = busy.then(() => new Promise((done) => {
    const typing = add('typing bot', '<i></i><i></i><i></i>');
    typing.insertAdjacentHTML('afterbegin', '<i class="avatar talk"></i>');
    scene.talk(0.8);
    document.querySelector('.wave')?.classList.add('talk');
    if (skill >= 0) fire(skill);
    setTimeout(() => {
      typing.remove();
      const li = add('bot', text);
      const av = li.querySelector('.avatar');
      av.classList.add('talk');
      scene.talk(1);
      setTimeout(() => { av.classList.remove('talk'); document.querySelector('.wave')?.classList.remove('talk'); done(); }, 1200);
    }, 650 + Math.min(1400, text.length * 12));
  }));
}

const KEYS = [
  [/pesquis|busca|procur|google/i, 0], [/m[uú]sic|tocar|playlist|som/i, 1], [/casa|luz|luzes|porta|ar\b|temperatura/i, 2],
  [/c[oó]dig|pr\b|deploy|bug|github/i, 3], [/finan|gasto|dinheiro|fatura|conta|or[cç]amento/i, 4],
];
function answer(q) {
  const hit = KEYS.find(([re]) => re.test(q));
  if (hit) return [SKILLS[hit[1]].say, hit[1]];
  if (/e-?mail|caixa|mensage/i.test(q)) { pulseCard('#mail'); return [`Você tem ${unread} e-mail${unread === 1 ? '' : 's'} não lido${unread === 1 ? '' : 's'}. O mais recente é da Equipe Produto, às 10:24.`, -1]; }
  if (/reuni|agenda|calend|hoje|amanh/i.test(q)) { pulseCard('#cal'); return ['Hoje: reunião com a equipe às 15h (sala virtual) e academia às 19h.', -1]; }
  if (/obrigad|valeu/i.test(q)) return ['Por nada! Estou por aqui.', -1];
  if (/^(oi|ol[aá]|bom dia|boa tarde|boa noite)/i.test(q)) return ['Olá! Como posso ajudar agora?', -1];
  return ['Entendi. Posso pesquisar, tocar música, cuidar da casa, revisar código ou ver suas finanças. Por onde começo?', -1];
}
function pulseCard(sel) {
  const c = $(sel);
  c.animate([{ borderColor: 'rgba(61, 169, 255,.8)', boxShadow: '0 0 28px rgba(61, 169, 255,.35)' }, {}], { duration: 1400, easing: 'ease-out' });
}
$('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#q').value.trim();
  if (!q) return;
  $('#q').value = '';
  add('me', q.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;')));
  const [text, skill] = answer(q);
  botSay(text, skill);
});
// o avatar fixo do histórico pulsa de leve, como no vídeo
avatarLast()?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 2400, iterations: Infinity });

// ======================================================================
// v1.9 — o agente vivo
// ======================================================================

// abertura: o logo e as linhas de HUD se desenham traço a traço (o CSS anima stroke-dashoffset)
document.querySelectorAll('.logo-mark path, .hudlines path').forEach((p, i) => {
  p.setAttribute('pathLength', '1');
  p.style.setProperty('--d', `${0.15 + i * 0.11}s`);
});

// textos de HUD "decodificam": letras embaralhadas que vão se acertando, da esquerda para a direita
const GLYPHS = '01<>/\\|#*+=-_:ABCDEFXYZ';
function decode(el, ms = 900) {
  if (!el._orig) {
    const list = [];
    const walk = (n) => n.childNodes.forEach((c) => (c.nodeType === 3 ? list.push([c, c.textContent]) : walk(c)));
    walk(el);
    el._orig = list;
  }
  if (el._busy) return;
  el._busy = true;
  const t0 = performance.now();
  const step = (now) => {
    const u = Math.min(1, (now - t0) / ms);
    el._orig.forEach(([node, txt]) => {
      node.textContent = [...txt].map((ch, k) => (ch.trim() === '' || k / txt.length < u * 1.2 - 0.2 ? ch
        : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join('');
    });
    if (u < 1) requestAnimationFrame(step);
    else { el._orig.forEach(([node, txt]) => { node.textContent = txt; }); el._busy = false; }
  };
  requestAnimationFrame(step);
}
const HUD_TEXT = [...document.querySelectorAll('.hud p, .foot p, .logo-sub')];
HUD_TEXT.forEach((el, i) => setTimeout(() => decode(el, 1100), 350 + i * 140));
// de tempos em tempos um bloco de HUD se redecodifica (o sistema "pensando")
setInterval(() => { if (!document.hidden) decode(HUD_TEXT[Math.floor(Math.random() * HUD_TEXT.length)], 700); }, 6500);

// luz que percorre o arco das skills
(() => {
  const arc = $('#arc');
  const light = arc.cloneNode();
  light.id = 'arc-light';
  light.setAttribute('pathLength', '1000');
  arc.after(light);
})();

// ouvindo: a onda de voz ao lado de "ONLINE" se agita quando você digita; o núcleo e as pontas reagem
const wave = $('.wave');
let typingT = 0;
$('#q').addEventListener('input', () => {
  wave.classList.add('hot');
  scene.boost(true);
  if (Math.random() < .35) scene.flareFinger(Math.floor(Math.random() * 5), false);
  clearTimeout(typingT);
  typingT = setTimeout(() => { wave.classList.remove('hot'); scene.boost(false); }, 900);
});
$('#q').addEventListener('focus', () => wave.classList.add('hot'));
$('#q').addEventListener('blur', () => wave.classList.remove('hot'));

// calendário: "2 eventos" alterna com uma contagem regressiva real até o próximo evento
const calInfo = $('#cal-info');
const EVENTS = [[15, 0, 'Reunião'], [19, 0, 'Academia']];
function nextEvent() {
  const now = new Date();
  for (const [h, m, nome] of EVENTS) {
    const t = new Date(now); t.setHours(h, m, 0, 0);
    const diff = Math.round((t - now) / 60000);
    if (diff > 0) return diff >= 60 ? `${nome} em ${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, '0')}m` : `${nome} em ${diff} min`;
  }
  return 'agenda livre';
}
let calAlt = false;
setInterval(() => {
  calAlt = !calAlt;
  calInfo.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 220, easing: 'ease-in' }).finished.then(() => {
    calInfo.textContent = calAlt ? nextEvent() : '2 eventos';
    calInfo.classList.toggle('countdown', calAlt);
    calInfo.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  });
}, 6000);

// iniciativa própria: se você fica um tempo parado, o Jarvis puxa assunto sozinho (no máximo 4 vezes)
const PROATIVO = [
  [() => {
    const n = nextEvent();
    return n === 'agenda livre' ? 'Sua agenda de hoje acabou. Que tal desacelerar um pouco?'
      : `Lembrete: ${n.replace(' em ', ' começa em ')}. Já deixei tudo pronto.`;
  }, -1, '#cal'],
  ['Separei 3 notícias que combinam com seus interesses. Quer ver?', 0],
  ['Percebi que você está focado. Coloquei uma playlist calma para tocar baixinho.', 1],
  ['A temperatura subiu um pouco: ajustei o ar da sala para 23 °C.', 2],
  ['O deploy de hoje passou em todos os testes. Nada a fazer por aqui.', 3],
  ['Boa notícia: você gastou 12% menos com delivery este mês.', 4],
];
let lastAct = performance.now(), lastPro = performance.now(), proCount = 0;
['mousemove', 'keydown', 'click', 'touchstart'].forEach((ev) => addEventListener(ev, () => { lastAct = performance.now(); }, { passive: true }));
const proOrder = PROATIVO.map((_, i) => i).sort(() => Math.random() - .5);
setInterval(() => {
  const now = performance.now();
  if (document.hidden || proCount >= 4 || now - lastAct < 20000 || now - lastPro < 35000) return;
  const [text, skill, card] = PROATIVO[proOrder[proCount++]];
  lastPro = now;
  if (card) pulseCard(card);
  botSay(typeof text === 'function' ? text() : text, skill);
}, 4000);
