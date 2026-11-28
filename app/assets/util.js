// Galilei — funções puras da página (sem DOM): Markdown do chat, leitura da transcrição, datas da agenda e
// links do e-mail. Ficam separadas para dar para testar sem navegador (test/util.test.mjs).

export const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Markdown leve (o que o Galilei usa no chat): negrito, itálico, código, links, listas e parágrafos ----------
export function inline(t) {
  return t
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<i>$2</i>')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)"]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)"]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
}
export function md(src) {
  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  esc(src).split('\n').forEach((raw) => {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); return; }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); return; }
    closeList();
    if (!line.trim()) { out.push('<br>'); return; }
    if (/^-{3,}$/.test(line.trim())) { out.push('<hr>'); return; }
    if ((m = line.match(/^#{1,6}\s+(.*)$/))) { out.push(`<strong class="h">${inline(m[1])}</strong>`); return; }
    out.push(`<span class="ln">${inline(line)}</span>`);
  });
  closeList();
  return out.join('').replace(/(<br>)+$/, '').replace(/^(<br>)+/, '').replace(/(<br>){2,}/g, '<br>');
}

// ---------- transcrição (cerebro/conversas/*.md) → falas ----------
// Cada fala termina com <!-- galilei:fim -->; arquivos antigos separavam com "---" (que quebrava se a resposta tivesse "---").
export const FIM_FALA = '<!-- galilei:fim -->';
export function lerHistorico(txt) {
  const t = txt || '';
  const blocos = t.includes(FIM_FALA) ? t.split(/\n<!-- galilei:fim -->\n/) : t.split(/\n---\n/);
  const falas = [];
  for (const bloco of blocos) {
    const m = bloco.match(/\*\*(Você|Galilei|Jarvis)\*\* \((\d\d:\d\d)\):\s*\n\n([\s\S]*)$/);
    if (m) falas.push({ quem: m[1] === 'Você' ? 'voce' : 'galilei', hora: m[2], texto: m[3].trim() });
  }
  return falas;
}

// ---------- datas ----------
export const cap = (t) => t.replace('.', '').replace(/^\w/, (c) => c.toUpperCase());
export const mesmoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
// "2026-11-27" (dia inteiro) é meia-noite local, não UTC
export function quando(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d\d)-(\d\d)$/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return isNaN(d) ? null : d;
}
export const hm = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export function diaRel(d, agora = new Date()) {
  const dia = (n) => { const x = new Date(agora); x.setDate(x.getDate() + n); return x; };
  if (mesmoDia(d, agora)) return 'hoje';
  if (mesmoDia(d, dia(1))) return 'amanhã';
  if (mesmoDia(d, dia(-1))) return 'ontem';
  return cap(d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }));
}
export function duracao(a, b) {
  if (!a || !b) return '';
  const min = Math.round((b - a) / 60000);
  if (min <= 0) return '';
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}`;
}

// ---------- agenda: eventos que ainda não acabaram e o texto do cabeçalho do card ----------
export function eventosFuturos(eventos, agora = new Date()) {
  return (eventos || []).map((e) => {
    const ini = quando(e.inicio);
    let fim = quando(e.fim);
    if (ini && !fim) fim = new Date(ini.getTime() + (e.diaInteiro ? 864e5 : 36e5));
    return { ...e, ini, fimD: fim };
  }).filter((e) => e.ini && e.fimD > agora).sort((a, b) => a.ini - b.ini);
}
export function infoAgenda(eventos, agora = new Date()) {
  const hoje = eventosFuturos(eventos, agora).filter((e) => mesmoDia(e.ini, agora) || (e.ini <= agora && e.fimD > agora));
  const atual = hoje.find((e) => !e.diaInteiro && e.ini <= agora);
  if (atual) return { txt: `agora: ${atual.titulo}`, quente: true };
  const prox = hoje.find((e) => !e.diaInteiro && e.ini > agora);
  if (prox) {
    const min = Math.round((prox.ini - agora) / 60000);
    return { txt: `${prox.titulo} em ${min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : `${min} min`}`, quente: min <= 30 };
  }
  return { txt: hoje.length ? `${hoje.length} evento${hoje.length > 1 ? 's' : ''} hoje` : 'agenda livre hoje', quente: false };
}

// ---------- e-mail ----------
// links de e-mail costumam ser rastreadores enormes: mostra só o domínio (o link completo fica por trás)
export function textoEmail(t) {
  return esc(t).replace(/(https?:\/\/[^\s<"()]+)/g, (url) => {
    let dom = url;
    try { dom = new URL(url.replace(/&amp;/g, '&')).hostname.replace(/^www\./, ''); } catch { /* fica a URL */ }
    return `<a href="${url}" target="_blank" rel="noopener" title="${url}">${dom} ↗</a>`;
  });
}
// abre a conversa na conta certa do Gmail (com várias contas logadas, "u/0" pode ser a errada)
export function gmailLink(id, conta) {
  const alvo = `#all/${encodeURIComponent(id)}`;
  return conta ? `https://mail.google.com/mail/?authuser=${encodeURIComponent(conta)}${alvo}` : `https://mail.google.com/mail/u/0/${alvo}`;
}
