// Galilei — o dashboard vivo, agora com cérebro: o chat conversa com o Claude Code (via server/server.mjs),
// as skills da órbita são as skills reais do cerebro/, e cada nota .md do cerebro/ é uma estrela no chão.
import { createScene, STAGE, ORBIT } from './scene3d.js';
import { esc, md, lerHistorico, cap, mesmoDia, quando, hm, diaRel, duracao, eventosFuturos, infoAgenda, textoEmail, gmailLink } from './util.js';

const $ = (s, el = document) => el.querySelector(s);
const stage = $('#stage');

// ---------- cena 3D ----------
const scene = createScene($('#gl'));
window.galilei = { scene };

// ---------- tela inteira e responsivo ----------
const hero = $('#hero'), flow = $('#flow');
const G = Object.fromEntries(['tl', 'tr', 'l', 'r', 'bl', 'br'].map((n) => [n, $('#g-' + n)]));
// o chat é a barra lateral da esquerda (no grupo de cima, junto do logo); E-mail, Calendário e o detalhe ficam à direita
const HOME = { '.logo': 'tl', '#detail': 'r', '#mail': 'r', '#cal': 'r', '#chat': 'tl' };
const chatEl = $('#chat');
// rótulo do cabeçalho da barra: "CANAL DIRETO · 28 NOV"
$('#sb-data').textContent = '· ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').replace(' de ', ' ').toUpperCase();
const MOVABLE = Object.keys(HOME).map((sel) => [$(sel), G[HOME[sel]]]);
const CROP = { cx: 767, w: 676 };
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
    chatEl.style.height = '';
  } else {
    hero.style.height = '';
    const u = Math.min(H / STAGE.h, W / STAGE.w);
    k = Math.min(H / STAGE.h, (W - 2 * 455 * u) / 540);
    ox = W / 2 - CROP.cx * k;
    oy = H - STAGE.h * k;
    const right = W - STAGE.w * u, midY = H / 2 - (STAGE.h / 2) * u, bottom = H - STAGE.h * u;
    place(G.tl, 0, 0, u); place(G.tr, right, 0, u);
    chatEl.style.height = `${H / u}px`;        // a barra lateral ocupa a altura toda da janela
    place(G.l, 0, midY, u); place(G.r, right, midY, u);
    place(G.bl, 0, bottom, u); place(G.br, right, bottom, u);
  }
  place(stage, ox, oy, k);
  scene.setView({ w: W, h: heroH, s: k, ox, oy, pr: Math.min(2, devicePixelRatio || 1) });
}
addEventListener('resize', fit);
fit();
const toStage = (e) => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };

// ---------- quadradinhos do fundo ----------
const SPECKS = [
  [536, 150, 8], [559, 165, 6, 1], [515, 214, 7], [552, 214, 9], [592, 163, 7], [600, 300, 8], [578, 369, 7], [520, 322, 8, 1],
  [487, 226, 6], [690, 94, 8], [705, 104, 6], [698, 120, 9], [915, 72, 8], [931, 86, 7], [940, 196, 8], [921, 150, 6], [951, 306, 7],
  [1011, 226, 6], [1047, 355, 8], [990, 281, 7], [965, 598, 7], [571, 586, 8, 1], [545, 632, 7], [434, 721, 7], [1020, 312, 6],
  [908, 160, 7], [598, 584, 6], [1079, 754, 7], [1033, 560, 7], [512, 645, 8, 1], [579, 805, 6, 1], [585, 805, 6, 1],
];
const specks = $('#specks');
SPECKS.forEach(([x, y, s, hi], i) => {
  const b = document.createElement('b');
  b.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;--o:${hi ? .9 : .55};` +
    `animation-duration:${2.4 + ((i * 977) % 4600) / 1000}s;animation-delay:${-((i * 613) % 5000) / 1000}s`;
  if (hi) b.className = 'hi';
  specks.appendChild(b);
});
const field = $('#pixfield');
function buildField() {
  const W = hero.clientWidth, H = hero.clientHeight;
  const n = Math.max(50, Math.min(170, Math.round((W * H) / 13000)));
  let html = '';
  for (let i = 0; i < n; i++) {
    const s = [2, 3, 3, 4, 4, 5, 6][Math.floor(Math.random() * 7)];
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

// ---------- cards ----------
document.querySelectorAll('.card').forEach((card) => {
  card.querySelectorAll('.rows li, .day, .events li, .msgs li').forEach((li, i) => li.style.setProperty('--i', i));
  const sw = document.createElement('div');
  sw.className = 'sweep';
  sw.style.setProperty('--d', `${{ mail: 0, cal: 3, chat: 6 }[card.id] || 0}s`);
  card.appendChild(sw);
  const rim = document.createElement('div');
  rim.className = 'rim';
  rim.style.setProperty('--d', `${{ mail: 0, cal: -2.2, chat: -4.4 }[card.id] || 0}s`);
  card.appendChild(rim);
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect(), sc = r.width / card.offsetWidth;
    card.style.setProperty('--mx', `${(e.clientX - r.left) / sc}px`);
    card.style.setProperty('--my', `${(e.clientY - r.top) / sc}px`);
  });
  card.addEventListener('mouseleave', () => { card.style.removeProperty('--mx'); card.style.removeProperty('--my'); });
});

// ---------- utilidades ----------
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([a, v]) => e.setAttribute(a, v)); return e; };
// ======================================================================
// skills, fios e órbita — as skills vêm do cerebro/.claude/skills (pelo servidor)
// ======================================================================
const nav = $('#skills');
const strings = $('#strings');
const pulsesG = $('#pulses');
const linksG = $('#links');
let SKILLS = [];                          // { id, label, icon, desc, conns, caminho, finger, el }
// os 5 fios saem dos dedos e se prendem na cápsula (não dependem de quantas skills existem)
const FIOS = [0, 1, 2, 3, 4].map((f) => {
  const line = svgEl('line');
  const fl = svgEl('line', { class: 'flow' });
  fl.style.animationDuration = `${1.1 + f * 0.13}s`;
  fl.style.animationDelay = `${-f * 0.37}s`;
  strings.append(line, fl);
  return { line, flow: fl };
});
const fingerOf = (i) => i % 5;

function makeSkillEl(s, i) {
  const b = document.createElement('button');
  b.className = 'skill';
  b.title = s.label;
  b.innerHTML = `<svg class="ic"><use href="#${esc(s.icon)}"/></svg><span>${esc(s.label)}</span><em>${esc(s.status)}</em>`;
  b.addEventListener('mouseenter', () => { light(SKILLS.indexOf(s), true); orbitHold = true; });
  b.addEventListener('mouseleave', () => { light(SKILLS.indexOf(s), false); orbitHold = false; });
  b.addEventListener('click', (e) => { e.stopPropagation(); const j = SKILLS.indexOf(s); if (selected === j) closeSkill(); else openSkill(j); });
  nav.insertBefore(b, addBtn);
  s.el = b;
  s.finger = fingerOf(i);
}
const addBtn = document.createElement('button');
addBtn.className = 'skill add';
addBtn.title = 'Nova skill';
addBtn.innerHTML = '<svg class="ic"><use href="#i-plus"/></svg><span>nova skill</span><em>Ensinar algo novo ao Galilei</em>';
addBtn.addEventListener('mouseenter', () => { orbitHold = true; });
addBtn.addEventListener('mouseleave', () => { orbitHold = false; });
addBtn.addEventListener('click', (e) => { e.stopPropagation(); openCreate(); });
nav.appendChild(addBtn);

function setSkills(list) {
  const selId = selected >= 0 ? SKILLS[selected]?.id : null;
  const old = new Map(SKILLS.map((s) => [s.id, s]));
  const next = list.map((x) => {
    const s = old.get(x.id) || { id: x.id };
    Object.assign(s, { label: x.rotulo || x.nome || x.id, icon: x.icone || 'i-spark', desc: x.descricao || '',
      conns: x.conexoes && x.conexoes.length ? x.conexoes : ['Notas', 'Web'], caminho: x.caminho, status: 'Skill ativa' });
    return s;
  });
  // tira as que sumiram e recria a ordem
  SKILLS.forEach((s) => { if (!next.includes(s)) s.el?.remove(); });
  SKILLS = next;
  SKILLS.forEach((s, i) => {
    if (!s.el) makeSkillEl(s, i);
    else {
      s.finger = fingerOf(i);
      s.el.title = s.label;
      s.el.innerHTML = `<svg class="ic"><use href="#${esc(s.icon)}"/></svg><span>${esc(s.label)}</span><em>${esc(s.status)}</em>`;
      nav.insertBefore(s.el, addBtn);
    }
  });
  selected = selId ? SKILLS.findIndex((s) => s.id === selId) : -1;
  if (selId && selected < 0) closeSkill();
}

let tips = scene.tips();
const pulses = [];   // { f, i (skill ou -1), t0, dur, el }
let orbitHold = false, orbitA = 0, lastNow = performance.now();
const beamsG = svgEl('g');
$('#wires').appendChild(beamsG);
let anchors = scene.anchors();
let selected = -1;
function orbitPos(kk, n, sh) {
  const a = orbitA + (kk / n) * Math.PI * 2 + Math.PI / 2;
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
  const n = SKILLS.length + 1;
  SKILLS.forEach((s, kk) => { s.pos = orbitPos(kk, n, sh); placeOrbit(s.el, s.pos, sh); });
  placeOrbit(addBtn, orbitPos(n - 1, n, sh), sh);
  if (selected >= 0 && SKILLS[selected]) {
    const s = SKILLS[selected];
    s.el.style.opacity = '1'; s.el.style.zIndex = 6;
    updateLinks(s.pos);
  }
  FIOS.forEach((F, f) => {
    const t = tips[f], an = anchors[f];
    if (!Number.isFinite(t.x + t.y + an.x + an.y)) return;     // o 3D ainda não tem tamanho (primeiro quadro)
    for (const l of [F.line, F.flow]) { l.setAttribute('x1', t.x); l.setAttribute('y1', t.y); l.setAttribute('x2', an.x); l.setAttribute('y2', an.y); }
  });
  for (let j = pulses.length - 1; j >= 0; j--) {
    const p = pulses[j];
    const u = (now - p.t0) / p.dur;
    if (u >= 1) {
      p.el.remove(); pulses.splice(j, 1);
      if (!p.done) { p.done = true; reachCore(p.i); }
      continue;
    }
    const t = tips[p.f], an = anchors[p.f];
    const e = u * u * (3 - 2 * u);
    p.el.setAttribute('cx', t.x + (an.x - t.x) * e);
    p.el.setAttribute('cy', t.y + (an.y - t.y) * e);
    p.el.setAttribute('opacity', Math.sin(Math.PI * Math.min(1, u * 1.1)));
  }
  for (let j = beams.length - 1; j >= 0; j--) {
    const b = beams[j], u = (now - b.t0) / 700, s = SKILLS[b.i];
    const an = anchors[s ? s.finger : 2];
    if (u >= 1 || !s || !s.pos) { b.el.remove(); beams.splice(j, 1); continue; }
    b.el.setAttribute('x1', an.x); b.el.setAttribute('y1', an.y);
    b.el.setAttribute('x2', s.pos.x); b.el.setAttribute('y2', s.pos.y);
    b.el.setAttribute('stroke-dashoffset', (1 - Math.min(1, u * 2.2)).toFixed(3));
    b.el.setAttribute('opacity', u < 0.45 ? 1 : (1 - u) / 0.55);
  }
  links.forEach((L) => {
    L.dots.forEach((d) => {
      const u = ((now / 1000) * d.speed + d.ph) % 1;
      const pt = L.path.getPointAtLength((d.dir > 0 ? u : 1 - u) * L.len);
      d.el.setAttribute('cx', pt.x); d.el.setAttribute('cy', pt.y);
      d.el.setAttribute('opacity', (Math.sin(Math.PI * u) * 0.95).toFixed(3));
    });
  });
  starsFrame(dt);
  requestAnimationFrame(frame);
}
const beams = [];
function reachCore(i) {
  scene.talk(0.6);
  if (i < 0 || !SKILLS[i]) return;
  const l = svgEl('line', { class: 'beam', pathLength: '1' });
  beamsG.appendChild(l);
  beams.push({ i, t0: performance.now(), el: l });
  setTimeout(() => arrive(i), 320);
}

function light(i, on) {
  const s = SKILLS[i];
  if (!s) return;
  if (!(selected === i && !on)) s.el.classList.toggle('lit', on || selected === i);
  FIOS[s.finger].line.classList.toggle('lit', on);
  if (on) scene.flareFinger(s.finger, false);
}
// a energia sobe pelo dedo, a onda abre na ponta e o pulso desce pelo fio até a cápsula (e dela até a skill i)
function pulseFinger(f, i = -1, flex = false) {
  if (flex) scene.flareFinger(f, true);
  scene.scanFinger(f, () => {
    const c = svgEl('circle', { r: 3.2 });
    pulsesG.appendChild(c);
    pulses.push({ f, i, t0: performance.now(), dur: 850, el: c });
  });
}
function fire(i, flex = false) { const s = SKILLS[i]; if (s) pulseFinger(s.finger, i, flex); }
const litTimers = {};
function arrive(i) {
  const s = SKILLS[i];
  if (!s) return;
  s.el.classList.add('lit'); FIOS[s.finger].line.classList.add('lit');
  clearTimeout(litTimers[s.id]);
  litTimers[s.id] = setTimeout(() => {
    if (!s.el.matches(':hover') && SKILLS[selected] !== s) { s.el.classList.remove('lit'); FIOS[s.finger].line.classList.remove('lit'); }
  }, 1400);
}
// ciclo ocioso: os pulsos descem dos 5 dedos, da esquerda para a direita
function idle() {
  if (selected >= 0) return;
  [0, 1, 2, 3, 4].forEach((f, kk) => setTimeout(() => pulseFinger(f, SKILLS.findIndex((s) => s.finger === f)), kk * 420));
}
setInterval(idle, 6500);

// ---------- skill selecionada: linhas até as conexões no chão + card explicando ----------
let links = [];
const deg = (d) => (d * Math.PI) / 180;
const FLOOR = { cx: 767, cy: 958, rx: 640, ry: 166 };
const onFloor = (a) => ({ x: FLOOR.cx + FLOOR.rx * Math.cos(a), y: FLOOR.cy - FLOOR.ry * Math.sin(a) });
function linkTargets(n) {
  const out = [];
  for (let kk = 0; kk < n; kk++) out.push(deg(n === 1 ? 90 : 136 - (kk / (n - 1)) * 92));
  return out.map((a) => ({ a, ...onFloor(a) }));
}
function linkD(o, t, kk, n) {
  const dx = t.x - o.x, dy = t.y - o.y, len = Math.hypot(dx, dy) || 1;
  const bow = (kk - (n - 1) / 2) * 9 + 26;
  const cx = o.x + dx * 0.5 - (dy / len) * bow, cy = o.y + dy * 0.5 + (dx / len) * bow * 0.35;
  return `M${o.x.toFixed(1)},${o.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${t.x.toFixed(1)},${t.y.toFixed(1)}`;
}
function updateLinks(o) {
  links.forEach((L) => {
    L.path.setAttribute('d', linkD({ x: o.x, y: o.y + 12 }, L.t, L.k, links.length));
    L.len = L.path.getTotalLength();
  });
}
function drawLinks(s) {
  linksG.innerHTML = '';
  links = [];
  const T = linkTargets(s.conns.length);
  T.forEach((t, kk) => {
    const g = svgEl('g', { class: 'link floor' });
    g.style.setProperty('--k', kk);
    const path = svgEl('path', { d: linkD(s.pos || { x: t.x, y: t.y - 100 }, t, kk, T.length), pathLength: '1' });
    g.appendChild(path);
    const tick = svgEl('line', { class: 'tick', x1: t.x, y1: t.y - 9, x2: t.x, y2: t.y - 22 });
    const ring = svgEl('circle', { class: 'node-ring', cx: t.x, cy: t.y, r: 9 });
    const dot = svgEl('circle', { class: 'node', cx: t.x, cy: t.y, r: 3.8 });
    const label = svgEl('text', { x: t.x, y: t.y - 28, 'text-anchor': 'middle' });
    label.textContent = s.conns[kk];
    g.append(tick, ring, dot, label);
    linksG.appendChild(g);
    const len = path.getTotalLength();
    const dots = [0, 1].map((m) => {
      const c = svgEl('circle', { class: 'info', r: m ? 1.8 : 2.6 });
      g.appendChild(c);
      return { el: c, ph: Math.random(), speed: 0.3 + Math.random() * 0.3, dir: m ? -1 : 1 };
    });
    links.push({ path, len, dots, t, k: kk });
  });
}

const detail = $('#detail');
const dBody = document.createElement('div');
dBody.className = 'd-body';
detail.prepend(dBody);
function corpoSkill(txt) {
  return txt.replace(/^---[\s\S]*?---\s*/, '').replace(/<!--[\s\S]*?-->\s*/g, '').trim();
}
function renderDetail(s, i) {
  dBody.innerHTML = `
    <header class="d-h">
      <div class="d-ic"><svg class="ic"><use href="#${esc(s.icon)}"/></svg></div>
      <div class="d-t"><small>SKILL · ${String(i + 1).padStart(2, '0')}</small><h2>${esc(s.label)}</h2></div>
      <span class="d-on"><i></i>ativa</span>
      <button class="d-x" title="Fechar"><svg class="ic"><use href="#i-x"/></svg></button>
    </header>
    <p class="d-desc">${esc(s.desc || 'Uma skill do Galilei.')}</p>
    <div class="d-sec">CONEXÕES · ${s.conns.length}</div>
    <div class="d-chips">${s.conns.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
    <div class="d-sec">INSTRUÇÕES <small class="d-path">${esc(s.caminho || '')}</small></div>
    <div class="d-md"><span class="ln">carregando…</span></div>
    <div class="d-act">
      <button class="d-run"><svg class="ic"><use href="#i-bolt"/></svg>Usar agora</button>
      <button class="d-ask">Perguntar ao Galilei</button>
    </div>`;
  detail.querySelector('.d-x').onclick = (e) => { e.stopPropagation(); closeSkill(); };
  detail.querySelector('.d-run').onclick = (e) => {
    e.stopPropagation(); fire(i, true);
    const q = $('#q'); q.value = `Use a skill ${s.label} para `; q.focus();
  };
  detail.querySelector('.d-ask').onclick = (e) => { e.stopPropagation(); fire(i, true); mandar(`O que a skill ${s.label} pode fazer por mim?`); };
  if (s.caminho) {
    fetch('/api/nota?caminho=' + encodeURIComponent(s.caminho)).then((r) => r.json()).then((n) => {
      const box = detail.querySelector('.d-md');
      if (box && n.texto != null) box.innerHTML = md(corpoSkill(n.texto)) || '<span class="ln">(sem instruções)</span>';
    }).catch(() => {});
  }
}
function showDetail(on) {
  document.body.classList.toggle('detail-on', on);
  detail.setAttribute('aria-hidden', String(!on));
  if (on && narrowNow) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function openSkill(i) {
  const s = SKILLS[i];
  if (!s) return;
  if (selected >= 0 && selected !== i && SKILLS[selected]) SKILLS[selected].el.classList.remove('docked', 'lit');
  closeNote(false);
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
  closeNote(false);
  if (selected < 0) return;
  const s = SKILLS[selected];
  if (s) { s.el.classList.remove('docked', 'lit'); FIOS[s.finger].line.classList.remove('lit'); }
  selected = -1;
  linksG.classList.add('leaving');
  setTimeout(() => { if (selected < 0) { linksG.innerHTML = ''; links = []; } linksG.classList.remove('leaving'); }, 380);
}
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSkill(); });

// ---------- criar uma skill nova (o "+" da órbita) → escreve o SKILL.md pelo servidor ----------
const ICONS = ['i-spark', 'i-globe', 'i-heart', 'i-bolt', 'i-book', 'i-chat', 'i-code', 'i-coins', 'i-music', 'i-home'];
function openCreate() {
  if (selected >= 0) closeSkill();
  closeNote(false);
  let icon = ICONS[0];
  dBody.innerHTML = `
    <header class="d-h">
      <div class="d-ic"><svg class="ic"><use href="#i-plus"/></svg></div>
      <div class="d-t"><small>ÓRBITA DA IA</small><h2>Nova skill</h2></div>
      <button class="d-x" type="button" title="Fechar"><svg class="ic"><use href="#i-x"/></svg></button>
    </header>
    <form class="d-form" autocomplete="off">
      <label>Nome<input name="nome" maxlength="24" placeholder="Ex.: Viagens" required></label>
      <label>O que ela faz e como<textarea name="desc" rows="4" maxlength="400" placeholder="Ex.: Planeja roteiros: pergunta datas e orçamento, pesquisa voos e hotéis e salva o plano numa nota."></textarea></label>
      <div class="d-sec">ÍCONE</div>
      <div class="d-icons">${ICONS.map((ic, kk) => `<button type="button" data-ic="${ic}" class="${kk ? '' : 'on'}"><svg class="ic"><use href="#${ic}"/></svg></button>`).join('')}</div>
      <label>Conexões <small>(separadas por vírgula)</small><input name="conns" maxlength="90" placeholder="Ex.: Voos, Hotéis, Mapas, Notas"></label>
      <p class="d-err" hidden></p>
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
  form.onsubmit = async (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    if (!nome) return;
    const conexoes = form.conns.value.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 7);
    const err = form.querySelector('.d-err');
    try {
      const r = await fetch('/api/skills', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Galilei': '1' },
        body: JSON.stringify({ nome, descricao: form.desc.value.trim(), icone: icon, conexoes }) });
      const res = await r.json();
      if (!r.ok) throw new Error(res.erro || 'Não consegui criar a skill.');
      await carregarEstado();
      sysMsg(`Nova skill na órbita: <b>${esc(nome)}</b>.`);
      const i = SKILLS.findIndex((s) => s.id === res.id);
      if (i >= 0) openSkill(i);
    } catch (ex) { err.hidden = false; err.textContent = ex.message; }
  };
  document.body.classList.add('selecting');
  showDetail(true);
  setTimeout(() => form.nome.focus(), 350);
}

// ======================================================================
// estrelas = notas do cerebro/ — no anel pontilhado do chão, abaixo da cápsula
// ======================================================================
const starsSvg = $('#notas');
const starsG = svgEl('g');
const starTip = svgEl('g', { class: 'star-tip' });
const tipBg = svgEl('rect', { rx: 6, ry: 6, height: 22 });
const tipTx = svgEl('text', { y: 15 });
starTip.append(tipBg, tipTx);
starsSvg.append(starsG, starTip);
const STAR_RINGS = [{ rx: 770, ry: 196 }, { rx: 702, ry: 180 }, { rx: 836, ry: 212 }];
const RING_CAP = 44;
const stars = new Map();            // caminho → { g, nota }
let primeiraCarga = true;
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
// Cada nota tem um lugar fixo (pela ordem de criação): começa rente à cápsula, alterna esquerda/direita e vai
// abrindo para as pontas do arco visível. O meio fica livre (a cápsula cobre o topo do anel).
function starPos(idx) {
  const ring = Math.min(STAR_RINGS.length - 1, Math.floor(idx / RING_CAP));
  const R = STAR_RINGS[ring];
  const slot = ring < STAR_RINGS.length - 1 ? idx - ring * RING_CAP : (idx - ring * RING_CAP) % RING_CAP;
  const aMin = Math.asin(Math.min(0.99, (FLOOR.cy - 852) / R.ry));   // ponta do arco visível (acima da borda de baixo)
  const gap = Math.asin(205 / R.rx);                                   // metade do vão debaixo da cápsula
  const perSide = RING_CAP / 2;
  const step = (Math.PI / 2 - gap - aMin) / (perSide - 1);
  const side = slot % 2 ? -1 : 1;                                       // 1 = direita, -1 = esquerda
  const off = gap + Math.floor(slot / 2) * step + (ring % 2) * step / 2;
  const a = Math.PI / 2 - side * off;
  return { x: FLOOR.cx + R.rx * Math.cos(a), y: FLOOR.cy - R.ry * Math.sin(a) };
}
function setNotas(notas) {
  const vivos = new Set(notas.map((n) => n.caminho));
  stars.forEach((st, c) => { if (!vivos.has(c)) { st.g.classList.add('morre'); setTimeout(() => st.g.remove(), 700); stars.delete(c); } });
  notas.forEach((n, idx) => {
    let st = stars.get(n.caminho);
    if (!st) {
      const g = svgEl('g', { class: `star t-${n.tipo}` + (primeiraCarga ? '' : ' nasce') });
      const j = hash(n.caminho);
      g.style.setProperty('--w', (0.55 + j * 0.45).toFixed(2));
      g.style.setProperty('--tw', `${(2.4 + j * 4).toFixed(2)}s`);
      g.style.setProperty('--td', `${(-j * 7).toFixed(2)}s`);
      const hit = svgEl('circle', { class: 'hit', r: 11 });
      const halo = svgEl('circle', { class: 'halo', r: 10 });
      const ray = svgEl('path', { class: 'ray', d: 'M-9 0H9M0-9V9' });
      const core = svgEl('circle', { class: 'core', r: n.tipo === 'mente' ? 3.6 : 2.5 });
      const burst = svgEl('circle', { class: 'burst', r: 6 });
      g.append(halo, ray, burst, core, hit);
      g.addEventListener('mouseenter', () => showTip(st));
      g.addEventListener('mouseleave', hideTip);
      g.addEventListener('click', (e) => { e.stopPropagation(); openNote(st.nota); });
      // teclado: Tab chega na estrela, Enter/Espaço abre a nota; o foco mostra a etiqueta como o mouse
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.addEventListener('focus', () => showTip(st));
      g.addEventListener('blur', hideTip);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNote(st.nota); } });
      starsG.appendChild(g);
      st = { g };
      stars.set(n.caminho, st);
      if (!primeiraCarga) { scene.talk(0.7); setTimeout(() => g.classList.remove('nasce'), 1600); }
    }
    st.nota = n;
    st.g.setAttribute('class', st.g.getAttribute('class').replace(/t-\w+/, `t-${n.tipo}`));
    st.g.setAttribute('aria-label', `${n.titulo} (${TIPO_NOME[n.tipo] || 'nota'})`);
    const p = starPos(idx);
    const j = hash(n.caminho);
    st.x = p.x; st.y = p.y + (j - 0.5) * 8;
    st.g.style.transform = `translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px)`;
  });
  primeiraCarga = false;
  $('#notas-n').textContent = notas.length;
}
const TIPO_NOME = { nota: 'nota', conversa: 'conversa', resumo: 'resumo', skill: 'skill', mente: 'mente' };
function showTip(st) {
  tipTx.textContent = `${st.nota.titulo}  ·  ${TIPO_NOME[st.nota.tipo] || ''}`;
  const w = tipTx.getComputedTextLength() + 20;
  tipBg.setAttribute('width', w);
  tipTx.setAttribute('x', 10);
  const x = Math.max(8, Math.min(STAGE.w - w - 8, st.x - w / 2));
  starTip.setAttribute('transform', `translate(${x.toFixed(1)} ${(st.y - 36).toFixed(1)})`);
  starTip.classList.add('on');
}
function hideTip() { starTip.classList.remove('on'); }
// o brilho da fala: cada pedaço de texto que chega dá um impulso; o impulso decai a cada quadro
let fala = 0, falando = false;
function starsFrame(dt) {
  fala *= Math.pow(0.12, dt);            // decai ~88% por segundo
  const alvo = falando ? Math.max(fala, 0.22) : fala;
  starsSvg.style.setProperty('--fala', alvo.toFixed(3));
  scene.setTalkGlow?.(alvo);
}
function impulso(v = 0.22) { fala = Math.min(1, fala + v); scene.talk(0.35 + fala * 0.5); }
const tocadas = new Set();
function flareNota(caminho) {
  const st = stars.get(caminho);
  if (!st) return;
  st.g.classList.remove('flare'); void st.g.getBBox(); st.g.classList.add('flare', 'tocada');
  tocadas.add(caminho);
  setTimeout(() => st.g.classList.remove('flare'), 1500);
  impulso(0.3);
}

// ---------- card da nota (abre no lugar do E-mail/Calendário) ----------
let notaAberta = null;
async function openNote(n) {
  if (selected >= 0) closeSkill();
  notaAberta = n.caminho;
  stars.forEach((st, c) => st.g.classList.toggle('aberta', c === n.caminho));
  dBody.innerHTML = `
    <header class="d-h">
      <div class="d-ic"><svg class="ic"><use href="#${n.tipo === 'skill' ? 'i-spark' : n.tipo === 'conversa' || n.tipo === 'resumo' ? 'i-chat' : 'i-book'}"/></svg></div>
      <div class="d-t"><small>${(TIPO_NOME[n.tipo] || 'nota').toUpperCase()} · ESTRELA</small><h2>${esc(n.titulo)}</h2></div>
      <button class="d-x" title="Fechar"><svg class="ic"><use href="#i-x"/></svg></button>
    </header>
    <p class="d-path">${esc(n.caminho)} · ${new Date(n.mudou).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
    <div class="d-md note"><span class="ln">carregando…</span></div>`;
  detail.querySelector('.d-x').onclick = (e) => { e.stopPropagation(); closeNote(); };
  document.body.classList.add('note-on');
  showDetail(true);
  try {
    const r = await fetch('/api/nota?caminho=' + encodeURIComponent(n.caminho));
    const res = await r.json();
    if (notaAberta !== n.caminho) return;
    const txt = n.tipo === 'skill' ? corpoSkill(res.texto || '') : (res.texto || '').replace(/^#\s+.+\n/, '');
    detail.querySelector('.d-md').innerHTML = md(txt) || '<span class="ln">(vazia)</span>';
  } catch { detail.querySelector('.d-md').innerHTML = '<span class="ln">Não consegui abrir a nota.</span>'; }
}
function closeNote(hide = true) {
  if (!notaAberta) return;
  notaAberta = null;
  stars.forEach((st) => st.g.classList.remove('aberta'));
  document.body.classList.remove('note-on');
  if (hide) showDetail(false);
}

// ---------- núcleo e pontas dos dedos ----------
hero.addEventListener('mousemove', (e) => {
  const [x, y] = toStage(e);
  scene.setMouse(x, y);
  const onDom = e.target.closest('.card, .skill, header, .star');
  const overCore = !onDom && scene.overCore(x, y);
  const overTip = !onDom ? scene.overFinger(x, y) : -1;
  scene.boost(overCore);
  hero.style.cursor = overCore || overTip >= 0 ? 'pointer' : '';
});
hero.addEventListener('mouseleave', () => { scene.setMouse(0, 0, false); scene.boost(false); });
hero.addEventListener('click', (e) => {
  if (e.target.closest('.card, .skill, button, input, .star')) return;
  if (selected >= 0 || document.body.classList.contains('detail-on')) { closeSkill(); return; }
  const [x, y] = toStage(e);
  const f = scene.overFinger(x, y);
  if (f >= 0) { pulseFinger(f, SKILLS.findIndex((s) => s.finger === f), true); return; }
  if (scene.overCore(x, y)) { scene.ripple(); scene.talk(1); $('#q').focus(); }
});

// ======================================================================
// chat ↔ cérebro (server/server.mjs)
// ======================================================================
const msgs = $('#msgs');
const hhmm = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
function add(kind, html, time = hhmm()) {
  const li = document.createElement('li');
  li.className = kind + ' new';
  li.innerHTML = (kind.includes('bot') ? '<i class="avatar"></i>' : '') + '<p></p>' + (time ? `<time>${time}</time>` : '');
  // o conteúdo entra depois: montado junto com o <p>, uma lista (<ul>) fecharia o balão e ficaria fora dele
  li.querySelector('p').innerHTML = html;
  msgs.appendChild(li);
  rolar();
  return li;
}
const rolar = () => msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });
function sysMsg(html) {
  const li = document.createElement('li');
  li.className = 'sys new';
  li.innerHTML = `<p>${html}</p>`;
  msgs.appendChild(li);
  rolar();
}
function vazio() {
  if (msgs.children.length) return;
  sysMsg('Fale com o Galilei. Ele lembra do que você contar — cada lembrança vira uma estrela lá embaixo.');
}
function historico(txt) {
  msgs.innerHTML = '';
  lerHistorico(txt).forEach((f) => {
    const li = add(f.quem === 'voce' ? 'me' : 'bot', f.quem === 'voce' ? esc(f.texto) : md(f.texto), f.hora);
    li.classList.remove('new');
  });
  vazio();
  msgs.scrollTop = msgs.scrollHeight;
}

let atual = null;        // a resposta que está chegando: { li, p, texto }
let renderT = 0;
const ACAO = { Read: 'lendo a memória', Glob: 'procurando nas notas', Grep: 'procurando nas notas', Write: 'anotando',
  Edit: 'atualizando uma nota', WebSearch: 'pesquisando na web', WebFetch: 'lendo uma página', Skill: 'usando uma skill', Encontrou: 'lembrando',
  Gmail: 'lendo seus e-mails', Rascunho: 'escrevendo um rascunho', Agenda: 'olhando sua agenda', Evento: 'mexendo na sua agenda',
  Conectando: 'conectando ao Gmail e à agenda' };

// ---------- aviso de limite do plano (o chat e os cards param até renovar) ----------
const avisoLimite = document.createElement('div');
avisoLimite.className = 'limite-aviso';
avisoLimite.setAttribute('role', 'status');
avisoLimite.hidden = true;
$('#chat').appendChild(avisoLimite);
function setLimite(l) {
  $('#chat').classList.toggle('com-limite', !!l);
  avisoLimite.hidden = !l;
  msgs.scrollTop = msgs.scrollHeight;          // o aviso encolhe a conversa: a última mensagem continua à vista
  if (!l) return;
  let volta = '';
  if (l.ate) {
    const d = new Date(l.ate);
    volta = ` · volta ${mesmoDia(d, new Date()) ? 'às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`;
  } else {
    const m = String(l.texto).match(/resets? ([^(·\n]+)/i);
    if (m) volta = ` · renova ${m[1].trim()}`;
  }
  avisoLimite.innerHTML = `<b>Limite do plano Claude atingido</b><span>O chat e os cards voltam quando o plano renovar${esc(volta)}.</span>`;
}
// as ferramentas dos conectores têm nomes longos (mcp__claude_ai_Gmail__search_threads…): vira um apelido curto
function apelido(nome) {
  if (/_Gmail__(create|update)_draft$/.test(nome)) return 'Rascunho';
  if (/_Gmail__/.test(nome)) return 'Gmail';
  if (/_Google_Calendar__(create|update)_event$/.test(nome)) return 'Evento';
  if (/_Google_Calendar__/.test(nome)) return 'Agenda';
  return nome;
}
function bolhaAtual() {
  if (atual) return atual;
  const li = add('bot typing', '<i></i><i></i><i></i>', '');
  li.querySelector('.avatar').classList.add('talk');
  atual = { li, p: li.querySelector('p'), texto: '', acao: null };
  return atual;
}
function mostrarAcao(nome) {
  const a = bolhaAtual();
  if (a.texto) return;
  if (!a.acao) { a.acao = document.createElement('small'); a.acao.className = 'acao'; a.li.appendChild(a.acao); }
  a.acao.textContent = (ACAO[nome] || 'pensando') + '…';
}
function inicioResposta() {
  bolhaAtual();
  falando = true;
  msgs.setAttribute('aria-busy', 'true');      // o leitor de tela espera a resposta terminar para ler
  wave.classList.add('talk');
  stars.forEach((st) => st.g.classList.remove('tocada'));
  tocadas.clear();
}
function chegouTexto(t) {
  const a = bolhaAtual();
  if (!a.texto) { a.li.classList.remove('typing'); a.acao?.remove(); a.acao = null; }
  a.texto += t;
  impulso(Math.min(0.35, 0.06 + t.length * 0.012));
  if (!renderT) renderT = requestAnimationFrame(() => { renderT = 0; if (atual) { atual.p.innerHTML = md(atual.texto); rolar(); } });
}
// o servidor avisou que o texto até aqui era bastidor (veio antes de uma consulta): a bolha volta a "pensando…"
function limparTexto() {
  if (!atual || !atual.texto) return;
  atual.texto = '';
  atual.li.classList.add('typing');
  atual.p.innerHTML = '<i></i><i></i><i></i>';
}
function fimResposta({ erro, resultado, texto } = {}) {
  falando = false;
  wave.classList.remove('talk');
  msgs.setAttribute('aria-busy', 'false');
  const a = atual; atual = null;
  if (!a) return;
  if (typeof texto === 'string' && texto.trim()) { a.texto = texto; a.li.classList.remove('typing'); }   // a versão final é a do servidor
  a.acao?.remove();
  a.li.querySelector('.avatar')?.classList.remove('talk');
  if (!a.texto.trim()) {
    if (erro) { a.li.classList.remove('typing'); a.li.classList.add('erro'); a.p.textContent = resultado || 'Algo deu errado no cérebro. Tente de novo.'; }
    else a.li.remove();
  } else a.p.innerHTML = md(a.texto);
  if (!a.li.querySelector('time') && a.li.isConnected) a.li.insertAdjacentHTML('beforeend', `<time>${hhmm()}</time>`);
  setTimeout(() => stars.forEach((st) => st.g.classList.remove('tocada')), 5000);
}

async function mandar(texto) {
  texto = texto.trim();
  if (!texto) return;
  msgs.querySelectorAll('li.sys').forEach((li) => li.remove());
  add('me', esc(texto));
  scene.talk(0.5);
  try {
    const r = await fetch('/api/mensagem', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Galilei': '1' }, body: JSON.stringify({ texto }) });
    if (!r.ok) throw new Error();
  } catch { sysMsg('Não consegui falar com o servidor. Ele está rodando? (<code>node server/server.mjs</code>)'); }
}
$('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#q');
  const t = q.value;
  q.value = '';
  mandar(t);
});

// status do cérebro no cabeçalho do chat
const onlineEl = $('.online');
function setStatus(s) {
  onlineEl.dataset.status = s;
  onlineEl.lastChild.textContent = { online: 'ONLINE', pensando: 'PENSANDO', offline: 'OFFLINE' }[s] || s.toUpperCase();
}

// menu "⋮": nova conversa
const menu = document.createElement('div');
menu.className = 'chat-menu';
menu.innerHTML = '<button type="button" data-a="nova">Nova conversa<small>salva um resumo e começa do zero</small></button>';
$('#chat').appendChild(menu);
$('#chat .more').addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('on'); });
addEventListener('click', () => menu.classList.remove('on'));
menu.querySelector('[data-a="nova"]').addEventListener('click', async () => {
  menu.classList.remove('on');
  sysMsg('Guardando um resumo desta conversa…');
  try { await fetch('/api/nova-conversa', { method: 'POST', headers: { 'X-Galilei': '1' } }); } catch { sysMsg('Servidor fora do ar.'); }
});

async function carregarEstado() {
  const r = await fetch('/api/estado');
  const e = await r.json();
  setSkills(e.skills || []);
  setNotas(e.notas || []);
  setStatus(e.status || 'online');
  if (e.painel) renderPainel(e.painel);
  setLimite(e.limite || null);
  return e;
}

function conectar() {
  const es = new EventSource('/api/eventos');
  es.addEventListener('status', (e) => setStatus(JSON.parse(e.data).status));
  es.addEventListener('inicio', inicioResposta);
  es.addEventListener('texto', (e) => chegouTexto(JSON.parse(e.data).t));
  es.addEventListener('ferramenta', (e) => {
    const d = JSON.parse(e.data);
    if (!atual && !falando) return;
    if (d.nome === 'ToolSearch') return;
    const ap = apelido(d.nome);
    mostrarAcao(ap);
    if (ap === 'Gmail' || ap === 'Rascunho') pulseCard('#mail');
    if (ap === 'Agenda' || ap === 'Evento') pulseCard('#cal');
    if (d.caminho) flareNota(d.caminho);
    if (d.nome === 'WebSearch' || d.nome === 'WebFetch') { const i = SKILLS.findIndex((s) => s.id === 'pesquisa'); if (i >= 0) fire(i); }
    if (d.nome === 'Skill' && d.skill) {
      const i = SKILLS.findIndex((s) => s.id === d.skill);
      if (i >= 0) { fire(i, true); flareNota(SKILLS[i].caminho); }
    }
    impulso(0.15);
  });
  es.addEventListener('limpar', limparTexto);
  es.addEventListener('limite', (e) => setLimite(JSON.parse(e.data)));
  es.addEventListener('fim', (e) => fimResposta(JSON.parse(e.data)));
  es.addEventListener('erro', (e) => sysMsg(esc(JSON.parse(e.data).mensagem)));
  es.addEventListener('notas', (e) => setNotas(JSON.parse(e.data).notas));
  es.addEventListener('skills', (e) => setSkills(JSON.parse(e.data).skills));
  es.addEventListener('painel', (e) => renderPainel(JSON.parse(e.data)));
  es.addEventListener('nova-conversa', () => { fimResposta(); msgs.innerHTML = ''; sysMsg('Conversa nova. O resumo da anterior virou uma estrela.'); });
  let caiu = false;
  es.onerror = () => { setStatus('offline'); caiu = true; };
  es.onopen = () => { if (caiu) { caiu = false; carregarEstado().catch(() => {}); } };
}

(async () => {
  try {
    const e = await carregarEstado();
    historico(e.historico);
    if (e.status === 'pensando') inicioResposta();
  } catch {
    setStatus('offline');
    sysMsg('O servidor do Galilei não está rodando. Abra com <code>iniciar.cmd</code> (ou <code>node server/server.mjs</code>) e acesse <b>http://localhost:3737</b>.');
  }
  conectar();
  idle();
})();
requestAnimationFrame(frame);

// ======================================================================
// o agente vivo (abertura, HUD decodificando, onda de voz)
// ======================================================================
document.querySelectorAll('.logo-mark path, .hudlines path').forEach((p, i) => {
  p.setAttribute('pathLength', '1');
  p.style.setProperty('--d', `${0.15 + i * 0.11}s`);
});
const GLYPHS = '01<>/\\|#*+=-_:ABCDEFXYZ';
function decode(el, ms = 900) {
  if (!el._orig) {
    const list = [];
    // o contador de estrelas muda sozinho: fica fora da decodificação (senão voltaria ao valor antigo)
    const walk = (n) => n.childNodes.forEach((c) => (c.nodeType === 3 ? list.push([c, c.textContent]) : c.id === 'notas-n' ? null : walk(c)));
    walk(el);
    el._orig = list;
  }
  if (el._busy) return;
  el._busy = true;
  const t0 = performance.now();
  const step = (now) => {
    const u = Math.min(1, (now - t0) / ms);
    el._orig.forEach(([node, txt]) => {
      node.textContent = [...txt].map((ch, kk) => (ch.trim() === '' || kk / txt.length < u * 1.2 - 0.2 ? ch
        : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join('');
    });
    if (u < 1) requestAnimationFrame(step);
    else { el._orig.forEach(([node, txt]) => { node.textContent = txt; }); el._busy = false; }
  };
  requestAnimationFrame(step);
}
const HUD_TEXT = [...document.querySelectorAll('.hud p, .foot p, .logo-sub')];
HUD_TEXT.forEach((el, i) => setTimeout(() => decode(el, 1100), 350 + i * 140));
setInterval(() => { if (!document.hidden) decode(HUD_TEXT[Math.floor(Math.random() * HUD_TEXT.length)], 700); }, 6500);

(() => {
  const arc = $('#arc');
  const l = arc.cloneNode();
  l.id = 'arc-light';
  l.setAttribute('pathLength', '1000');
  arc.after(l);
})();

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

// ======================================================================
// cards de E-mail e Calendário: dados reais do Gmail e do Google Calendar (o servidor consulta e avisa por SSE)
// ======================================================================
function pulseCard(sel) {
  $(sel)?.animate([{ borderColor: 'rgba(61, 169, 255,.8)', boxShadow: '0 0 28px rgba(61, 169, 255,.35)' }, {}], { duration: 1400, easing: 'ease-out' });
}
let painelAtual = null;

function renderPainel(p) {
  painelAtual = p;
  ['#mail-refresh', '#cal-refresh'].forEach((s) => {
    const b = $(s);
    b.classList.toggle('girando', !!p.carregando);
    b.title = p.atualizado ? `Atualizado às ${hm(new Date(p.atualizado))} · clique para atualizar` : 'Atualizar';
  });
  renderMail(p);
  renderCal(p);
}

function linhaVazia(ul, texto) { ul.innerHTML = `<li class="vazio"><span>${texto}</span></li>`; }

function renderMail(p) {
  const badge = $('#mail-badge');
  const n = p.naoLidos || 0;
  badge.hidden = !p.atualizado || n === 0;
  const txt = n + (p.naoLidosMais ? '+' : '');
  if (badge.textContent !== txt) { badge.textContent = txt; badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
  const ul = $('#mail-rows');
  // do mais recente para o mais antigo (a consulta nem sempre devolve em ordem)
  const emails = [...(p.emails || [])].sort((a, b) => (quando(b.quando) || 0) - (quando(a.quando) || 0));
  if (!emails.length) {
    linhaVazia(ul, p.carregando && !p.atualizado ? 'Lendo seu Gmail…' : p.erro && !p.atualizado ? 'Não consegui ler o Gmail. Tente o ↻.' : 'Caixa de entrada vazia.');
    return;
  }
  ul.innerHTML = '';
  emails.forEach((m, i) => {
    const d = quando(m.quando);
    const li = document.createElement('li');
    if (m.naoLido) li.className = 'unread';
    li.style.setProperty('--i', i);
    li.title = `${m.de} — ${m.assunto}`;
    li.innerHTML = `<i class="dot"></i><b>${esc(m.de)}</b><span>${esc(m.assunto || '(sem assunto)')}</span>` +
      `<time>${d ? (mesmoDia(d, new Date()) ? hm(d) : diaRel(d)) : ''}</time>`;
    li.addEventListener('click', () => { pulseCard('#mail'); openEmail(m); });
    acessivel(li, `${m.naoLido ? 'Não lido. ' : ''}${m.de}: ${m.assunto || 'sem assunto'}`);
    ul.appendChild(li);
  });
}

// ---------- ler um e-mail: abre inteiro no card da direita ----------
async function openEmail(m) {
  if (selected >= 0) closeSkill();
  const chave = 'email:' + m.id;
  notaAberta = chave;
  stars.forEach((st) => st.g.classList.remove('aberta'));
  const d = quando(m.quando);
  dBody.innerHTML = `
    <header class="d-h">
      <div class="d-ic"><svg class="ic"><use href="#i-mail"/></svg></div>
      <div class="d-t"><small>E-MAIL · PRINCIPAL</small><h2>${esc(m.assunto || '(sem assunto)')}</h2></div>
      <button class="d-x" title="Fechar"><svg class="ic"><use href="#i-x"/></svg></button>
    </header>
    <p class="d-path">${esc(m.de)}${d ? ' · ' + esc(d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })) : ''}</p>
    <div class="d-md email"><span class="ln carregando">Abrindo o e-mail…</span></div>
    <div class="d-act">
      <a class="d-run" href="${gmailLink(m.id, painelAtual?.conta)}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-mail"/></svg>Abrir no Gmail</a>
      <button class="d-ask" data-a="resumir">Resumir</button>
      <button class="d-ask" data-a="responder">Responder</button>
    </div>`;
  detail.querySelector('.d-x').onclick = (e) => { e.stopPropagation(); closeNote(); };
  detail.querySelector('[data-a="resumir"]').onclick = (e) => { e.stopPropagation(); mandar(`Resuma o e-mail de ${m.de} com o assunto "${m.assunto}".`); };
  detail.querySelector('[data-a="responder"]').onclick = (e) => {
    e.stopPropagation();
    const q = $('#q'); q.value = `Escreva um rascunho de resposta ao e-mail de ${m.de} ("${m.assunto}") dizendo que `; q.focus();
  };
  document.body.classList.add('note-on');
  showDetail(true);
  try {
    const r = await fetch('/api/email?id=' + encodeURIComponent(m.id));
    const res = await r.json();
    if (notaAberta !== chave) return;
    const box = detail.querySelector('.d-md');
    if (!r.ok || !Array.isArray(res.mensagens)) throw new Error(res.erro);
    box.innerHTML = res.mensagens.map((x) => {
      const dx = quando(x.quando);
      return `<div class="msg"><div class="msg-h"><b>${esc(x.de || '')}</b>` +
        `<small>${esc([x.email, dx ? dx.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''].filter(Boolean).join(' · '))}</small>` +
        (x.para ? `<small>para ${esc(x.para)}</small>` : '') + `</div><div class="msg-t">${textoEmail(x.texto || '')}</div></div>`;
    }).join('') || '<span class="ln">(sem conteúdo)</span>';
  } catch (ex) {
    if (notaAberta !== chave) return;
    detail.querySelector('.d-md').innerHTML = `<span class="ln">Não consegui abrir aqui${ex?.message ? ` (${esc(ex.message)})` : ''}. ` +
      `Use o botão <b>Abrir no Gmail</b>.</span>`;
  }
}

function renderCal(p) {
  $('#cal-dia').textContent = cap(new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }));
  const info = $('#cal-info');
  const ul = $('#cal-events');
  if (!p.atualizado) {
    info.textContent = '';
    linhaVazia(ul, p.carregando ? 'Lendo sua agenda…' : p.erro ? 'Não consegui ler a agenda. Tente o ↻.' : 'Lendo sua agenda…');
    return;
  }
  const i = infoAgenda(p.eventos);
  info.textContent = i.txt;
  info.classList.toggle('countdown', i.quente);
  const prox = eventosFuturos(p.eventos).slice(0, 2);
  if (!prox.length) { linhaVazia(ul, 'Nada marcado para os próximos dias.'); return; }
  const agora = new Date();
  ul.innerHTML = '';
  prox.forEach((e, k) => {
    const li = document.createElement('li');
    if (e.ini <= agora) li.className = 'now';
    li.style.setProperty('--i', k);
    const dia = mesmoDia(e.ini, agora) ? '' : diaRel(e.ini);
    const detalhes = [dia, e.local, e.diaInteiro ? 'dia inteiro' : duracao(e.ini, e.fimD)].filter(Boolean).join(' • ');
    li.title = e.titulo;
    li.innerHTML = `<i class="bar"></i><time>${e.diaInteiro ? '—' : hm(e.ini)}</time><b>${esc(e.titulo)}</b><span>${esc(detalhes)}</span>`;
    li.addEventListener('click', () => {
      pulseCard('#cal');
      mandar(`Me fala do evento "${e.titulo}" (${dia || 'hoje'}${e.diaInteiro ? '' : ' às ' + hm(e.ini)}).`);
    });
    acessivel(li, `${e.titulo}, ${dia || 'hoje'}${e.diaInteiro ? ', dia inteiro' : ' às ' + hm(e.ini)}`);
    ul.appendChild(li);
  });
}
// itens clicáveis das listas: alcançáveis pelo Tab e abertos com Enter/Espaço, com um nome para leitores de tela
function acessivel(el, rotulo) {
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', rotulo);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
}
// a contagem regressiva e o "agora" andam sozinhos
setInterval(() => { if (painelAtual) renderCal(painelAtual); }, 30000);
['#mail-refresh', '#cal-refresh'].forEach((s) => $(s).addEventListener('click', async (e) => {
  e.stopPropagation();
  $('#mail-refresh').classList.add('girando'); $('#cal-refresh').classList.add('girando');
  try { await fetch('/api/painel/atualizar', { method: 'POST', headers: { 'X-Galilei': '1' } }); } catch { sysMsg('Servidor fora do ar.'); }
}));
renderCal({});
