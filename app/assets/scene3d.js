// Cena 3D do Jarvis: a mão em wireframe e o núcleo (cúpula de pontos), num só renderer, com bloom.
// Coordenadas em pixels da imagem de referência (1536×864): x para a direita, y para baixo (convertido para -y no mundo).
// A câmera é posta de modo que o plano z=0 coincida com a imagem pixel a pixel.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const STAGE = { w: 1536, h: 864 };
const lin = (hex) => new THREE.Color(hex);            // THREE.Color já converte sRGB → linear
// v1.11: a cor principal agora é o azul (no lugar do verde); o nome GREEN ficou para não mexer no resto do código
const GREEN = lin('#3da9ff');
const BABY = lin('#a9d8ff');
const VIOLET = lin('#8f7bff');
const NAVY = 0x000000;
const GREEN_DIM = lin('#1f5fbf');
const WHITE = lin('#eaf2ff');

// ---------- a mão: medidas tiradas da referência (px) ----------
const HAND = {
  // v1.7: a mão deitada com a palma para baixo e os dedos pendendo (pose de marionetista), vista de frente.
  // O antebraço vem de cima e de trás; vemos as costas da mão inclinadas para nós; os dedos saem dos nós, avançam
  // para a frente (z+) e caem; dos dedos descem os fios até as skills. Mão esquerda: o polegar fica à esquerda (Pesquisa).
  wrist: [767, 120],          // pivô da mão (o pulso)
  fingers: [                  // base (nó, dentro das costas da mão) e ponta em px de tela + z (px), controle da curva [x, y, z]
    { name: 'polegar', base: [692, 186], bz: -40, mid: [628, 212, 34], tip: [588, 320], tz: 50, rb: 30, rt: 24 },
    { name: 'indicador', base: [702, 230], bz: 0, mid: [690, 236, 98], tip: [664, 348], tz: 92, rb: 28, rt: 23 },
    { name: 'medio', base: [758, 236], bz: 6, mid: [760, 244, 108], tip: [765, 368], tz: 102, rb: 29, rt: 24 },
    { name: 'anelar', base: [814, 234], bz: 0, mid: [828, 242, 100], tip: [864, 352], tz: 94, rb: 27, rt: 22 },
    { name: 'minimo', base: [862, 224], bz: -8, mid: [892, 230, 82], tip: [944, 324], tz: 76, rb: 24, rt: 20 },
  ],
  // costas da mão + antebraço: seções ao longo do eixo (do antebraço, lá atrás e em cima, até os nós)
  // [centro x, centro y, centro z, meia-largura, meia-espessura]
  dorsum: [
    [767, -40, -330, 58, 48], [767, 20, -250, 60, 48], [767, 76, -172, 62, 45], [767, 116, -112, 70, 40],
    [768, 148, -76, 102, 34], [769, 176, -46, 128, 31], [770, 200, -16, 140, 29], [770, 220, 10, 136, 27],
    [770, 234, 26, 120, 23], [770, 242, 36, 92, 16], [770, 246, 42, 50, 7],
  ],
};

const w = ([x, y], z = 0) => new THREE.Vector3(x, -y, z);

// Superfície paramétrica → linhas de grade (anéis e longitudinais) + malha preta que esconde as linhas de trás.
function gridSurface(rows, { alpha = (r, c) => 1, closed = true } = {}) {
  // rows: array de anéis, cada um um array de Vector3 (mesmo número de pontos)
  const nR = rows.length, nC = rows[0].length;
  const pos = [], col = [];
  const push = (a, ra, ca, b, rb, cb) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const aa = alpha(ra, ca), ab = alpha(rb, cb);
    col.push(WHITE.r, WHITE.g, WHITE.b, aa, WHITE.r, WHITE.g, WHITE.b, ab);
  };
  for (let r = 0; r < nR; r++) {
    for (let c = 0; c < nC; c++) {
      const c2 = c + 1;
      if (c2 < nC || closed) push(rows[r][c], r, c, rows[r][c2 % nC], r, c2 % nC);
      if (r + 1 < nR) push(rows[r][c], r, c, rows[r + 1][c], r + 1, c);
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  lg.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));

  const mp = [], idx = [];
  rows.forEach(row => row.forEach(p => mp.push(p.x, p.y, p.z)));
  for (let r = 0; r + 1 < nR; r++) for (let c = 0; c < (closed ? nC : nC - 1); c++) {
    const a = r * nC + c, b = r * nC + (c + 1) % nC, d = (r + 1) * nC + c, e = (r + 1) * nC + (c + 1) % nC;
    idx.push(a, d, b, b, d, e);
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3));
  mg.setIndex(idx);
  const occ = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({
    color: NAVY, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
  }));
  occ.renderOrder = -1;
  return { lines, occ };
}

// v1.7: referencial dos anéis estável mesmo quando o dedo aponta para a câmera: n1 ≈ largura (eixo x), n2 = espessura
const X = new THREE.Vector3(1, 0, 0);
function frameOf(tangent) {
  const n2 = new THREE.Vector3().crossVectors(X, tangent).normalize();
  const n1 = new THREE.Vector3().crossVectors(tangent, n2).normalize();
  return [n1, n2];
}

// v1.7: as costas da mão e o antebraço, por seções ao longo do eixo; a face de cima (costas) inclina para a câmera
function buildDorsum() {
  const nSeg = 30, n = 2.6;
  const C = HAND.dorsum.map(([x, y, z]) => w([x, y], z));
  const rows = HAND.dorsum.map(([, , , hw, d], i) => {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(C.length - 1, i + 1)];
    const axis = b.clone().sub(a).normalize();
    const [n1, n2raw] = frameOf(axis);
    const n2 = n2raw.y < 0 ? n2raw.negate() : n2raw;     // a espessura aponta para cima (costas)
    const out = [];
    for (let s = 0; s < nSeg; s++) {
      const th = (s / nSeg) * Math.PI * 2;
      const c = Math.cos(th), sn = Math.sin(th);
      const xo = hw * Math.sign(c) * Math.abs(c) ** (2 / n);
      const zo = d * Math.sign(sn) * Math.abs(sn) ** (2 / n);
      out.push(C[i].clone().addScaledVector(n1, xo).addScaledVector(n2, zo));
    }
    return out;
  });
  const g = gridSurface(rows, {
    alpha: (r) => Math.min(1, r / 3.2) * 0.5,     // o antebraço some lá em cima
  });
  const grp = new THREE.Group();
  grp.add(g.occ, g.lines);
  return grp;
}

function buildFinger(f) {
  // tudo no referencial local da base (o grupo fica na base, para o dedo girar em torno dela)
  const B = w(f.base, f.bz), T = w(f.tip, f.tz);
  const local = (v) => v.clone().sub(B);
  const mid = w([f.mid[0], f.mid[1]], f.mid[2]);
  const curve = new THREE.QuadraticBezierCurve3(local(B), local(mid), local(T));
  const len = curve.getLength();
  const nAlong = Math.max(10, Math.round(len / 11));
  const nCap = 6, nSeg = 16;
  const rows = [];
  const ring = (center, tangent, r) => {
    const [n1, n2] = frameOf(tangent);
    const out = [];
    for (let s = 0; s < nSeg; s++) {
      const th = (s / nSeg) * Math.PI * 2;
      out.push(center.clone().addScaledVector(n1, Math.cos(th) * r).addScaledVector(n2, Math.sin(th) * r * 0.8));
    }
    return out;
  };
  for (let i = 0; i <= nAlong; i++) {
    const t = i / nAlong;
    const r = f.rb + (f.rt - f.rb) * t + Math.sin(t * Math.PI * 3) * 1.2;   // leve ondulação nas juntas
    rows.push(ring(curve.getPoint(t), curve.getTangent(t), r));
  }
  const tipC = curve.getPoint(1), tipT = curve.getTangent(1);
  for (let k = 1; k <= nCap; k++) {
    const a = (k / nCap) * Math.PI / 2;
    const r = Math.max(0.5, f.rt * Math.cos(a));
    rows.push(ring(tipC.clone().addScaledVector(tipT, f.rt * Math.sin(a)), tipT, r));
  }
  const nR = rows.length;
  const g = gridSurface(rows, {
    // começa apagado dentro da palma, cheio no resto
    alpha: (r) => Math.min(1, Math.max(0, r - 2) / 3) * 0.55,
  });
  const group = new THREE.Group();
  group.position.copy(B);
  group.add(g.occ, g.lines);
  // a ponta verde
  const tip = new THREE.Object3D();
  tip.position.copy(tipC).addScaledVector(tipT, f.rt * 0.35);
  group.add(tip);

  // v1.5 — animações do dedo
  // anel de varredura: um anel verde que sobe da base até a ponta (energia indo para a skill)
  const SCAN_N = 28;
  const scanGeo = new THREE.BufferGeometry();
  scanGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SCAN_N * 3), 3));
  const scan = new THREE.LineLoop(scanGeo, new THREE.LineBasicMaterial({ color: GREEN.clone().multiplyScalar(2.4), transparent: true,
    opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scan.renderOrder = 2;
  group.add(scan);
  const scanTo = (t) => {
    const tt = Math.min(1, Math.max(0, t));
    const c = curve.getPoint(tt), tg = curve.getTangent(tt);
    const r = (f.rb + (f.rt - f.rb) * tt) * 1.06;
    const [n1, n2] = frameOf(tg);
    const a = scanGeo.attributes.position.array;
    for (let s = 0; s < SCAN_N; s++) {
      const th = (s / SCAN_N) * Math.PI * 2;
      const p = c.clone().addScaledVector(n1, Math.cos(th) * r).addScaledVector(n2, Math.sin(th) * r * 0.8);
      a[s * 3] = p.x; a[s * 3 + 1] = p.y; a[s * 3 + 2] = p.z;
    }
    scanGeo.attributes.position.needsUpdate = true;
  };
  // onda na ponta: um círculo que se abre quando a energia chega
  const ripPts = [];
  for (let s = 0; s < 40; s++) { const a = (s / 40) * Math.PI * 2; ripPts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0)); }
  const ripple = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ripPts),
    new THREE.LineBasicMaterial({ color: GREEN.clone().multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false,
      depthTest: false, blending: THREE.AdditiveBlending }));
  tip.add(ripple);
  return { group, tip, rows: nR, name: f.name, scan, scanTo, ripple };
}

// ---------- o núcleo ----------
// v1.10: a cápsula (a IA) no centro, inteira; as skills orbitam num anel inclinado em volta dela
const CORE = { c: [767, 612], r: 150, tilt: -0.5 };
export const ORBIT = { cx: 767, cy: 612, R: 262, phi: 0.29 };     // anel das skills: raio e inclinação (rad)

const DOT_VS = /* glsl */`
  attribute float aSeed;
  uniform float uTime, uBoost, uRipple, uPx;
  varying float vA;
  varying float vH;
  varying float vRim;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 nrm = normalize(normalMatrix * normalize(position));
    float facing = clamp(nrm.z, 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.0);
    float tw = 0.65 + 0.35 * sin(uTime * (1.5 + aSeed * 2.5) + aSeed * 40.0);
    // onda do clique: um anel de brilho que corre pela esfera a partir do topo
    float ang = acos(clamp(normalize(position).y, -1.0, 1.0));
    float wave = uRipple > 0.0 ? exp(-pow((ang - uRipple * 3.0) * 6.0, 2.0)) : 0.0;
    vA = (0.8 + 0.45 * rim) * tw * (0.8 + 0.5 * uBoost) + wave * 1.4;
    gl_PointSize = uPx * (2.1 + 0.8 * rim + wave * 2.0);
    vH = normalize(position).y;   // altura no próprio objeto (-1 embaixo, 1 em cima)
    vRim = rim;
    gl_Position = projectionMatrix * mv;
  }`;
const DOT_FS = /* glsl */`
  uniform vec3 uColor, uTop, uBottom;
  uniform float uTint;
  varying float vA;
  varying float vH;
  varying float vRim;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.1, d) * vA;
    // v1.11: degradê das referências — azul bebê em cima, azul neon no meio, violeta embaixo e na borda
    vec3 col = vH > 0.0 ? mix(uColor, uTop, vH * 0.85) : mix(uColor, uBottom, clamp(-vH * 1.5 + vRim * 0.45, 0.0, 1.0));
    col = mix(uColor, col, uTint);
    gl_FragColor = vec4(col * a, a);
  }`;

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.15, 'rgba(205,230,255,0.9)');
  grd.addColorStop(0.4, 'rgba(61,150,255,0.35)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function lineLoop(points, color, opacity) {
  const g = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
}

function buildCore(px, glowTex) {
  const R = CORE.r;
  const root = new THREE.Group();
  root.position.copy(w(CORE.c));
  const spin = new THREE.Group();          // gira em torno do próprio eixo
  const tilt = new THREE.Group();
  tilt.rotation.x = CORE.tilt;
  tilt.rotation.z = 0.12;
  tilt.add(spin);
  root.add(tilt);

  // esconde o lado de trás (pontos, meridianos e órbitas atrás da esfera)
  const occ = new THREE.Mesh(new THREE.SphereGeometry(R - 3, 64, 48),
    new THREE.MeshBasicMaterial({ color: NAVY }));
  root.add(occ);

  // pontos em latitudes (grade, como na referência)
  const pos = [], seed = [];
  const step = 6.8;
  const nLat = Math.round(Math.PI * R / step);
  for (let i = 1; i < nLat; i++) {
    const lat = -Math.PI / 2 + (i / nLat) * Math.PI;
    const rr = Math.cos(lat) * R;
    const n = Math.max(6, Math.round(2 * Math.PI * rr / step));
    for (let j = 0; j < n; j++) {
      const lo = (j / n) * Math.PI * 2;
      pos.push(Math.cos(lo) * rr, Math.sin(lat) * R, Math.sin(lo) * rr);
      seed.push(Math.random());
    }
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  dg.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
  const dotU = { uTime: { value: 0 }, uBoost: { value: 0 }, uRipple: { value: 0 }, uPx: { value: px }, uColor: { value: GREEN },
    uTop: { value: BABY }, uBottom: { value: VIOLET }, uTint: { value: 1 } };
  const dots = new THREE.Points(dg, new THREE.ShaderMaterial({
    vertexShader: DOT_VS, fragmentShader: DOT_FS, uniforms: dotU, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  spin.add(dots);

  // três círculos máximos (as linhas brilhantes que cruzam a esfera)
  const great = (rx, ry, rz) => {
    const pts = [];
    for (let i = 0; i < 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * (R + 1), 0, Math.sin(a) * (R + 1)));
    }
    const l = lineLoop(pts, GREEN.clone().multiplyScalar(1.8), 0.9);
    l.rotation.set(rx, ry, rz);
    return l;
  };
  spin.add(great(1.15, 0, 0.35), great(0.5, 0.9, -0.6), great(-0.3, 0, 1.25));

  // filamentos: raios curtos na coroa, com um nó na ponta
  const fpos = [], npos = [], nseed = [];
  for (let i = 0; i < 320; i++) {
    const u = Math.random(), v = Math.random();
    const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
    const d = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    const L = 7 + Math.random() * 26;
    const a = d.clone().multiplyScalar(R + 2), b = d.clone().multiplyScalar(R + L);
    fpos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    if (Math.random() < 0.55) { npos.push(b.x, b.y, b.z); nseed.push(Math.random()); }
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
  spin.add(new THREE.LineSegments(fg, new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.5, depthWrite: false })));
  const ng = new THREE.BufferGeometry();
  ng.setAttribute('position', new THREE.Float32BufferAttribute(npos, 3));
  ng.setAttribute('aSeed', new THREE.Float32BufferAttribute(nseed, 1));
  const nodeU = { ...dotU, uPx: { value: px * 2.2 } };
  spin.add(new THREE.Points(ng, new THREE.ShaderMaterial({
    vertexShader: DOT_VS, fragmentShader: DOT_FS, uniforms: nodeU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })));

  // órbitas elípticas com nós que andam
  const orbits = [];
  [[R * 1.45, R * 0.36, 0.2, -0.06], [R * 1.25, R * 0.52, -0.3, 0.5], [R * 1.75, R * 0.26, 0.04, 0.0]].forEach(([rx, ry, rz, ry2], k) => {
    const pts = [];
    for (let i = 0; i < 200; i++) { const a = (i / 200) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, 0)); }
    const loop = lineLoop(pts, k === 2 ? WHITE : GREEN.clone().multiplyScalar(2.2), k === 2 ? 0.4 : 1);
    const holder = new THREE.Group();
    holder.rotation.set(-0.05, ry2, rz);
    holder.add(loop);
    const nodes = [];
    for (let i = 0; i < 3 + k; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: k === 2 ? 0xffffff : 0xa9d6ff, transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.setScalar(k === 2 ? 16 : 24);
      s.userData.phase = Math.random() * Math.PI * 2;
      s.userData.speed = 0.12 + Math.random() * 0.12;
      holder.add(s);
      nodes.push(s);
    }
    orbits.push({ holder, rx, ry, nodes });
    root.add(holder);
  });

  // arcos de horizonte na base: elipses abertas, centradas abaixo da cúpula, que sobem pelas laterais
  // (topo em y ≈ 780–800 px) e passam por trás dela (a malha preta esconde o meio), como na imagem
  // v1.10: os arcos de horizonte ficam fixos embaixo, como um "chão" (não acompanham a cápsula)
  // v1.13: o chão virou holográfico — anel com cometas, anel tracejado girando, anel pontilhado piscando,
  // ondas de sonar saindo de baixo da cápsula e um reflexo de luz azul
  const floor = new THREE.Group();
  floor.position.copy(w([767, 958]));
  const ellipse = (rx, ry, n = 360) => {
    const pos = [], t = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pos.push(Math.cos(a) * rx, Math.sin(a) * ry, 0); t.push(i / n); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
    return g;
  };
  const floorU = { uTalk: { value: 0 }, uTime: { value: 0 }, uNeon: { value: GREEN }, uBaby: { value: BABY }, uViolet: { value: VIOLET } };
  // 1) anel principal: degradê neon (centro) → azul bebê (laterais) e dois cometas correndo em sentidos opostos
  const mainMat = new THREE.ShaderMaterial({ uniforms: floorU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aT; varying float vT; void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime, uTalk; uniform vec3 uNeon, uBaby, uViolet; varying float vT;
      float comet(float head, float dir) { float d = fract((vT - head) * dir); return exp(-d * 34.0) * 1.0 + exp(-pow(min(d, 1.0 - d) * 90.0, 2.0)) * 0.9; }
      void main() {
        float side = abs(cos(vT * 6.2831853));                 // 1 nas laterais, 0 no topo/base
        vec3 col = mix(uNeon, uBaby, side * 0.8);
        float c = comet(fract(uTime * 0.045), -1.0) + comet(fract(0.5 - uTime * 0.032), 1.0);
        col = mix(col, vec3(1.0), clamp(c * 0.35, 0.0, 0.8));
        col = mix(col, uViolet, clamp(c * 0.25, 0.0, 0.4) * side);
        float a = 0.32 + 0.12 * sin(uTime * 1.2 + vT * 40.0) * 0.3 + c + uTalk * 0.35;
        gl_FragColor = vec4(col * a, a);
      }` });
  floor.add(new THREE.LineLoop(ellipse(640, 166), mainMat));
  // 2) anel tracejado girando devagar (régua de HUD)
  const dashMat = new THREE.ShaderMaterial({ uniforms: floorU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aT; varying float vT; void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uBaby; varying float vT;
      void main() {
        float k = fract(vT * 160.0 - uTime * 0.35);
        float dash = step(k, 0.38);
        float major = step(fract(vT * 16.0 - uTime * 0.035), 0.012);    // marcas maiores, como uma escala
        float a = dash * 0.16 + major * 0.5;
        gl_FragColor = vec4(uBaby * a, a);
      }` });
  floor.add(new THREE.LineLoop(ellipse(702, 180, 720), dashMat));
  // 3) anel externo pontilhado, os pontos piscando como estrelas
  const dotG = ellipse(770, 196, 260);
  const seeds = new Float32Array(260).map(() => Math.random());
  dotG.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  const dotMat = new THREE.ShaderMaterial({ uniforms: { ...floorU, uPx: { value: px } }, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; uniform float uTime, uPx, uTalk; varying float vA;
      void main() { vA = 0.15 + 0.85 * pow(0.5 + 0.5 * sin(uTime * (0.8 + aSeed * 2.4) + aSeed * 50.0), 6.0);
        vA = min(1.0, vA + uTalk * (0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * 9.0 + aSeed * 40.0), 3.0)));
        gl_PointSize = uPx * (1.4 + vA * 1.6); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uBaby; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = smoothstep(0.5, 0.1, d) * vA * 0.9;
        gl_FragColor = vec4(mix(uBaby, vec3(1.0), vA * 0.5) * a, a); }` });
  floor.add(new THREE.Points(dotG, dotMat));
  // 4) ondas de sonar: anéis que nascem debaixo da cápsula e se abrem até sumir
  const sonar = [0, 1, 2].map((k) => {
    const l = new THREE.LineLoop(ellipse(640, 166, 240), new THREE.LineBasicMaterial({ color: GREEN.clone().multiplyScalar(1.8),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    l.userData.off = k / 3;
    floor.add(l);
    return l;
  });
  // 5) reflexo: uma poça de luz azul no chão, logo abaixo da cápsula
  const pool = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x2f7dff, transparent: true, opacity: 0.22,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.position.set(0, 166 - 6, 0);
  pool.scale.set(760, 120, 1);
  floor.add(pool);
  floor.userData = { floorU, dotU: dotMat.uniforms, sonar, pool };

  // v1.10: o anel por onde as skills orbitam (círculo no plano xz, inclinado por phi), e um anel externo bem fraco
  const ring = new THREE.Group();
  ring.position.copy(root.position);
  const ringTrack = (r, color, op) => {
    const pts = [];
    for (let i = 0; i < 240; i++) { const a = (i / 240) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const l = lineLoop(pts, color, op);
    l.rotation.x = ORBIT.phi;
    return l;
  };
  ring.add(ringTrack(ORBIT.R, GREEN.clone().multiplyScalar(1.6), 0.55), ringTrack(ORBIT.R + 22, WHITE, 0.14), ringTrack(ORBIT.R - 26, WHITE, 0.08));

  // v1.10: onde os fios se prendem na cápsula (5 pontos na frente da metade de cima; acompanham os puxões)
  const anchors = [-58, -29, 0, 29, 58].map((deg) => {
    const th = THREE.MathUtils.degToRad(deg);
    const x = R * 0.9 * Math.sin(th), y = R * 0.86 * Math.cos(th) * 0.92;
    const z = Math.sqrt(Math.max(0, R * R - x * x - y * y));
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    root.add(o);
    return o;
  });

  // o brilho central (o "coração")
  const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending }));
  heart.position.set(0, R * 0.05, R + 4);
  heart.scale.setScalar(110);
  root.add(heart);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x2f8cff, transparent: true, opacity: 0.35,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.copy(heart.position);
  halo.scale.setScalar(230);
  root.add(halo);

  return { root, spin, dotU, nodeU, orbits, heart, halo, floor, ring, anchors };
}

// ---------- montagem ----------
export function createScene(canvas, { onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(STAGE.w, STAGE.h, false);
  // o fundo marinho é uma malha bem atrás de tudo: a cor de limpeza do canvas passa por uma conversão de cor a mais no
  // pós-processamento e sairia ~4× mais clara; a malha segue o mesmo caminho das outras e sai no tom certo (#000)
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const fov = 8;   // quase ortográfica: o que tem profundidade não escapa da posição da imagem
  const D = (STAGE.h / 2) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const camera = new THREE.PerspectiveCamera(fov, STAGE.w / STAGE.h, 10, D * 3);
  camera.position.set(STAGE.w / 2, -STAGE.h / 2, D);
  camera.lookAt(STAGE.w / 2, -STAGE.h / 2, 0);

  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshBasicMaterial({ color: NAVY, depthWrite: false }));
  backdrop.position.set(STAGE.w / 2, -STAGE.h / 2, -2500);
  backdrop.renderOrder = -10;
  scene.add(backdrop);
  const glowTex = glowTexture();

  // mão
  const hand = new THREE.Group();
  const pivot = w(HAND.wrist);
  hand.position.copy(pivot);
  const handInner = new THREE.Group();
  handInner.position.copy(pivot).multiplyScalar(-1);
  hand.add(handInner);
  handInner.add(buildDorsum());
  const fingers = HAND.fingers.map(buildFinger);
  fingers.forEach(f => handInner.add(f.group));
  const tipSprites = fingers.map(f => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x7cc4ff, transparent: true, depthWrite: false,
      depthTest: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(30);
    f.tip.add(s);
    return s;
  });
  // v1.5 — faíscas: 3 pontinhos que orbitam cada ponta, em elipses inclinadas
  const sparks = fingers.map((f, i) => [0, 1, 2].map((k) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xcde6ff, transparent: true, depthWrite: false,
      depthTest: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(7);
    s.userData = { ph: k * 2.1 + i, sp: 1.6 + 0.35 * k * (k % 2 ? -1 : 1), rx: 19 + 4 * k, ry: 7 + 3 * k, tilt: 0.5 - 0.45 * k };
    f.tip.add(s);
    return s;
  }));
  scene.add(hand);

  // núcleo
  const core = buildCore(2.0 * dpr, glowTex);
  scene.add(core.root, core.floor, core.ring);
  const CORE_BASE = core.root.position.clone();

  // pós-processamento
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.setSize(STAGE.w, STAGE.h);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(STAGE.w, STAGE.h), 0.5, 0.15, 0.7);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // estado
  const mouse = { x: STAGE.w / 2, y: STAGE.h / 2, on: false };
  const st = { boost: 0, boostTo: 0, ripple: 0, flare: [0, 0, 0, 0, 0], flex: [0, 0, 0, 0, 0], talk: 0,
    scan: [-1, -1, -1, -1, -1], scanCb: [], rip: [-1, -1, -1, -1, -1] };
  const tug = [0, 0, 0, 0, 0];
  const SCAN_S = 0.6;     // segundos da base até a ponta
  const RIP_S = 0.8;      // duração da onda na ponta
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();

  function tips() {
    hand.updateMatrixWorld(true);
    return fingers.map(f => {
      f.tip.getWorldPosition(tmp);
      tmp.project(camera);
      return { name: f.name, x: view.x0 + (tmp.x + 1) / 2 * (view.x1 - view.x0), y: view.y0 + (1 - tmp.y) / 2 * (view.y1 - view.y0) };
    });
  }

  // A tela mostra o palco escalado por s e deslocado por (ox, oy) em px da tela; o canvas cobre w×h px.
  // A câmera enquadra exatamente o retângulo do palco visível: o canvas pode ser maior que o palco (tela inteira).
  const view = { x0: 0, x1: STAGE.w, y0: 0, y1: STAGE.h, s: 1 };
  function setView({ w: W, h: H, s, ox, oy, pr }) {
    Object.assign(view, { x0: -ox / s, x1: (W - ox) / s, y0: -oy / s, y1: (H - oy) / s, s });
    const vh = H / s, cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2;
    const dist = (vh / 2) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    camera.aspect = W / H;
    camera.near = dist * 0.05; camera.far = dist * 3;
    camera.position.set(cx, -cy, dist);
    camera.lookAt(cx, -cy, 0);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, true);
    composer.setPixelRatio(pr);
    composer.setSize(W, H);
    core.dotU.uPx.value = 2.0 * pr * s;
    core.nodeU.uPx.value = 4.4 * pr * s;
    core.floor.userData.dotU.uPx.value = 2.0 * pr * s;
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // mão: respira, abre e fecha de leve, inclina para o cursor
    const breathe = Math.sin(t * 1.3);
    const tx = mouse.on ? (mouse.x - HAND.wrist[0]) / STAGE.w : 0;
    const ty = mouse.on ? (mouse.y - 300) / STAGE.h : 0;
    hand.rotation.y += ((tx * 0.5) - hand.rotation.y) * 0.06;
    hand.rotation.x += ((ty * 0.25) - hand.rotation.x) * 0.06;
    hand.rotation.z = Math.sin(t * 0.6) * 0.008;
    hand.scale.setScalar(1 + breathe * 0.004);
    fingers.forEach((f, i) => {
      const spread = (i - 2) * 0.006 * breathe;
      st.flex[i] *= 0.92;
      tug[i] = Math.max(0, Math.sin(t * 1.25 - i * 0.9)) ** 4 * 0.55;   // v1.10: os dedos puxam os fios em onda
      st.flare[i] *= 0.95;
      f.group.rotation.z = -spread;
      f.group.rotation.x = -(st.flex[i] + tug[i]) * 0.35;
      const pulse = 0.75 + 0.25 * Math.sin(t * 2.2 + i * 1.3);
      tipSprites[i].material.opacity = Math.min(1, pulse + st.flare[i]);
      tipSprites[i].scale.setScalar(26 + 10 * pulse + 40 * st.flare[i]);

      // anel de varredura subindo pelo dedo; ao chegar na ponta: onda, brilho e o callback (o pulso desce pelo fio)
      if (st.scan[i] >= 0) {
        st.scan[i] += dt / SCAN_S;
        const u = st.scan[i];
        f.scanTo(u);
        f.scan.material.opacity = Math.min(1, u * 4) * (u > 0.9 ? (1 - u) * 10 : 1);
        if (u >= 1) {
          st.scan[i] = -1;
          f.scan.material.opacity = 0;
          st.flare[i] = 1;
          st.rip[i] = 0;
          const cb = st.scanCb[i]; st.scanCb[i] = null;
          cb && cb();
        }
      }
      if (st.rip[i] >= 0) {
        st.rip[i] += dt / RIP_S;
        const u = st.rip[i];
        f.ripple.scale.setScalar(10 + 34 * (1 - (1 - u) ** 3));
        f.ripple.material.opacity = Math.max(0, 1 - u);
        if (u >= 1) { st.rip[i] = -1; f.ripple.material.opacity = 0; }
      }
      // faíscas em órbita (mais rápidas e brilhantes logo depois que a energia chega)
      sparks[i].forEach((s) => {
        const d = s.userData, a = d.ph + t * d.sp * (1 + st.flare[i] * 2);
        const x = Math.cos(a) * d.rx, y = Math.sin(a) * d.ry;
        s.position.set(x * Math.cos(d.tilt) - y * Math.sin(d.tilt), x * Math.sin(d.tilt) + y * Math.cos(d.tilt), Math.sin(a) * 6);
        s.material.opacity = 0.45 + 0.35 * Math.sin(a * 2) + st.flare[i] * 0.6;
        s.scale.setScalar(6 + 5 * st.flare[i]);
      });
    });

    // v1.10: a cápsula responde aos fios: sobe com o puxão total e inclina para o lado do dedo que puxa
    const pullUp = tug.reduce((a, v, i) => a + v + st.flex[i] * 0.6, 0);
    const side = tug.reduce((a, v, i) => a + (i - 2) * (v + st.flex[i] * 0.6), 0);
    core.root.position.set(CORE_BASE.x + side * 4, CORE_BASE.y + pullUp * 7 + Math.sin(t * 0.9) * 3, CORE_BASE.z);
    core.root.rotation.z += ((-side * 0.05) - core.root.rotation.z) * 0.12;
    core.ring.position.copy(core.root.position);
    // v1.13: o chão vivo — cometas e tracejado andam, o pontilhado pisca, o sonar se abre a cada ~2,6 s
    const fl = core.floor.userData;
    fl.floorU.uTime.value = t;
    fl.dotU.uTime.value = t;
    fl.sonar.forEach((l) => {
      const u = ((t / 7.8) + l.userData.off) % 1;                  // 3 ondas defasadas num ciclo de 7,8 s
      const sc = 0.32 + u * 0.95;
      l.scale.set(sc, sc, 1);
      l.position.y = 166 * (1 - sc);                                // nasce no topo do chão (debaixo da cápsula)
      l.material.opacity = Math.sin(Math.PI * Math.min(1, u * 1.05)) ** 1.5 * (0.55 + st.talk * 0.4);
    });
    fl.pool.material.opacity = 0.16 + 0.06 * Math.sin(t * 1.1) + st.talk * 0.18 + st.boost * 0.1;
    // núcleo: gira, pulsa como coração, nós andam nas órbitas
    st.boost += (st.boostTo - st.boost) * 0.05;
    core.spin.rotation.y += dt * (0.08 + st.boost * 0.25);
    core.dotU.uTime.value = t;
    core.dotU.uBoost.value = st.boost + st.talk;
    if (st.ripple > 0) { st.ripple += dt * 0.55; if (st.ripple > 1.2) st.ripple = 0; }
    core.dotU.uRipple.value = st.ripple;
    const beatT = (t % 1.6) / 1.6;
    const beat = Math.exp(-((beatT - 0.05) ** 2) / 0.002) + 0.6 * Math.exp(-((beatT - 0.2) ** 2) / 0.002);
    st.talk *= 0.96;
    core.heart.scale.setScalar(100 + 34 * beat + 50 * st.boost + 46 * st.talk);
    core.heart.material.opacity = 0.75 + 0.25 * beat;
    core.halo.material.opacity = 0.18 + 0.15 * beat + 0.25 * st.boost + 0.3 * st.talk;
    core.orbits.forEach((o, k) => {
      o.nodes.forEach((s, i) => {
        const a = s.userData.phase + t * s.userData.speed * (1 + st.boost) * (k % 2 ? -1 : 1) + (i / o.nodes.length) * Math.PI * 2;
        s.position.set(Math.cos(a) * o.rx, Math.sin(a) * o.ry, 0);
        s.material.opacity = 0.8 + 0.2 * Math.sin(t * 3 + i);
      });
    });

    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  onReady && onReady();

  return {
    tips,
    setView,
    setMouse(x, y, on = true) { mouse.x = x; mouse.y = y; mouse.on = on; },
    // distância do cursor ao centro do núcleo, para o hover
    // v1.10: pontos de amarração dos fios na cápsula (px do palco) e o deslocamento da cápsula (para a órbita das skills)
    anchors() {
      core.root.updateMatrixWorld(true);
      return core.anchors.map((o) => { o.getWorldPosition(tmp); tmp.project(camera);
        return { x: view.x0 + (tmp.x + 1) / 2 * (view.x1 - view.x0), y: view.y0 + (1 - tmp.y) / 2 * (view.y1 - view.y0) }; });
    },
    coreShift() { return { x: core.root.position.x - CORE_BASE.x, y: -(core.root.position.y - CORE_BASE.y) }; },
    overCore(x, y) { return Math.hypot(x - CORE.c[0], y - CORE.c[1]) < CORE.r + 20; },
    overFinger(x, y) { const t = tips(); let best = -1, bd = 45; t.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = i; } }); return best; },
    boost(on) { st.boostTo = on ? 1 : 0; },
    ripple() { st.ripple = 0.001; },
    flareFinger(i, flex = true) { st.flare[i] = 1; if (flex) st.flex[i] = 1; },
    // a energia sobe pelo dedo i (anel de varredura); ao chegar na ponta, onda + onArrive()
    scanFinger(i, onArrive) {
      if (st.scan[i] >= 0) { const prev = st.scanCb[i]; st.scanCb[i] = () => { prev && prev(); onArrive && onArrive(); }; return; }
      st.scan[i] = 0; st.scanCb[i] = onArrive;
    },
    talk(v = 1) { st.talk = Math.max(st.talk, v); },
    // brilho da fala (0–1), vindo do app a cada quadro: acende o chão e o anel pontilhado
    setTalkGlow(v) { core.floor.userData.floorU.uTalk.value = v; },
  };
}
