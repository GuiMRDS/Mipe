// Testes das funções puras do servidor (server/util.mjs). Rodar: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTrava, skillMeta, slug, extrairJSON, lerLimite } from '../server/util.mjs';

const permitido = criarTrava(3737);
const pedido = (method, headers) => ({ method, headers: { host: 'localhost:3737', ...headers } });

test('trava: a própria página passa', () => {
  assert.equal(permitido(pedido('GET', {})), null);
  assert.equal(permitido({ method: 'GET', headers: { host: '127.0.0.1:3737' } }), null);
  assert.equal(permitido(pedido('POST', { 'x-galilei': '1', origin: 'http://localhost:3737' })), null);
  assert.equal(permitido(pedido('POST', { 'x-galilei': '1' })), null);       // sem Origin (ex.: curl) mas com o cabeçalho
});

test('trava: ataques de outros sites são recusados', () => {
  // formulário escondido em outro site (sem o cabeçalho)
  assert.equal(permitido(pedido('POST', { origin: 'https://malicioso.example' })), 'origem');
  assert.equal(permitido(pedido('POST', {})), 'cabeçalho');
  // fetch de outro site tentando mandar o cabeçalho
  assert.equal(permitido(pedido('POST', { 'x-galilei': '1', origin: 'https://malicioso.example' })), 'origem');
  // DNS rebinding: o navegador acha que está em outro domínio
  assert.equal(permitido({ method: 'GET', headers: { host: 'malicioso.example:3737' } }), 'endereço');
  assert.equal(permitido({ method: 'GET', headers: {} }), 'endereço');
  // outra porta no mesmo computador
  assert.equal(permitido({ method: 'GET', headers: { host: 'localhost:8080' } }), 'endereço');
  assert.equal(permitido(pedido('PUT', { 'x-galilei': '1' })), 'método');
});

test('skillMeta: lê frontmatter e metadados do Galilei', () => {
  const txt = '---\nname: pesquisa\ndescription: Pesquisa na web.\n---\n' +
    '<!-- galilei: {"rotulo": "Pesquisa", "icone": "i-search", "conexoes": ["Web", "Notas"]} -->\n\n# Pesquisa\n';
  assert.deepEqual(skillMeta(txt), { nome: 'pesquisa', descricao: 'Pesquisa na web.', rotulo: 'Pesquisa', icone: 'i-search', conexoes: ['Web', 'Notas'] });
});

test('skillMeta: sem metadados usa valores padrão; JSON quebrado não derruba', () => {
  assert.deepEqual(skillMeta('---\nname: x\ndescription: y\n---\n<!-- galilei: {quebrado -->'),
    { nome: 'x', descricao: 'y', rotulo: 'x', icone: 'i-spark', conexoes: [] });
});

test('slug: nome da pasta da skill', () => {
  assert.equal(slug('Viagens à Praia!'), 'viagens-a-praia');
  assert.equal(slug('  Finanças  '), 'financas');
  assert.equal(slug('???'), 'skill');
});

test('extrairJSON: saída estruturada, JSON no texto ou nada', () => {
  assert.deepEqual(extrairJSON({ structured_output: { a: 1 } }), { a: 1 });
  assert.deepEqual(extrairJSON({ result: 'Aqui: {"b": 2} pronto' }), { b: 2 });
  assert.equal(extrairJSON({ result: 'sem json' }), null);
  assert.equal(extrairJSON({}), null);
});

test('lerLimite: percebe o limite do plano e quando ele libera', () => {
  const ate = 1795389600;
  assert.deepEqual(lerLimite({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', rateLimitType: 'seven_day', resetsAt: ate } }),
    { ate: ate * 1000, texto: 'Limite do plano atingido (semanal).' });
  assert.equal(lerLimite({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed' } }), false);
  assert.equal(lerLimite({ type: 'result', is_error: true, result: "You've hit your weekly limit · resets 3am (America/Sao_Paulo)" }).ate, null);
  assert.equal(lerLimite({ type: 'result', is_error: true, result: 'Outro erro qualquer' }), null);
  assert.equal(lerLimite({ type: 'assistant' }), null);
});
