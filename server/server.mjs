// Galilei — servidor local: serve a página (app/), liga o cérebro (o CLI do Claude Code, rodando na pasta cerebro/)
// e avisa a página por SSE de tudo o que acontece (texto chegando, notas tocadas, notas novas, skills).
// Sem dependências: só Node 24. Rodar: node server/server.mjs  →  http://localhost:3737
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { criarTrava, skillMeta, slug, extrairJSON, LIMITE_RE, lerLimite } from './util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'app');
const CEREBRO = path.join(ROOT, 'cerebro');
const ESTADO = path.join(ROOT, 'server', 'estado.json');
const PORT = Number(process.env.PORT) || 3737;
const TOOLS = 'Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Skill,ToolSearch';
// conectores da sua conta Claude (Gmail e Google Calendar): o que o Galilei pode usar sem perguntar ao sistema.
// E-mail: ler e criar rascunhos (quem envia é você). Agenda: ler, criar e editar eventos (ele confirma no chat antes).
const GMAIL = 'mcp__claude_ai_Gmail__', AGENDA = 'mcp__claude_ai_Google_Calendar__';
const CONECTORES = [
  ...['search_threads', 'get_thread', 'get_message', 'list_labels', 'list_drafts', 'get_draft', 'create_draft', 'update_draft'].map((t) => GMAIL + t),
  ...['list_calendars', 'list_events', 'get_event', 'search_events', 'suggest_time', 'create_event', 'update_event'].map((t) => AGENDA + t),
];
// fora de alcance: enviar, responder, encaminhar, apagar, spam, rótulos, anexos; apagar evento e responder convites;
// e os outros conectores da conta (Drive, Docs, Sheets, Slides, LinkedIn, Indeed, Claude Docs)
const PROIBIDOS = [
  ...['send_message', 'reply', 'forward', 'trash_message', 'trash_thread', 'untrash_message', 'untrash_thread', 'delete_draft',
    'mark_message_spam', 'mark_thread_spam', 'unmark_message_spam', 'unmark_thread_spam', 'label_message', 'label_thread',
    'unlabel_message', 'unlabel_thread', 'update_message_labels', 'create_label', 'update_label', 'delete_label',
    'apply_sensitive_message_label', 'apply_sensitive_thread_label', 'download_gmail_attachment'].map((t) => GMAIL + t),
  AGENDA + 'delete_event', AGENDA + 'respond_to_event',
  ...['Google_Drive', 'Google_Docs', 'Google_Sheets', 'Google_Slides', 'LinkedIn_Hiring_Pro', 'Indeed', 'Claude_Docs'].map((s) => `mcp__claude_ai_${s}`),
];
// quem o Galilei é: vai no fim do prompt de sistema do Claude Code (que, sozinho, puxa para "assistente de código")
const PERSONA = fs.readFileSync(path.join(ROOT, 'server', 'persona.md'), 'utf8');
// a sessão grava o prompt de sistema, o CLAUDE.md e as ferramentas: se algo disso mudar, começa uma conversa nova
const personaVersao = (() => {
  let mente = '';
  try { mente = fs.readFileSync(path.join(CEREBRO, 'CLAUDE.md'), 'utf8'); } catch { /* sem CLAUDE.md */ }
  let h = 0;
  for (const c of PERSONA + mente + TOOLS + CONECTORES.join() + PROIBIDOS.join()) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return String(h >>> 0);
})();

// ---------- estado que sobrevive a reinícios ----------
let estado = { sessionId: null, conversa: null, persona: null };
try { estado = { ...estado, ...JSON.parse(fs.readFileSync(ESTADO, 'utf8')) }; } catch { /* primeira vez */ }
const salvarEstado = () => fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 2));
// o prompt de sistema fica gravado na sessão: se a persona mudou, a próxima mensagem abre uma conversa nova
if (estado.persona !== personaVersao) {
  if (estado.sessionId) console.log('[cerebro] a persona mudou: a próxima mensagem começa uma conversa nova');
  estado = { sessionId: null, conversa: null, persona: personaVersao };
  salvarEstado();
}

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

// a pasta mudou (o Galilei anotou algo, você editou uma nota…): avisa a página
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
// cada fala termina com um marcador invisível no Markdown (um "---" na própria resposta não quebra mais o histórico)
const FIM_FALA = '<!-- galilei:fim -->';
function registrar(quem, texto) {
  fs.appendFileSync(arquivoConversa(), `**${quem}** (${agora()}):\n\n${texto.trim()}\n\n${FIM_FALA}\n\n`);
}

// ---------- o cérebro: um processo `claude` vivo, conversando por stream-json ----------
let proc = null, buf = '', stderrTail = '';
let turno = null;            // { texto, registrar, aoFim }
const fila = [];
let status = 'online';
function setStatus(s) { status = s; enviar('status', { status: s }); }
// os conectores (Gmail, agenda) levam ~15 s para ligar depois que o processo nasce: a primeira mensagem espera
const ESPERA_CONECTORES = 15000;
let nasceu = 0;
// religar sozinho se o cérebro cair parado (no máximo 3 vezes em 5 min, para não ficar em laço)
let quedas = [];

// ---------- limite do plano ----------
// Quando o plano Claude esgota (janela de 5 h ou semanal), o chat e os cards param até renovar: a página avisa.
let limite = null;           // { ate: ms | null, texto }
function marcarLimite(texto, ate = null) {
  limite = { ate, texto: String(texto || 'Limite do plano atingido.').slice(0, 200) };
  console.warn('[limite]', limite.texto);
  enviar('limite', limite);
}
function liberarLimite() { if (limite) { limite = null; enviar('limite', null); } }
function olharLimite(ev) {
  const l = lerLimite(ev);
  if (l) marcarLimite(l.texto, l.ate); else if (l === false) liberarLimite();
}

function ligarCerebro() {
  const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--include-partial-messages', '--restricted',
    '--tools', TOOLS, '--allowedTools', [TOOLS, ...CONECTORES].join(','), '--disallowedTools', PROIBIDOS.join(','),
    '--permission-mode', 'dontAsk', '--permission-prompts', 'none',
    '--append-system-prompt', PERSONA];
  if (estado.sessionId) args.push('--resume', estado.sessionId);
  // o servidor pode ter sido aberto de dentro de outra sessão do Claude Code: não herdar as variáveis dela
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDECODE|CLAUDE_CODE_)/.test(k)));
  proc = spawn('claude', args, { cwd: CEREBRO, env, windowsHide: true });
  buf = ''; stderrTail = ''; nasceu = Date.now();
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
    if (LIMITE_RE.test(stderrTail)) marcarLimite(stderrTail.trim().split('\n').pop());
    // se a sessão salva não existe mais, começa outra na próxima
    if (/No conversation found/i.test(stderrTail) && estado.sessionId) { estado.sessionId = null; salvarEstado(); }
    if (turno) {
      enviar('erro', { mensagem: 'O cérebro parou no meio da resposta. ' + (stderrTail.trim().split('\n').pop() || '') });
      fimDoTurno(true);
    }
    // caiu sozinho (não fomos nós que desligamos): religa, para os conectores já estarem prontos na próxima mensagem
    if (!este.desligado && !limite && proc === null) {
      quedas = quedas.filter((t) => Date.now() - t < 300000);
      if (quedas.length < 3) { quedas.push(Date.now()); setTimeout(() => { if (!proc) ligarCerebro(); }, 3000); }
      else console.error('[cerebro] caiu 3 vezes em 5 min: fica desligado até a próxima mensagem');
    }
  });
}

function tratar(ev) {
  olharLimite(ev);
  if (ev.type === 'system' && ev.subtype === 'init') {
    if (ev.session_id && ev.session_id !== estado.sessionId) { estado.sessionId = ev.session_id; salvarEstado(); }
    return;
  }
  if (!turno) return;
  if (ev.type === 'stream_event') {
    const e = ev.event;
    if (ev.parent_tool_use_id) return;
    // texto escrito antes de consultar algo é comentário de bastidor ("vou procurar…", às vezes em inglês), não a
    // resposta: sai do chat. Fica guardado caso a resposta tenha vindo antes da última consulta (ex.: "Anotei." + salvar)
    if (e.type === 'content_block_start' && /tool_use$/.test(e.content_block?.type || '') && turno.texto.trim()) {
      turno.descartado = turno.texto;
      turno.texto = '';
      enviar('limpar', {});
    }
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
      // mexeu no e-mail ou na agenda: os cards se atualizam no fim da resposta
      if (/^mcp__claude_ai_Google_Calendar__(create|update)_event$/.test(b.name)) turno.mudouAgenda = true;
      if (/^mcp__claude_ai_Gmail__(create|update)_draft$/.test(b.name)) turno.mudouEmail = true;
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
  if (t && !t.texto.trim() && t.descartado) t.texto = t.descartado;     // a resposta veio antes da última consulta
  if (t && t.registrar && t.texto.trim()) registrar('Galilei', t.texto);
  enviar('fim', { erro, texto: t?.texto || '', resultado: erro && ev?.result ? String(ev.result).slice(0, 300) : undefined });
  setStatus(proc ? 'online' : 'offline');
  if (t?.mudouAgenda || t?.mudouEmail) atualizarPainel();
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
  const p = proc;
  const escrever = () => {
    if (proc !== p || !turno) return;      // o processo caiu enquanto esperava: o "exit" já encerrou o turno
    p.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: item.texto } }) + '\n');
  };
  // processo recém-nascido: espera o Gmail e a agenda conectarem (senão esta resposta sairia sem eles)
  const espera = ESPERA_CONECTORES - (Date.now() - nasceu);
  if (espera > 0) { enviar('ferramenta', { nome: 'Conectando' }); setTimeout(escrever, espera); } else escrever();
}

function novaConversa() {
  return new Promise((resolve) => {
    const recomecar = () => {
      if (proc) { proc.desligado = true; proc.kill(); proc = null; }
      estado.sessionId = null; estado.conversa = null; salvarEstado();
      enviar('nova-conversa', {});
      setStatus('online');
      ligarCerebro();      // já sobe a próxima sessão: os conectores conectam enquanto você não escreve
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

// ---------- sessões curtas do Claude (Haiku) para ler o Gmail e a agenda ----------
// Cada uma é um processo `claude` separado do cérebro, só de leitura, com resposta em JSON (--json-schema).
// Fica viva entre os usos (os conectores levam uns segundos para conectar) e é renovada a cada 6 usos.
const FUSO = Intl.DateTimeFormat().resolvedOptions().timeZone;
function isoLocal(d) {
  const off = -d.getTimezoneOffset(), s = off >= 0 ? '+' : '-', a = Math.abs(off);
  return `${d.getFullYear()}-${doisDig(d.getMonth() + 1)}-${doisDig(d.getDate())}T${doisDig(d.getHours())}:${doisDig(d.getMinutes())}:00` +
    `${s}${doisDig(Math.floor(a / 60))}:${doisDig(a % 60)}`;
}
function sessaoHaiku(nome, tools, schema) {
  let proc = null, buf = '', pronta = false, usos = 0, atual = null, timeout = 0;
  const fila = [];
  const ligar = () => {
    if (proc) proc.kill();
    const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--model', 'haiku',
      '--restricted', '--tools', 'ToolSearch', '--allowedTools', ['ToolSearch', ...tools].join(','),
      '--permission-mode', 'dontAsk', '--permission-prompts', 'none', '--no-session-persistence', '--json-schema', JSON.stringify(schema)];
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDECODE|CLAUDE_CODE_)/.test(k)));
    const p = spawn('claude', args, { cwd: path.join(ROOT, 'server'), env, windowsHide: true });
    proc = p; buf = ''; pronta = false; usos = 0;
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const linha = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!linha) continue;
        try {
          const ev = JSON.parse(linha);
          olharLimite(ev);                  // os cards também percebem o limite do plano
          if (ev.type === 'result') terminar(ev);
        } catch { /* linha parcial */ }
      }
    });
    p.stderr.on('data', (d) => console.error(`[${nome}]`, String(d).trim()));
    p.on('error', (e) => console.error(`[${nome}] não consegui iniciar o claude:`, e.message));
    p.on('exit', () => { if (proc !== p) return; proc = null; if (atual) terminar({ is_error: true, result: 'A consulta parou no meio.' }); });
    // dá tempo para o Gmail e a agenda conectarem antes da primeira pergunta
    setTimeout(() => { if (proc === p) { pronta = true; proximo(); } }, 15000);
  };
  function terminar(ev) {
    clearTimeout(timeout);
    const a = atual; atual = null;
    const dados = extrairJSON(ev);
    if (a) a.ok(ev.is_error || !dados ? { erro: String(ev.result || 'Não consegui ler.').slice(0, 200) } : { dados });
    proximo();
  }
  function proximo() {
    if (atual || !fila.length) return;
    if (!proc || usos >= 6) { ligar(); return; }
    if (!pronta) return;
    atual = fila.shift(); usos++;
    clearTimeout(timeout);
    timeout = setTimeout(() => { if (atual && proc) proc.kill(); }, 150000);
    proc.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: atual.prompt } }) + '\n');
  }
  return {
    perguntar: (prompt) => new Promise((ok) => { fila.push({ prompt, ok }); proximo(); }),
    aquecer: () => { if (!proc) ligar(); },
    parar: () => { if (proc) proc.kill(); },
  };
}

// ---------- painel: os cards de E-mail (aba Principal) e Calendário ----------
const PAINEL = path.join(ROOT, 'server', 'painel.json');
const MAX_EMAILS = 15;
const sPainel = sessaoHaiku('painel',
  [GMAIL + 'search_threads', GMAIL + 'get_thread', AGENDA + 'list_calendars', AGENDA + 'list_events'],
  { type: 'object', required: ['naoLidos', 'naoLidosMais', 'emails', 'eventos'], properties: {
    naoLidos: { type: 'integer', minimum: 0 },
    naoLidosMais: { type: 'boolean' },
    conta: { type: 'string' },
    emails: { type: 'array', items: { type: 'object', required: ['id', 'de', 'assunto', 'quando', 'naoLido'], properties: {
      id: { type: 'string' }, de: { type: 'string' }, assunto: { type: 'string' }, quando: { type: 'string' }, naoLido: { type: 'boolean' } } } },
    eventos: { type: 'array', items: { type: 'object', required: ['titulo', 'inicio'], properties: {
      titulo: { type: 'string' }, inicio: { type: 'string' }, fim: { type: 'string' }, local: { type: 'string' }, diaInteiro: { type: 'boolean' } } } },
  } });
let painel = { atualizado: null, naoLidos: 0, naoLidosMais: false, emails: [], eventos: [], erro: null };
try { painel = { ...painel, ...JSON.parse(fs.readFileSync(PAINEL, 'utf8')) }; } catch { /* primeira vez */ }
let pCarregando = false, pDeNovo = false;
function enviarPainel() { enviar('painel', { ...painel, carregando: pCarregando }); }

async function atualizarPainel() {
  if (pCarregando) { pDeNovo = true; return; }
  pCarregando = true; pDeNovo = false;
  enviarPainel();
  const agoraD = new Date();
  const ini = new Date(agoraD); ini.setHours(0, 0, 0, 0);
  const fim = new Date(ini); fim.setDate(fim.getDate() + 3); fim.setMinutes(-1);
  // "category:primary" volta vazio pela API do Gmail; a aba Principal é a caixa de entrada menos as outras abas
  const PRINCIPAL = 'in:inbox -category:promotions -category:social -category:updates -category:forums';
  const prompt = `Agora é ${isoLocal(agoraD)} (fuso ${FUSO}). Monte o painel com dados reais, sem inventar nada:\n` +
    `1) Gmail: busque "${PRINCIPAL}" (pageSize ${MAX_EMAILS}) e devolva essas conversas, da mais recente para a ` +
    'mais antiga: id da conversa (threadId), remetente (só o nome, sem e-mail), assunto, data/hora da última mensagem em ' +
    'ISO 8601 com fuso, e se está não lida. Se a busca não trouxer esses dados, use get_thread com messageFormat METADATA_ONLY.\n' +
    `2) Não lidas: busque "${PRINCIPAL} is:unread" (pageSize 25). naoLidos = quantidade de conversas que a ` +
    'busca DEVOLVEU (conte-as); naoLidosMais = true só se a resposta indicar uma próxima página (nextPageToken).\n' +
    '2b) conta = o endereço de e-mail desta conta do Gmail (o destinatário que se repete nas mensagens da caixa de ' +
    'entrada); deixe vazio se não tiver certeza.\n' +
    `3) Google Calendar: eventos do calendário principal de ${isoLocal(ini)} até ${isoLocal(fim)}, em ordem de início, com ` +
    `título, início e fim em ISO 8601 com fuso (timeZone ${FUSO}), local e se é de dia inteiro.\n` +
    'Se uma parte falhar, devolva a lista dela vazia. Responda só com o JSON.';
  const r = await sPainel.perguntar(prompt);
  pCarregando = false;
  const d = r.dados;
  if (d && Array.isArray(d.emails) && Array.isArray(d.eventos)) {
    painel = {
      atualizado: Date.now(), erro: null,
      // a busca de não lidas pega até 25: se veio cheia, há pelo menos isso ("25+")
      naoLidos: Math.max(0, Math.min(25, Number(d.naoLidos) || 0)), naoLidosMais: !!d.naoLidosMais || Number(d.naoLidos) >= 25,
      emails: d.emails.slice(0, MAX_EMAILS), eventos: d.eventos.slice(0, 12),
      // a conta da caixa (para o "Abrir no Gmail" abrir na conta certa); se não vier, fica a que já se sabia
      conta: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.conta || '').trim()) ? String(d.conta).trim() : painel.conta || null,
    };
    try { fs.writeFileSync(PAINEL, JSON.stringify(painel, null, 2)); } catch { /* sem disco */ }
  } else {
    painel = { ...painel, erro: r.erro || 'Não consegui ler o e-mail e a agenda.' };
    console.error('[painel] falhou:', painel.erro);
  }
  enviarPainel();
  if (pDeNovo) atualizarPainel();
}
// a cada 30 min, mas só com a página aberta e sem o limite do plano esgotado (não gasta à toa)
const PAINEL_VELHO = 30 * 60 * 1000;
const painelVelho = () => !painel.atualizado || Date.now() - painel.atualizado > PAINEL_VELHO;
setInterval(() => { if (clientes.size && !limite) atualizarPainel(); }, PAINEL_VELHO);

// ---------- leitor: abre um e-mail inteiro no card da direita ----------
const sLeitor = sessaoHaiku('leitor', [GMAIL + 'get_thread', GMAIL + 'get_message'],
  { type: 'object', required: ['assunto', 'mensagens'], properties: {
    assunto: { type: 'string' },
    mensagens: { type: 'array', items: { type: 'object', required: ['de', 'quando', 'texto'], properties: {
      de: { type: 'string' }, email: { type: 'string' }, para: { type: 'string' }, quando: { type: 'string' }, texto: { type: 'string' } } } },
  } });
const emailsLidos = new Map();      // id → { quando, dados } (cache de 10 min: abrir de novo é instantâneo)
async function lerEmail(id) {
  const c = emailsLidos.get(id);
  if (c && Date.now() - c.quando < 600000) return { dados: c.dados };
  const r = await sLeitor.perguntar(`Abra a conversa do Gmail de threadId "${id}" (get_thread com messageFormat FULL_CONTENT; se não der, ` +
    'use get_message nas mensagens). Devolva o assunto e as mensagens da mais antiga para a mais recente (no máximo as 6 ' +
    'últimas): remetente (nome), e-mail do remetente, destinatários, data/hora em ISO 8601 com fuso, e o texto da mensagem ' +
    'em texto simples, fiel ao original (sem resumir, sem HTML), sem repetir o histórico citado ("Em ... escreveu:") e com no ' +
    'máximo 6000 caracteres. Mantenha os links como URL. Não invente nada. Responda só com o JSON.');
  if (r.dados && Array.isArray(r.dados.mensagens)) {
    r.dados.mensagens = r.dados.mensagens.slice(-6).map((m) => ({ ...m, texto: String(m.texto || '').slice(0, 6000) }));
    emailsLidos.set(id, { quando: Date.now(), dados: r.dados });
  }
  return r;
}

// ---------- criar skill pelo "+" da órbita ----------
function criarSkill({ nome, descricao, icone, conexoes }) {
  const rotulo = String(nome || '').trim().slice(0, 30);
  if (!rotulo) throw new Error('Dê um nome para a skill.');
  const nomePasta = slug(rotulo);
  const dir = path.join(CEREBRO, '.claude', 'skills', nomePasta);
  if (fs.existsSync(dir)) throw new Error('Já existe uma skill com esse nome.');
  const desc = String(descricao || '').trim().replace(/\s+/g, ' ').slice(0, 400) || `Skill ${rotulo}.`;
  const conns = (Array.isArray(conexoes) ? conexoes : []).map((c) => String(c).trim()).filter(Boolean).slice(0, 7);
  const meta = { rotulo, icone: /^i-[a-z]+$/.test(icone) ? icone : 'i-spark', conexoes: conns };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'),
    `---\nname: ${nomePasta}\ndescription: ${desc.replace(/\n/g, ' ')} Use quando o Guilherme pedir algo ligado a ${rotulo}.\n---\n` +
    `<!-- galilei: ${JSON.stringify(meta)} -->\n\n# ${rotulo}\n\n${desc}\n` +
    (conns.length ? `\nConexões: ${conns.join(', ')}.\n` : ''));
  return nomePasta;
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.woff2': 'font/woff2' };
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const corpo = (req) => new Promise((ok, falha) => {
  let d = '';
  req.setEncoding('utf8');
  req.on('data', (c) => { d += c; if (d.length > 1e6) req.destroy(); });
  req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { falha(e); } });
});

// Trava contra sites de fora. O servidor só atende quem fala com ele pelo próprio endereço (bloqueia "DNS rebinding")
// e só aceita ações (POST) vindas da página dele: com o cabeçalho X-Galilei, que um site de outro endereço não
// consegue mandar sem a permissão do servidor (que nunca é dada), e com Origin, quando houver, igual ao da página.
const permitido = criarTrava(PORT);

const server = http.createServer(async (req, res) => {
  const barrado = permitido(req);
  if (barrado) {
    console.warn(`[seguranca] pedido recusado (${barrado}): ${req.method} ${req.url} host=${req.headers.host} origin=${req.headers.origin || '-'}`);
    return json(res, 403, { erro: 'Pedido recusado.' });
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/eventos') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`event: status\ndata: ${JSON.stringify({ status })}\n\n`);
      clientes.add(res);
      if (limite) res.write(`event: limite\ndata: ${JSON.stringify(limite)}\n\n`);
      // a página abriu depois de um tempo fechada: atualiza os cards se estiverem velhos
      if (painelVelho() && !pCarregando && !limite) atualizarPainel();
      req.on('close', () => clientes.delete(res));
      return;
    }
    if (url.pathname === '/api/estado') {
      let historico = '';
      try { if (estado.conversa) historico = fs.readFileSync(path.join(CEREBRO, estado.conversa), 'utf8'); } catch { /* nova */ }
      return json(res, 200, { status, notas: listarNotas(), skills: listarSkills(), historico,
        painel: { ...painel, carregando: pCarregando }, limite });
    }
    if (url.pathname === '/api/email') {
      const id = String(url.searchParams.get('id') || '');
      if (!/^[A-Za-z0-9_-]{6,40}$/.test(id)) return json(res, 400, { erro: 'E-mail inválido.' });
      const r = await lerEmail(id);
      return json(res, r.dados ? 200 : 502, r.dados || { erro: r.erro });
    }
    if (url.pathname === '/api/painel/atualizar' && req.method === 'POST') {
      atualizarPainel();
      return json(res, 202, { ok: true });
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
  console.log(`Galilei no ar: http://localhost:${PORT}`);
  console.log(`Cérebro: ${CEREBRO}${estado.sessionId ? ` (retomando a sessão ${estado.sessionId})` : ''}`);
  // sobe o cérebro e o painel já: os conectores (Gmail, agenda) conectam enquanto a página abre
  ligarCerebro();
  if (painelVelho()) atualizarPainel(); else sPainel.aquecer();
  sLeitor.aquecer();
});
const sair = () => { if (proc) { proc.desligado = true; proc.kill(); } sPainel.parar(); sLeitor.parar(); process.exit(0); };
process.on('SIGINT', sair);
process.on('SIGTERM', sair);
// um erro inesperado vira log, não derruba o servidor (o cérebro e os cards seguem de pé)
process.on('uncaughtException', (e) => console.error('[erro inesperado]', e));
process.on('unhandledRejection', (e) => console.error('[erro inesperado]', e));
