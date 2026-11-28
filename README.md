# Galilei

Seu agente pessoal: o dashboard da `v1.16` (mão, cápsula, skills em órbita, chão de estrelas) com o
**Claude Code como cérebro**, rodando isolado na pasta `cerebro/` e usando o seu plano Claude.

A especificação completa e as decisões estão em [ESPECIFICACAO.md](ESPECIFICACAO.md).

## Rodar

Precisa de Node 24+ e do Claude Code instalado e logado (`claude` no terminal).

Dê dois cliques em `iniciar.cmd`, ou rode:

```powershell
npm start
```

Depois abra http://localhost:3737. Para parar, use Ctrl+C no terminal do servidor. Não precisa de `npm install`:
o projeto não tem dependências, e a página (Three.js e a fonte, em `app/vendor/`) abre mesmo sem internet. Só o
cérebro, o Gmail e a agenda precisam de conexão.

Testes (funções do chat, do histórico, da agenda, da trava de segurança e do limite do plano):

```powershell
npm test
```

## Como usar

- **Chat**: fale com o Galilei. A resposta chega aos pedaços e as estrelas brilham enquanto ele fala.
- **Estrelas** (no chão, abaixo da cápsula): cada uma é um arquivo `.md` do `cerebro/`. Passe o mouse para ver o
  título e clique para abrir a nota. As cores mostram o tipo: azul-bebê para notas, branco para conversas, violeta
  para resumos, azul neon para skills e um branco maior para a "mente" (`CLAUDE.md`). As notas que ele lê ou escreve
  numa resposta dão um clarão; uma nota nova nasce como uma estrela nova.
- **Skills** (as bolinhas em órbita): clique para ver o que a skill faz. Use o **+ nova skill** para ensinar uma
  skill nova; ela vira `cerebro/.claude/skills/<nome>/SKILL.md`.
- **Menu ⋮ do chat → Nova conversa**: o Galilei salva um resumo da conversa atual e começa outra do zero.
- **E-mail** (card da direita): os 15 e-mails mais recentes da aba **Principal** do Gmail (sem Promoções, Social,
  Atualizações e Fóruns), numa lista com rolagem, e quantos estão não lidos (até "25+"). Clique num e-mail para
  **lê-lo inteiro** ali mesmo (leva uns 15 s na primeira vez; reabrir é instantâneo), com botões para **Abrir no
  Gmail**, **Resumir** e **Responder** (o Galilei escreve um rascunho).
- **Calendário**: os próximos 2 eventos, com contagem regressiva; clicar pede ao Galilei os detalhes.
- Os dois vêm do Gmail e do Google Calendar ligados à sua conta Claude e atualizam ao abrir o servidor, a cada
  30 min, no botão ↻ e quando o Galilei cria um evento ou rascunho.

## Pastas

```
app/        a página: app.js (tela), util.js (Markdown, histórico, datas), scene3d.js (3D), vendor/ (Three.js, fonte)
server/     server.mjs (serve a página e conversa com o `claude`), util.mjs (segurança, skills, limite), persona.md
cerebro/    a mente do Galilei: CLAUDE.md, notas/, conversas/, .claude/skills/
test/       testes (npm test)
v1.16/      o design original, guardado como referência (vídeos e prints de análise ficam só no disco)
```

Você pode editar as notas e o `cerebro/CLAUDE.md` à mão (é onde fica a personalidade dele). A página se
atualiza sozinha.

## O que o Galilei pode e não pode fazer

- Ler, escrever e editar arquivos **só** dentro de `cerebro/`, e pesquisar e ler páginas na web.
- **E-mail**: lê, busca, resume e escreve **rascunhos** no seu Gmail. Não envia, não apaga, não mexe em rótulos.
- **Agenda**: lê e cria ou edita eventos seus, sempre **confirmando com você no chat antes**. Não convida
  ninguém, não apaga eventos e não responde convites.
- Não tem terminal e não enxerga o resto do seu disco nem os outros conectores da conta (Drive, Docs...).
- Não consegue criar skills sozinho: ele propõe o texto e você cria pelo **+ nova skill**.
- Cada mensagem gasta do seu plano Claude, como no Claude Code. Os cards usam o modelo Haiku, que gasta pouco,
  e só se atualizam sozinhos com a página aberta. Se o plano bater o limite, aparece um aviso no chat com a hora
  em que ele volta; o chat e os cards param até lá.
- Logo depois de o servidor subir (ou de o cérebro reiniciar), a primeira mensagem espera uns segundos o Gmail e a
  agenda conectarem ("conectando ao Gmail e à agenda…"). Se o cérebro cair, ele religa sozinho.
- Objetivos ainda não estão ligados.

## Segurança

- O servidor só escuta no seu computador (`127.0.0.1`) e só aceita ações vindas da própria página do Galilei:
  outros sites abertos no navegador não conseguem mandar mensagens para ele nem ler seus dados.
- Ele trata e-mails e páginas da web como informação, nunca como ordem: se um e-mail pedir alguma coisa, ele te
  conta e pergunta, em vez de fazer.

## Acessibilidade

Estrelas, e-mails e eventos são alcançáveis pelo **Tab** e abrem com **Enter** ou **Espaço** (com contorno neon no
foco); a conversa é anunciada por leitores de tela quando cada resposta termina.
