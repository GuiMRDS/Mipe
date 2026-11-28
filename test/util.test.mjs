// Testes das funções puras da página (app/assets/util.js). Rodar: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { md, lerHistorico, FIM_FALA, quando, duracao, diaRel, infoAgenda, eventosFuturos, textoEmail, gmailLink } from '../app/assets/util.js';

test('md: negrito, lista, linha divisória e parágrafos', () => {
  const h = md('Oi **Guilherme**\n\n- um\n- dois\n\n---\n\nfim');
  assert.match(h, /<b>Guilherme<\/b>/);
  assert.match(h, /<ul><li>um<\/li><li>dois<\/li><\/ul>/);
  assert.match(h, /<hr>/);
  assert.match(h, /<span class="ln">fim<\/span>/);
});

test('md: não deixa passar HTML nem links que não sejam http(s)', () => {
  const h = md('<script>alert(1)</script> [clique](javascript:alert(1)) <img src=x onerror=alert(1)>');
  assert.doesNotMatch(h, /<script|<img|href="javascript/);
  assert.match(h, /&lt;script&gt;/);
});

test('md: links http viram <a> que abre em outra aba', () => {
  assert.match(md('veja https://exemplo.com/a'), /<a href="https:\/\/exemplo.com\/a" target="_blank" rel="noopener">/);
});

test('lerHistorico: um "---" dentro da resposta não corta a fala (marcador novo)', () => {
  const txt = '# Conversa\n\n**Você** (14:06):\n\nOi\n\n' + FIM_FALA + '\n\n' +
    '**Galilei** (14:07):\n\nParte 1\n\n---\n\nParte 2\n\n' + FIM_FALA + '\n\n';
  const f = lerHistorico(txt);
  assert.equal(f.length, 2);
  assert.deepEqual(f[0], { quem: 'voce', hora: '14:06', texto: 'Oi' });
  assert.equal(f[1].quem, 'galilei');
  assert.match(f[1].texto, /Parte 1\n\n---\n\nParte 2/);
});

test('lerHistorico: arquivos antigos separados por "---" e falas do "Jarvis" ainda abrem', () => {
  const txt = '# Conversa\n\n**Você** (16:13):\n\nOlá\n\n---\n\n**Jarvis** (16:13):\n\nOlá! Tudo bem?\n\n---\n\n';
  const f = lerHistorico(txt);
  assert.equal(f.length, 2);
  assert.equal(f[1].quem, 'galilei');
  assert.equal(f[1].texto, 'Olá! Tudo bem?');
});

test('lerHistorico: vazio ou sem falas devolve lista vazia', () => {
  assert.deepEqual(lerHistorico(''), []);
  assert.deepEqual(lerHistorico(null), []);
  assert.deepEqual(lerHistorico('# Conversa — 28/11\n\n'), []);
});

test('quando: data de dia inteiro é meia-noite local (não UTC); lixo vira null', () => {
  const d = quando('2026-11-27');
  assert.equal(d.getFullYear(), 2026); assert.equal(d.getMonth(), 10); assert.equal(d.getDate(), 27); assert.equal(d.getHours(), 0);
  assert.equal(quando('ontem'), null);
  assert.equal(quando(''), null);
});

test('duracao', () => {
  const a = new Date(2026, 10, 28, 15, 0);
  assert.equal(duracao(a, new Date(2026, 10, 28, 15, 45)), '45 min');
  assert.equal(duracao(a, new Date(2026, 10, 28, 16, 0)), '1h');
  assert.equal(duracao(a, new Date(2026, 10, 28, 16, 30)), '1h30');
  assert.equal(duracao(a, a), '');
  assert.equal(duracao(null, a), '');
});

test('diaRel: hoje, amanhã e ontem relativos a "agora"', () => {
  const agora = new Date(2026, 10, 28, 10, 0);
  assert.equal(diaRel(new Date(2026, 10, 28, 20, 0), agora), 'hoje');
  assert.equal(diaRel(new Date(2026, 10, 29, 8, 0), agora), 'amanhã');
  assert.equal(diaRel(new Date(2026, 10, 27, 8, 0), agora), 'ontem');
});

test('agenda: evento acontecendo, próximo em minutos e agenda livre', () => {
  const agora = new Date(2026, 10, 28, 14, 40);
  const ev = (titulo, h1, m1, h2, m2) => ({ titulo, inicio: new Date(2026, 10, 28, h1, m1).toISOString(), fim: new Date(2026, 10, 28, h2, m2).toISOString() });
  assert.deepEqual(infoAgenda([ev('Reunião', 14, 30, 15, 30)], agora), { txt: 'agora: Reunião', quente: true });
  assert.deepEqual(infoAgenda([ev('Academia', 15, 0, 16, 0)], agora), { txt: 'Academia em 20 min', quente: true });
  assert.deepEqual(infoAgenda([ev('Jantar', 19, 0, 21, 0)], agora), { txt: 'Jantar em 4h 20m', quente: false });
  assert.deepEqual(infoAgenda([], agora), { txt: 'agenda livre hoje', quente: false });
  // o que já acabou some; os outros vêm em ordem de início
  const lista = eventosFuturos([ev('B', 18, 0, 19, 0), ev('Passou', 9, 0, 10, 0), ev('A', 16, 0, 17, 0)], agora);
  assert.deepEqual(lista.map((e) => e.titulo), ['A', 'B']);
});

test('textoEmail: link enorme mostra só o domínio e o texto é escapado', () => {
  const h = textoEmail('Clique: https://u123.ct.sendgrid.net/ls/click?upn=abc&x=1 <b>oi</b>');
  assert.match(h, />u123\.ct\.sendgrid\.net ↗<\/a>/);
  assert.match(h, /&lt;b&gt;oi&lt;\/b&gt;/);
});

test('gmailLink: abre na conta certa quando ela é conhecida', () => {
  assert.equal(gmailLink('1a2b3c'), 'https://mail.google.com/mail/u/0/#all/1a2b3c');
  assert.equal(gmailLink('1a2b3c', 'eu@gmail.com'), 'https://mail.google.com/mail/?authuser=eu%40gmail.com#all/1a2b3c');
});
