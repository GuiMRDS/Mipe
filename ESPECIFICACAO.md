# Galilei — especificação e plano de implantação

Agente pessoal com o **Claude Code como cérebro**. A interface é o dashboard da `v1.16`: a mão, a cápsula, a
órbita de skills e o chão holográfico. Decisões tomadas na sessão de 22/11/2026 (rodada de perguntas `/grill-me`).

## 1. Visão

- A página é o "corpo" do Galilei; o Claude Code, rodando numa sessão isolada, é o "cérebro".
- O conhecimento do Galilei é uma pasta de notas Markdown (`cerebro/`). **Cada nota é uma estrela** no chão
  holográfico, abaixo da cápsula.
- **As bolinhas da órbita da cápsula são as skills** dele: skills reais do Claude Code.
- **Quando o Galilei fala, as estrelas brilham.**
- E-mail e Calendário ligados aos conectores Gmail e Google Calendar da conta Claude (seção 8). Objetivos fica para depois.

## 2. Decisões

| # | Tema | Decisão |
|---|------|---------|
| Q1 | Cérebro | Servidor Node local que roda o CLI `claude` já logado (`claude -p`, entrada e saída `stream-json`), com a pasta `cerebro/` como diretório de trabalho. A conversa continua com `--resume <session-id>`. Consome o plano Claude do usuário, como no Claude Code normal. Sem chave de API. |
| Q2 | Pastas | `v1.16/` fica intacta (referência); `app/` = frontend; `server/` = ponte; `cerebro/` = pasta isolada do agente. |
| Q3 | Estrelas | Cada `.md` do `cerebro/` é uma estrela no anel externo do chão (o pontilhado abaixo da cápsula). Nota nova → nasce uma estrela; nota apagada → a estrela some. O campo de estrelas do fundo continua decorativo. |
| Q4 | Skills | A órbita lê as skills reais de `cerebro/.claude/skills/<nome>/SKILL.md`. O "+ nova skill" escreve o `SKILL.md` (pelo servidor). As 5 skills de mentira (Casa, Música…) saem; começa só com **Pesquisa**. |
| Q5 | Histórico | O servidor grava cada conversa, palavra por palavra, em `cerebro/conversas/AAAA-MM-DD-HHMM.md`. Ao iniciar uma nova conversa, o Galilei escreve um resumo curto em `cerebro/conversas/AAAA-MM-DD-HHMM-resumo.md`. Os dois viram estrelas. |
| Q6 | Permissões | Read, Write, Edit, Glob, Grep, WebSearch, WebFetch e Skill, todas pré-aprovadas. Sem Bash/terminal. Arquivos confinados ao `cerebro/` (`--restricted`). Conectores: só Gmail (ler + rascunhos) e Google Calendar (ler + criar/editar com confirmação), ver seção 8. |
| Q7 | Brilho | Enquanto a resposta chega, todas as estrelas pulsam no ritmo do texto (e o chão 3D acende junto). As estrelas das notas que ele **leu ou escreveu** naquela resposta dão um clarão mais forte. |
| Q8 | O que era falso | Saem as respostas roteirizadas do chat e a "iniciativa própria" com falas prontas. Tudo o que o Galilei diz vem do Claude. (E-mail e Calendário ganharam dados reais depois: seção 8.) |

## 3. Arquitetura

```
 navegador (app/)  ──HTTP──►  server/server.mjs  ──stdin/stdout stream-json──►  claude -p  (cwd = cerebro/)
      ▲                              │                                               │
      └──────────── SSE (eventos) ◄──┘◄────────── fs.watch(cerebro/) ◄── lê/escreve notas
```

- **Sem dependências e sem build**: Node 24 puro (`http`, `child_process`, `fs`). O frontend continua estático
  (Three.js pelo CDN).
- Um único processo `claude` fica vivo e recebe as mensagens pelo stdin (uma por linha). Se ele cair, o servidor o
  sobe de novo com `--resume` na próxima mensagem.
- O `session_id` atual fica em `server/estado.json`. "Nova conversa" pede o resumo, encerra o processo e começa outra
  sessão.

### Comando do cérebro

```
claude -p --input-format stream-json --output-format stream-json --verbose --include-partial-messages
       --restricted
       --tools Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Skill
       --allowedTools Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Skill
       --permission-mode dontAsk --permission-prompts none
       [--resume <session-id>]
```

Testado em 22/11: autentica pelo plano (eventos `rate_limit_event` com as janelas de 5 h e 7 dias), leitura fora
da pasta é negada ("path outside the working directory"). Limite conhecido: `--restricted` não deixa o **próprio
agente** escrever em `.claude/skills/` (arquivo de configuração de ferramenta). Skills novas são criadas pelo
formulário da página (o servidor escreve o arquivo) ou o Galilei propõe o texto e você cria pela órbita.

### API do servidor (porta 3737)

| Rota | O que faz |
|------|-----------|
| `GET /` e `/assets/*` | Serve o `app/`. |
| `GET /api/estado` | Notas (caminho, título, tipo, tamanho, data), skills e status do cérebro. |
| `GET /api/eventos` | SSE: `texto` (pedaço da resposta), `ferramenta` (nota lida/escrita), `fim`, `erro`, `notas` (a pasta mudou), `skills`, `status`. |
| `POST /api/mensagem` | `{ texto }` → manda para o cérebro. |
| `POST /api/nova-conversa` | Pede o resumo da conversa atual e começa uma sessão nova. |
| `POST /api/skills` | `{ nome, descricao, icone, conexoes }` → cria `cerebro/.claude/skills/<slug>/SKILL.md`. |
| `GET /api/nota?caminho=` | Conteúdo de uma nota (só dentro do `cerebro/`). |

## 4. Pasta do cérebro

```
cerebro/
  CLAUDE.md                 personalidade, regras e como organizar a memória
  .claude/skills/<nome>/SKILL.md
  notas/                    notas importantes (fatos sobre o usuário, decisões, referências)
  conversas/                transcrições + resumos
```

Regras do `CLAUDE.md`: responder em português, curto e direto (é um chat); guardar em `notas/` o que valer a pena
lembrar (uma nota por assunto, com título `# ...`); consultar as notas antes de responder sobre o usuário; nunca
editar as transcrições.

## 5. Frontend (mudanças sobre a v1.16)

- **Chat**: manda para `/api/mensagem` e mostra a resposta chegando aos pedaços (com Markdown simples). Ao abrir,
  recarrega a conversa atual da transcrição; vazia, mostra um aviso do sistema (sem gastar uma resposta do Claude).
  Menu "⋮" → "Nova conversa".
- **Estrelas-notas**: uma camada SVG no palco, sobre o arco visível do anel externo do chão (centro 767, 958;
  rx 770, ry 196). Cada nota tem um lugar fixo pela ordem de criação: começa rente à cápsula (o vão debaixo dela fica
  livre), alterna esquerda/direita e abre para as pontas. A cada 44 notas passa para o anel seguinte (rx 702 e depois
  rx 836). Cor por tipo:
  nota = azul bebê, conversa = branco, resumo = violeta, skill = neon. Hover mostra o título; clique abre a nota no
  card da esquerda.
- **Fala**: cada pedaço de texto dá um impulso no brilho (variável CSS `--fala`) e `scene.talk()`; o anel pontilhado
  3D também reage (`uTalk`). Notas tocadas por ferramenta ganham a classe `flare`.
- **Skills**: a órbita vem de `/api/estado`. O card de detalhe mostra a descrição real do `SKILL.md`; "Executar
  agora" manda "Use a skill X" ao cérebro. O "+" cria pelo servidor. Skills sem dedo recebem energia direto da
  cápsula (como na v1.14); as 5 primeiras ocupam os dedos.
- **Saem**: `answer()` por palavra-chave, `PROATIVO`, falas prontas dos cliques no núcleo/dedos/e-mails/eventos.
  O clique no núcleo passa a só focar o chat.
- **Status**: o "ONLINE" do chat reflete o cérebro (online / pensando / offline).

## 6. Plano de implantação

1. Especificação (este arquivo).
2. `cerebro/` com `CLAUDE.md`, pastas e a skill Pesquisa.
3. `server/server.mjs`: estático, SSE, processo do `claude`, transcrição, watcher, skills.
4. `app/`: copiar da v1.16 e ligar chat, estrelas, skills e status.
5. Teste ponta a ponta no navegador: mandar mensagem, ver a resposta em stream, estrelas brilhando, nota criada
   virando estrela, skill criada entrando na órbita, nova conversa gerando resumo.
6. `README.md` com como rodar (`node server/server.mjs` ou `iniciar.cmd`, e abrir http://localhost:3737).

## 7. Depois (fora desta versão)

Objetivos, voz, o agente criar skills sozinho (precisa de um
aprovador de permissão), iniciativa própria real (agendada).

## 8. E-mail e Calendário (27/11/2026)

Decisões: usar os **conectores do Claude** (Gmail e Google Calendar já ligados à conta), sem projeto no Google Cloud.

| Onde | O que pode |
|------|-----------|
| Chat (cérebro) | Gmail: `search_threads`, `get_thread`, `get_message`, `list_labels`, `list_drafts`, `get_draft`, `create_draft`, `update_draft`. Calendar: `list_calendars`, `list_events`, `get_event`, `search_events`, `suggest_time`, `create_event`, `update_event`. Enviar, responder, encaminhar, apagar, spam, rótulos, anexos, apagar evento e responder convite ficam em `--disallowedTools`, junto com os outros conectores da conta. |
| Regras (CLAUDE.md) | Rascunho em vez de envio; confirmar no chat antes de criar/editar evento; não convidar ninguém; fuso America/Sao_Paulo. |
| Cards (painel) | Sessão separada do Claude com **Haiku**, só leitura (`search_threads`, `get_thread`, `list_calendars`, `list_events`), resposta em JSON (`--json-schema`). Fica viva entre as consultas (os conectores levam ~15 s para conectar) e é renovada a cada 6 usos. Atualiza ao subir o servidor, a cada 30 min, no ↻ e depois de o cérebro criar evento ou rascunho. Cache em `server/painel.json` (fora do git). |

- O cérebro sobe junto com o servidor (e logo após "Nova conversa"), para os conectores já estarem prontos na
  primeira mensagem. A sessão é refeita quando a persona, o `CLAUDE.md` ou a lista de ferramentas mudam.
- Não lidas: a busca pega até 25; se vier cheia, o card mostra "25+".
- Rotas novas: `POST /api/painel/atualizar`; `GET /api/estado` traz `painel`; SSE `painel`.

### 8.1 Todos os e-mails relevantes e leitura no app (28/11/2026)

- **Relevantes = aba Principal**: a busca é `in:inbox -category:promotions -category:social -category:updates
  -category:forums` (o `category:primary` volta vazio pela API do Gmail). Até 15 conversas, com rolagem no card;
  não lidas contadas na mesma busca com `is:unread`.
- **Ler aqui e no Gmail**: clicar abre o e-mail inteiro no card da esquerda. `GET /api/email?id=<threadId>` usa uma
  segunda sessão Haiku só de leitura (`get_thread`, `get_message`) que devolve assunto e até 6 mensagens em texto
  simples (até 6000 caracteres cada). Cache de 10 min por e-mail. Botões: Abrir no Gmail
  (`mail.google.com/mail/u/0/#all/<threadId>`), Resumir e Responder (pede um rascunho ao Galilei).
- Painel e leitor usam a mesma função `sessaoHaiku()` (fila, espera de 15 s pelos conectores, renovação a cada 6 usos).
