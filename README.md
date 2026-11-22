# Jarvis

Seu agente pessoal: o dashboard da `v1.16` (mão, cápsula, skills em órbita, chão de estrelas) com o
**Claude Code como cérebro**, rodando isolado na pasta `cerebro/` e usando o seu plano Claude.

A especificação completa e as decisões estão em [ESPECIFICACAO.md](ESPECIFICACAO.md).

## Rodar

Precisa de Node 24+ e do Claude Code instalado e logado (`claude` no terminal).

Dê dois cliques em `iniciar.cmd`, ou rode:

```powershell
node server/server.mjs
```

Depois abra http://localhost:3737. Para parar, use Ctrl+C no terminal do servidor.

## Como usar

- **Chat**: fale com o Jarvis. A resposta chega aos pedaços e as estrelas brilham enquanto ele fala.
- **Estrelas** (no chão, abaixo da cápsula): cada uma é um arquivo `.md` do `cerebro/`. Passe o mouse para ver o
  título e clique para abrir a nota. As cores mostram o tipo: azul-bebê para notas, branco para conversas, violeta
  para resumos, azul neon para skills e um branco maior para a "mente" (`CLAUDE.md`). As notas que ele lê ou escreve
  numa resposta dão um clarão; uma nota nova nasce como uma estrela nova.
- **Skills** (as bolinhas em órbita): clique para ver o que a skill faz. Use o **+ nova skill** para ensinar uma
  skill nova; ela vira `cerebro/.claude/skills/<nome>/SKILL.md`.
- **Menu ⋮ do chat → Nova conversa**: o Jarvis salva um resumo da conversa atual e começa outra do zero.

## Pastas

```
app/        a página (copiada da v1.16 e ligada ao cérebro)
server/     server.mjs: serve a página e conversa com o `claude` (sem dependências)
cerebro/    a mente do Jarvis: CLAUDE.md, notas/, conversas/, .claude/skills/
v1.16/      o design original, guardado como referência
```

Você pode editar as notas e o `cerebro/CLAUDE.md` à mão (é onde fica a personalidade dele). A página se
atualiza sozinha.

## O que o Jarvis pode e não pode fazer

- Ler, escrever e editar arquivos **só** dentro de `cerebro/`, e pesquisar e ler páginas na web.
- Não tem terminal e não enxerga o resto do seu disco nem os seus conectores (Gmail, Agenda...).
- Não consegue criar skills sozinho: ele propõe o texto e você cria pelo **+ nova skill**.
- Cada mensagem gasta do seu plano Claude, como no Claude Code.
- E-mail, Calendário e Objetivos ainda não estão ligados: os cards mostram "em breve".
