// Galilei — funções puras do servidor (sem rede nem processos): trava de segurança, leitura das skills, nome de
// pasta da skill, JSON das consultas e detecção do limite do plano. Testadas em test/server-util.test.mjs.

// ---------- trava contra sites de fora ----------
// Só atende quem fala pelo próprio endereço (bloqueia "DNS rebinding"); toda ação (POST) precisa do cabeçalho
// X-Galilei (um site de outro endereço não consegue mandá-lo sem a permissão do servidor, que nunca é dada) e,
// se vier Origin, ela tem de ser a da página. Devolve null (pode passar) ou o motivo da recusa.
export function criarTrava(porta) {
  const enderecos = new Set([`localhost:${porta}`, `127.0.0.1:${porta}`, `[::1]:${porta}`]);
  return function permitido({ method, headers = {} }) {
    if (!enderecos.has(String(headers.host || '').toLowerCase())) return 'endereço';
    if (method === 'GET' || method === 'HEAD') return null;
    if (method !== 'POST') return 'método';
    const origem = headers.origin;
    if (origem && !enderecos.has(origem.replace(/^https?:\/\//, '').toLowerCase())) return 'origem';
    if (headers['x-galilei'] !== '1') return 'cabeçalho';
    return null;
  };
}

// ---------- skills (cerebro/.claude/skills/<nome>/SKILL.md) ----------
export function skillMeta(txt) {
  const fm = (txt.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
  const campo = (k) => ((fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1] || '').trim();
  let extra = {};
  try { extra = JSON.parse((txt.match(/<!--\s*galilei:\s*(\{[\s\S]*?\})\s*-->/) || [])[1] || '{}'); } catch { /* sem metadados */ }
  const nome = campo('name');
  return { nome, descricao: campo('description'), rotulo: extra.rotulo || nome, icone: extra.icone || 'i-spark',
    conexoes: Array.isArray(extra.conexoes) ? extra.conexoes : [] };
}
// "Viagens à Praia!" → "viagens-a-praia"
export const slug = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'skill';

// ---------- resposta das consultas em JSON (--json-schema) ----------
export function extrairJSON(ev) {
  if (ev.structured_output) return ev.structured_output;
  if (typeof ev.result !== 'string') return null;
  try { return JSON.parse((ev.result.match(/\{[\s\S]*\}/) || [])[0]); } catch { return null; }
}

// ---------- limite do plano Claude ----------
export const LIMITE_RE = /hit your .*limit|usage limit|limit (?:reached|exceeded)|out of (?:extra )?usage|weekly limit/i;
// Lê um evento do `claude` e diz se o limite acabou ({ ate, texto }), se está liberado (false) ou se não diz nada (null).
export function lerLimite(ev) {
  if (ev.type === 'rate_limit_event') {
    const info = ev.rate_limit_info || {};
    if (!info.status) return null;
    if (info.status === 'allowed' || info.status === 'allowed_warning') return false;
    const tipo = info.rateLimitType === 'five_hour' ? 'janela de 5 horas' : info.rateLimitType === 'seven_day' ? 'semanal' : 'uso';
    return { ate: info.resetsAt ? info.resetsAt * 1000 : null, texto: `Limite do plano atingido (${tipo}).` };
  }
  if (ev.type === 'result' && ev.is_error && LIMITE_RE.test(String(ev.result || ''))) return { ate: null, texto: String(ev.result).slice(0, 200) };
  return null;
}
