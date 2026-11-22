// Jarvis — servidor local: serve a página (app/), liga o cérebro (o CLI do Claude Code, rodando na pasta cerebro/)
// e avisa a página por SSE de tudo o que acontece (texto chegando, notas tocadas, notas novas, skills).
// Sem dependências: só Node 24. Rodar: node server/server.mjs  →  http://localhost:3737
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'app');
const CEREBRO = path.join(ROOT, 'cerebro');
const ESTADO = path.join(ROOT, 'server', 'estado.json');
const PORT = Number(process.env.PORT) || 3737;
const TOOLS = 'Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Skill';

// ---------- estado que sobrevive a reinícios ----------
let estado = { sessionId: null, conversa: null };
try { estado = { ...estado, ...JSON.parse(fs.readFileSync(ESTADO, 'utf8')) }; } catch { /* primeira vez */ }
const salvarEstado = () => fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 2));

// ---------- SSE ----------
const clientes = new Set();
function enviar(tipo, dados = {}) {
  const msg = `event: ${tipo}\ndata: ${JSON.stringify(dados)}\n\n`;
  clientes.forEach((res) => res.write(msg));
}
setInterval(() => clientes.forEach((res) => res.write(': ping\n\n')), 20000);

// ---------- notas e skills ----------
const dentro = (p) => { const r = path.relative(CEREBRO, p); return r && !r.startsWith('..') && !path.isAbsolute(r); };
const rel = (p) => path.relative(CEREBRO, p).split(path.sep).join('/');
function tipoDe(r) {
  if (r === 'CLAUDE.md') return 'mente';
  if (r.startsWith('.claude/skills/')) return 'skill';
  if (r.startsWith('conversas/')) return r.endsWith('-resumo.md') ? 'resumo' : 'conversa';
  return 'nota';
}
function listarNotas() {
  const out = [];
  const andar = (dir) => {
    let itens = [];
    try { itens = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const it of itens) {
      const p = path.join(dir, it.name);
      if (it.isDirectory()) { andar(p); continue; }
      if (!it.name.toLowerCase().endsWith('.md')) continue;
      const st = fs.statSync(p);
      const r = rel(p);
      let titulo = it.name.replace(/\.md$/i, '');
      try {
        const txt = fs.readFileSync(p, 'utf8');
        const m = txt.match(/^#\s+(.+)$/m);
        if (r.startsWith('.claude/skills/')) titulo = 'Skill · ' + (skillMeta(txt).rotulo || path.basename(path.dirname(p)));
        else if (m) titulo = m[1].trim();
      } catch { /* ilegível */ }
      out.push({ caminho: r, titulo, tipo: tipoDe(r), tamanho: st.size, criada: st.birthtimeMs || st.mtimeMs, mudou: st.mtimeMs });
    }
  };
  andar(CEREBRO);
  return out.sort((a, b) => a.criada - b.criada);
}
function skillMeta(txt) {
  const fm = (txt.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
  const campo = (k) => ((fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1] || '').trim();
  let extra = {};
  try { extra = JSON.parse((txt.match(/<!--\s*jarvis:\s*(\{[\s\S]*?\})\s*-->/) || [])[1] || '{}'); } catch { /* sem metadados */ }
  const nome = campo('name');
  return { nome, descricao: campo('description'), rotulo: extra.rotulo || nome, icone: extra.icone || 'i-spark',
    conexoes: Array.isArray(extra.conexoes) ? extra.conexoes : [] };
}
function listarSkills() {
  const dir = path.join(CEREBRO, '.claude', 'skills');
  let pastas = [];
  try { pastas = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch { return []; }
  return pastas.map((d) => {
    const p = path.join(dir, d.name, 'SKILL.md');
    try {
      const st = fs.statSync(p);
      return { id: d.name, caminho: rel(p), criada: st.birthtimeMs || st.mtimeMs, ...skillMeta(fs.readFileSync(p, 'utf8')) };
    } catch { return null; }
  }).filter(Boolean).sort((a, b) => a.criada - b.criada);
}

// a pasta mudou (o Jarvis anotou algo, você editou uma nota…): avisa a página
let watchT = 0;
fs.watch(CEREBRO, { recursive: true }, () => {
  clearTimeout(watchT);
  watchT = setTimeout(() => { enviar('notas', { notas: listarNotas() }); enviar('skills', { skills: listarSkills() }); }, 250);
});

// ---------- transcrição da conversa ----------
const doisDig = (n) => String(n).padStart(2, '0');
const agora = () => { const d = new Date(); return `${doisDig(d.getHours())}:${doisDig(d.getMinutes())}`; };
function arquivoConversa() {
  if (estado.conversa && fs.existsSync(path.join(CEREBRO, estado.conversa))) return path.join(CEREBRO, estado.conversa);
  const d = new Date();
  const base = `${d.getFullYear()}-${doisDig(d.getMonth() + 1)}-${doisDig(d.getDate())}-${doisDig(d.getHours())}${doisDig(d.getMinutes())}`;
  estado.conversa = `conversas/${base}.md`;
  salvarEstado();
  const p = path.join(CEREBRO, estado.conversa);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `# Conversa — ${doisDig(d.getDate())}/${doisDig(d.getMonth() + 1)}/${d.getFullYear()} ${agora()}\n\n`);
  return p;
}
function registrar(quem, texto) {
  fs.appendFileSync(arquivoConversa(), `**${quem}** (${agora()}):\n\n${texto.trim()}\n\n---\n\n`);
}

// ---------- o cérebro: um processo `claude` vivo, conversando por stream-json ----------
let proc = null, buf = '', stderrTail = '';
let turno = null;            // { texto, registrar, aoFim }
const fila = [];
let status = 'online';
function setStatus(s) { status = s; enviar('status', { status: s }); }

function ligarCerebro() {
  const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--include-partial-messages', '--restricted', '--strict-mcp-config',
    '--tools', TOOLS, '--allowedTools', TOOLS, '--permission-mode', 'dontAsk', '--permission-prompts', 'none'];
  if (estado.sessionId) args.push('--resume', estado.sessionId);
  // o servidor pode ter sido aberto de dentro de outra sessão do Claude Code: não herdar as variáveis dela
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDECODE|CLAUDE_CODE_)/.test(k)));
  proc = spawn('claude', args, { cwd: CEREBRO, env, windowsHide: true });
  buf = ''; stderrTail = '';
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const linha = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!linha) continue;
      try { tratar(JSON.parse(linha)); } catch (e) { console.error('[cerebro] linha inválida:', linha.slice(0, 200)); }
    }
  });
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (d) => { stderrTail = (stderrTail + d).slice(-2000); console.error('[cerebro]', d.trim()); });
  const este = proc;
  proc.on('error', (e) => { console.error('[cerebro] não consegui iniciar o claude:', e.message); });
  proc.on('exit', (code) => {
    if (proc === este) proc = null;
    console.log(`[cerebro] saiu (código ${code})`);
    if (turno) {
      // se a sessão salva não existe mais, começa outra na próxima
      if (/No conversation found|session/i.test(stderrTail) && estado.sessionId) { estado.sessionId = null; salvarEstado(); }
      enviar('erro', { mensagem: 'O cérebro parou no meio da resposta. ' + (stderrTail.trim().split('\n').pop() || '') });
      fimDoTurno(true);
    }
  });
}

function tratar(ev) {
  if (ev.type === 'system' && ev.subtype === 'init') {
    if (ev.session_id && ev.session_id !== estado.sessionId) { estado.sessionId = ev.session_id; salvarEstado(); }
    return;
  }
  if (!turno) return;
  if (ev.type === 'stream_event') {
    const e = ev.event;
    if (ev.parent_tool_use_id) return;
    if (e.type === 'content_block_start' && e.content_block?.type === 'text' && turno.texto && !turno.texto.endsWith('\n\n')) {
      turno.texto += '\n\n'; enviar('texto', { t: '\n\n' });
    }
    if (e.type === 'content_block_delta' && e.delta?.type === 'text_delta') {
      turno.texto += e.delta.text;
      enviar('texto', { t: e.delta.text });
    }
    return;
  }
  if (ev.type === 'assistant' && !ev.parent_tool_use_id) {
    for (const b of ev.message?.content || []) {
      if (b.type !== 'tool_use') continue;
      const inp = b.input || {};
      const dados = { nome: b.name };
      if (inp.file_path) { const p = path.resolve(CEREBRO, inp.file_path); if (dentro(p)) dados.caminho = rel(p); }
      if (inp.pattern) dados.busca = inp.pattern;
      if (inp.query) dados.busca = inp.query;
      if (inp.url) dados.url = inp.url;
      if (b.name === 'Skill' && inp.skill) dados.skill = inp.skill;
      enviar('ferramenta', dados);
    }
    return;
  }
  if (ev.type === 'user' && Array.isArray(ev.message?.content)) {
    // Glob/Grep devolvem caminhos: as notas encontradas também "acendem"
    for (const b of ev.message.content) {
      if (b.type !== 'tool_result' || typeof b.content !== 'string') continue;
      const achadas = new Set();
      for (const linha of b.content.split('\n')) {
        const m = linha.trim().match(/^(.+?\.md)(?::\d+.*)?$/i);
        if (!m) continue;
        const p = path.resolve(CEREBRO, m[1]);
        if (dentro(p) && fs.existsSync(p)) achadas.add(rel(p));
      }
      achadas.forEach((c) => enviar('ferramenta', { nome: 'Encontrou', caminho: c }));
    }
    return;
  }
  if (ev.type === 'result') fimDoTurno(!!ev.is_error, ev);
}

function fimDoTurno(erro, ev) {
  const t = turno; turno = null;
  if (t && t.registrar && t.texto.trim()) registrar('Jarvis', t.texto);
  enviar('fim', { erro, texto: t?.texto || '', resultado: erro && ev?.result ? String(ev.result).slice(0, 300) : undefined });
  setStatus(proc ? 'online' : 'offline');
  t?.aoFim?.(erro);
  proximo();
}

function perguntar(texto, { registrarNaConversa = true, aoFim } = {}) {
  fila.push({ texto, registrarNaConversa, aoFim });
  proximo();
}
function proximo() {
  if (turno || !fila.length) return;
  const item = fila.shift();
  if (!proc) ligarCerebro();
  turno = { texto: '', registrar: item.registrarNaConversa, aoFim: item.aoFim };
  if (item.registrarNaConversa) registrar('Você', item.texto);
  setStatus('pensando');
  enviar('inicio', {});
  proc.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: item.texto } }) + '\n');
}

function novaConversa() {
  return new Promise((resolve) => {
    const recomecar = () => {
      if (proc) { proc.kill(); proc = null; }
      estado.sessionId = null; estado.conversa = null; salvarEstado();
      enviar('nova-conversa', {});
      setStatus('online');
      resolve();
    };
    const temConversa = estado.conversa && estado.sessionId && fs.existsSync(path.join(CEREBRO, estado.conversa));
    if (!temConversa) return recomecar();
    const resumo = estado.conversa.replace(/\.md$/, '-resumo.md');
    perguntar(`[sistema] A conversa vai ser encerrada. Escreva agora o resumo desta conversa no arquivo ${resumo}, ` +
      'seguindo as regras de resumo do CLAUDE.md, e guarde em notas/ o que ainda não foi guardado e valer a pena lembrar.',
    { registrarNaConversa: false, aoFim: recomecar });
  });
}

// ---------- criar skill pelo "+" da órbita ----------
function criarSkill({ nome, descricao, icone, conexoes }) {
  const rotulo = String(nome || '').trim().slice(0, 30);
  if (!rotulo) throw new Error('Dê um nome para a skill.');
  const slug = rotulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'skill';
  const dir = path.join(CEREBRO, '.claude', 'skills', slug);
  if (fs.existsSync(dir)) throw new Error('Já existe uma skill com esse nome.');
  const desc = String(descricao || '').trim().replace(/\s+/g, ' ').slice(0, 400) || `Skill ${rotulo}.`;
  const conns = (Array.isArray(conexoes) ? conexoes : []).map((c) => String(c).trim()).filter(Boolean).slice(0, 7);
  const meta = { rotulo, icone: /^i-[a-z]+$/.test(icone) ? icone : 'i-spark', conexoes: conns };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'),
    `---\nname: ${slug}\ndescription: ${desc.replace(/\n/g, ' ')} Use quando o Guilherme pedir algo ligado a ${rotulo}.\n---\n` +
    `<!-- jarvis: ${JSON.stringify(meta)} -->\n\n# ${rotulo}\n\n${desc}\n` +
    (conns.length ? `\nConexões: ${conns.join(', ')}.\n` : ''));
  return slug;
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8' };
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const corpo = (req) => new Promise((ok, falha) => {
  let d = '';
  req.setEncoding('utf8');
  req.on('data', (c) => { d += c; if (d.length > 1e6) req.destroy(); });
  req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { falha(e); } });
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/eventos') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`event: status\ndata: ${JSON.stringify({ status })}\n\n`);
      clientes.add(res);
      req.on('close', () => clientes.delete(res));
      return;
    }
    if (url.pathname === '/api/estado') {
      let historico = '';
      try { if (estado.conversa) historico = fs.readFileSync(path.join(CEREBRO, estado.conversa), 'utf8'); } catch { /* nova */ }
      return json(res, 200, { status, notas: listarNotas(), skills: listarSkills(), historico });
    }
    if (url.pathname === '/api/mensagem' && req.method === 'POST') {
      const { texto } = await corpo(req);
      if (!String(texto || '').trim()) return json(res, 400, { erro: 'Mensagem vazia.' });
      perguntar(String(texto).slice(0, 20000));
      return json(res, 202, { ok: true });
    }
    if (url.pathname === '/api/nova-conversa' && req.method === 'POST') {
      novaConversa();
      return json(res, 202, { ok: true });
    }
    if (url.pathname === '/api/skills' && req.method === 'POST') {
      try { return json(res, 201, { id: criarSkill(await corpo(req)) }); } catch (e) { return json(res, 400, { erro: e.message }); }
    }
    if (url.pathname === '/api/nota') {
      const p = path.resolve(CEREBRO, url.searchParams.get('caminho') || '');
      if (!dentro(p) || !p.toLowerCase().endsWith('.md') || !fs.existsSync(p)) return json(res, 404, { erro: 'Nota não encontrada.' });
      return json(res, 200, { caminho: rel(p), texto: fs.readFileSync(p, 'utf8') });
    }
    // estático (app/)
    const alvo = path.resolve(APP, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!alvo.startsWith(APP + path.sep) || !fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(alvo).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(alvo).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 500, { erro: e.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Jarvis no ar: http://localhost:${PORT}`);
  console.log(`Cérebro: ${CEREBRO}${estado.sessionId ? ` (retomando a sessão ${estado.sessionId})` : ''}`);
});
const sair = () => { if (proc) proc.kill(); process.exit(0); };
process.on('SIGINT', sair);
process.on('SIGTERM', sair);
