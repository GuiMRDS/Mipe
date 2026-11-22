# v1.16 — a skill selecionada fica na órbita; uma linha dela para cada conexão

Pedido: "não forçar a skill para o meio; ter linhas para cada conexão, como na referência; não precisa sair do lugar".
Ao selecionar, a skill continua onde estava na órbita (a órbita só pausa; ela fica acesa e na frente). As conexões
ficam como pontos espalhados por todo o arco visível do chão, e de dentro da skill sai uma linha curva para cada uma,
em leque (cada curva com uma curvatura um pouco diferente), com partículas de informação indo e voltando. As linhas
acompanham a skill a cada quadro. Prints: review/v116-financas.png, review/v116-musica.png.

# v1.15 — conexões da skill como pontos na órbita do chão

Pedido: "as informações da skill (as conexões) aparecem na órbita de baixo, com pontos representando cada uma".
O leque em volta da cápsula saiu. Agora a skill selecionada pousa no topo do anel principal do chão (c = 767, 958;
rx 640, ry 166) e cada conexão vira um ponto sobre esse anel — metade à esquerda, metade à direita — com um tique e o
rótulo acima. As linhas correm pela própria órbita, da skill até cada ponto, se desenhando de dentro para fora, com
partículas de informação indo e voltando. Print: review/v115-financas.png.

# v1.14 — skill selecionada sob a cápsula, card explicando e "+ nova skill" na órbita

Pedido: "ao selecionar uma skill, ela aparece embaixo da cápsula com linhas representando as conexões e as informações
(como na referência review/refs/selecao-ref.webp) e um card explicando; na órbita, a função de adicionar uma nova skill".

- **Selecionar** (clique numa skill): ela sai da órbita e pousa sobre o chão, debaixo da cápsula (halo duplo pulsando);
  as conexões dela abrem em leque em volta da cápsula — curvas que se desenham uma a uma até nós com o nome de cada
  conexão (ex.: Código → GitHub, PRs, Deploys, Testes, Bugs, Docs), com partículas de informação correndo nos dois
  sentidos. A órbita pausa e as outras skills ficam apagadas.
- **Card** (no lugar do E-mail e do Calendário): ícone, nome, descrição, status, 3 números, atividade das 24 h,
  conexões, "Executar agora" (manda energia pelo dedo e o Jarvis responde) e "Perguntar ao Jarvis" (preenche o chat).
  Fecha clicando de novo na skill, no ×, com Esc ou clicando fora.
- **+ nova skill**: orbita junto (tracejado). Abre um formulário no card (nome, o que faz, ícone, conexões); ao criar,
  a skill entra na órbita, já selecionada, e o Jarvis avisa no chat. As criadas ficam salvas neste navegador
  (localStorage) e não têm dedo — a energia sai direto da cápsula.
- Ajuste: a entrada em cascata dos cards (v1.8) usava fill-mode "both", que travava a opacidade; agora "backwards",
  para os cards poderem sair de cena.
Prints: review/v114-selecao.png, review/v114-nova.png.

# v1.13 — chão holográfico (as linhas de órbita da base)

Pedido: "arrumar as linhas de órbita da base, com criatividade". As 3 elipses brancas paradas viraram um chão vivo:
1. anel principal em degradê (azul neon no centro → azul bebê nas laterais) com dois cometas de luz correndo em sentidos
   opostos, deixando rastro (shader por vértice: `aT` = posição no anel);
2. anel tracejado girando devagar, com marcas maiores a cada 1/16, como uma régua de HUD;
3. anel externo pontilhado, os pontos piscando como estrelas;
4. ondas de sonar: 3 anéis defasados que nascem debaixo da cápsula e se abrem até sumir (ciclo de 7,8 s; mais fortes
   quando o Jarvis fala);
5. reflexo: uma poça de luz azul no chão, logo abaixo da cápsula (pulsa e aumenta quando o Jarvis fala ou com o mouse).
Gravação: review/v113.mp4 (faixa do chão: review/v113-chao.jpg). Print: review/v113-final.png.

# v1.12 — paleta azul com fundo preto

Pedido: "manter a paleta azul, mas com o fundo preto igual ao da paleta verde; fundo e cards mais escuros".
O fundo voltou ao preto puro (#000, também na malha de fundo do 3D e no interior da mão); a névoa colorida saiu; o vidro
dos cards, do chat, das skills e do cartãozinho de status ficou quase preto (só um fio de azul frio). Todo o azul da v1.11
continua (neon, bebê, branco, toque violeta; cápsula em degradê; bordas holográficas; estrelas). Medido: fundo (0, 0, 0),
cards (8, 8, 11). Print: review/v112-final.png.

# v1.11 — paleta azul (no lugar do verde)

Pedido (corrigido pelo usuário durante o trabalho): "a cor principal agora é o azul, no lugar do verde; a paleta inteira
das referências (azul-marinho, branco, azul bebê, azul neon…). NÃO quero uma cápsula nova; skills, cards e fundo podem
ser atualizados de acordo com a paleta das imagens de referência" (refs em review/refs/).

- **Paleta:** todo o verde virou azul neon (#3da9ff); fundo azul-marinho (#030817); textos e cinzas azulados; vidro dos
  cards e do chat em marinho; azul bebê (#a9d8ff) e um toque de violeta (#8f7bff) nos brilhos.
- **Cápsula:** a mesma forma e as mesmas animações da v1.10; só as cores: os pontos em degradê — azul bebê em cima,
  azul neon no meio, violeta embaixo e na borda (como as referências 4 e 5).
- **Fundo:** névoa azul e violeta bem suave que respira; os pixels viraram estrelas azul bebê, brancas, neon e poucas
  violeta, piscando. O marinho do canvas é uma malha ao fundo (a cor de limpeza sairia ~4× mais clara no pós-processamento).
- **Cards:** borda holográfica que gira devagar (azul neon → azul bebê → violeta), cada card no seu tempo; fio do topo
  com toque violeta; sombra azulada.
- **Skills:** vidro marinho, halo azul com violeta quando acendem e um cartãozinho de status no hover
  ("3 fontes em análise", "Foco · lo-fi tocando", "Sala 40% · 23 °C", "2 PRs para revisar", "62% do orçamento").
Print: review/v111-final.png · gravação: review/v111.mp4.

# v1.10 — a cápsula (a IA), manipulada pela mão, com as skills em órbita

Pedido: "colocar as skills orbitando a cápsula e a mão manipulando a cápsula, representando a IA".

- **Cápsula:** o núcleo virou uma esfera inteira no centro (c = 767, 612; r = 150), com pontos, filamentos, órbitas e o
  coração. Os arcos de horizonte ficaram fixos embaixo, como um "chão".
- **Manipulação:** os fios saem das pontas dos dedos e se prendem em 5 pontos da frente da cápsula (`scene.anchors()`).
  Os dedos puxam em onda (um após o outro) e a cápsula responde: sobe com o puxão e inclina para o lado do dedo que puxa;
  os fios acompanham.
- **Órbita:** as 5 skills giram num anel inclinado em volta da cápsula (`ORBIT`: R = 262, inclinação 0,29 rad; o anel
  também é desenhado em 3D). Atrás da cápsula ficam menores e apagadas; na frente, cheias. Com o mouse numa skill, a
  órbita pausa para o clique.
- **Energia:** anel sobe pelo dedo → pulso desce pelo fio até a cápsula → a cápsula brilha → um feixe sai dela até a
  skill (seguindo-a na órbita) → a skill acende. O arco fixo entre as skills saiu (o caminho delas agora é a órbita).
Print: review/v110-final.png · gravação: review/v110.mp4 (quadros: review/v110-sheet.jpg).

# v1.9 — pixels só piscando + o agente vivo

Pedido: "pixels do fundo independentes da mão, algo simples piscando; mais animações na página toda, como se o agente
estivesse vivo".

**Pixels.** Saíram os pixels que subiam até a mão, a explosão nas skills, a paralaxe e o glitch com salto. Agora: um
campo de pixels pela tela inteira (refeito ao mudar o tamanho da tela; alguns verdes) e os quadradinhos da imagem, todos
só piscando — acendem e apagam em degraus, cada um no seu tempo.

**O agente vivo.**
- Abertura: o logo JARVIS e as linhas de HUD se desenham traço a traço; os colchetes se abrem; os textos de HUD
  "decodificam" (letras embaralhadas que se acertam).
- O sistema "pensa": a cada ~6,5 s um bloco de HUD se redecodifica.
- Ouvindo: uma onda de voz no cabeçalho do chat; agita quando você digita (o núcleo acelera e as pontas dos dedos acendem)
  e quando o Jarvis fala.
- Iniciativa própria: depois de ~20 s sem interação (e no mínimo 35 s entre elas), o Jarvis puxa assunto sozinho —
  lembrete do próximo evento real, notícias, música, casa, deploy, finanças — no máximo 4 vezes.
- Skills: um anel tracejado gira em volta de cada ícone (acelera no hover); uma luz percorre o arco que liga as skills.
- Calendário: "2 eventos" alterna com a contagem regressiva real até o próximo evento ("Academia em 44 min").
Tudo respeita `prefers-reduced-motion`. Gravação: review/v19.mp4; abertura: review/v19-abertura.png; iniciativa:
review/v19-chat.png.

# v1.8 — animações nos cards e nos pixels do fundo

Pedido: "adicionar animações nos cards e nos pixels do fundo" (assets/anim.css + app.js).

**Cards.** Entrada em cascata (o vidro se revela de cima para baixo, E-mail → Calendário → chat, e as linhas entram uma
a uma); a grade do fundo desliza devagar; uma luz percorre o fio verde do topo; uma faixa de varredura desce pelo card de
tempos em tempos (cada card no seu tempo); um brilho verde suave segue o mouse dentro do card; o badge "3" pulsa, o
ponto "online" emite um anel, o ponto de não lido pisca e a barra do evento atual respira.

**Pixels do fundo.** Cada quadradinho flutua num vaivém próprio; de tempos em tempos um deles dá um glitch (salta em
degraus e pisca em verde); o conjunto tem paralaxe com o mouse; pixels de dados sobem do núcleo em direção à mão; e uma
pequena explosão de pixels sai de cada skill quando ela acende.

Tudo respeita `prefers-reduced-motion`. Gravação: review/v18.mp4 (quadros: review/v18-sheet.jpg).

# v1.7 — mão de marionetista (palma para baixo, vista de frente)

Pedido: "mão deitada com a palma para baixo, como na foto, porém de frente para mim" (foto: review/pose-ref.webp).
A mão foi remodelada na pose de marionetista: o antebraço vem de cima e de trás; as costas da mão (seções ao longo do
eixo, `HAND.dorsum`) inclinam para a câmera; os 5 dedos saem dos nós, avançam para a frente e caem, com as pontas
embaixo — e é delas que descem os fios até as skills. Mão esquerda vista de frente: o polegar fica à esquerda (Pesquisa).
Os anéis usam um referencial estável (`frameOf`) mesmo quando o dedo aponta para a câmera. As animações da v1.5/v1.6
continuam (anel subindo pelo dedo, onda na ponta, faíscas, pulso e fluxo nos fios).
Print: review/v17-final.png · gravação: review/v17.mp4 (quadros: review/v17-dedos.jpg).

# v1.6 — mão de pé (como na v1.4) + animações da v1.5

Pedido: "manter a posição da mão como estava antes; as animações eu gostei".
A mão volta à geometria da v1.4 (`HAND.tilt` = 0, mesmas medidas de dedos e palma); ficam todas as animações da v1.5:
anel que sobe pelo dedo, onda na ponta, faíscas em órbita, pulso descendo pelo fio e fluxo contínuo nos fios.
Comparação com a v1.4: review/mao-v14-v16.png. Quadros das animações: review/v16-dedos.jpg.

# v1.5 — mão deitada + animações nos dedos

Pedido: "mão mais deitada igual à imagem JVP-037; animações nos dedos junto com as linhas que descem deles".

**Mão deitada.** Remodelada com as proporções da JVP-037: palma grande até a linha dos nós, dedos mais curtos e grossos
em leque, polegar saindo mais de baixo. A mão inclina para trás em profundidade (`HAND.tilt` = 0,5): o que está mais
alto na tela fica mais fundo, os anéis da grade viram elipses e a palma é feita de seções perpendiculares ao eixo
deitado. As pontas continuam nas posições da imagem, então os fios não mudam. Comparação: review/mao-r2.png.

**Animações nos dedos e nos fios.**
- Anel de varredura: um anel verde sobe por dentro do dedo, da base até a ponta (0,6 s).
- Onda na ponta: ao chegar, um círculo verde se abre na ponta e o brilho aumenta.
- Só então o pulso desce pelo fio até a skill, que acende (dedo → fio → skill, em sequência).
- Faíscas: 3 pontinhos orbitam cada ponta o tempo todo (aceleram quando a energia chega).
- Fluxo nos fios: traços claros descem continuamente por cada fio, cada um no seu ritmo.
O ciclo ocioso, o clique nas skills, nas pontas e as respostas do chat usam essa mesma sequência.
Gravação: review/v15.mp4 (quadros da mão: review/v15-dedos.jpg).

Diferença que fica: a palma ainda é mais "arredondada" que a anatômica da imagem (mão feita em código).

# v1.4 — fundo Grade

Pedido: "fundo de card escolhido: 1 · Grade". O fundo Grade fica fixo (body[data-fundo="1"]); o seletor, as teclas 1–5 e os outros 4 fundos saíram. Nada mais mudou. Print: review/v14-final.png.

# v1.3 — tela inteira + 5 fundos de card

Pedido: "ocupar toda a tela; propor 5 fundos de card minimalistas, tech e glass, na identidade da página".

**Tela inteira.** O canvas 3D cobre a tela toda (a câmera enquadra o pedaço do palco visível em qualquer proporção).
A interface fica em 6 grupos presos às bordas (escala u = menor entre altura/864 e largura/1536): logo e HUD nos cantos
de cima, E-mail e Calendário à esquerda (centrados na vertical), chat à direita, HUDs nos cantos de baixo. O centro
(mão, fios, skills, núcleo) usa a altura toda, com a cúpula encostada embaixo, e só encolhe se a mão não couber entre as
colunas. Sem faixas pretas em 16:9, 21:9 ou 4:3. Celular e tablet em pé continuam como na v1.2.

**5 fundos de card** (assets/fundos.css; seletor no topo, teclas 1–5, `?fundo=N` na URL, `?sem-seletor` esconde):
1. Grade — quadriculado fino que some na diagonal + fio verde no topo.
2. Pontos — matriz de pontos verdes (eco do núcleo), mais densa no canto de cima.
3. Circuito — trilhas de placa com nós verdes nascendo do canto de baixo + fio verde na lateral.
4. Scanline — linhas de varredura, cantos de HUD em verde e um brilho que atravessa o vidro a cada 8 s.
5. Hexágonos — colmeia fina com uma luz verde no canto de baixo.
Comparação: review/fundos-comparacao.png. Testes de tela: review/full-*.png.

# v1.2 — responsivo

Pedido: "deixar responsivo de acordo com o tamanho da tela".
- **Telas largas** (largura ≥ 900 px e proporção ≥ 1,15): o palco inteiro escalado para caber, ancorado embaixo (a cúpula encosta na borda inferior).
- **Telas estreitas ou verticais** (celular, tablet em pé): o palco vira um hero recortado no centro (mão, skills e núcleo, com degradê embaixo) e o logo, o E-mail, o Calendário e o chat saem do palco e empilham numa coluna com rolagem (zoom até 1,2×).
- O 3D renderiza na resolução real da tela (pixel ratio × escala, teto 2,5): fica nítido em monitores grandes.
- Testado em 1920×1080, 1024×768, 768×1024 e 375×812 (review/resp-*.png). Nada mais mudou.

# v1.1 — arcos da órbita na base

Pedido: "arrumar o círculo da órbita na base: deixar igual à imagem JVP-037".
Os 3 arcos de horizonte eram elipses quase de perfil (viravam linhas retas de ponta a ponta). Agora são elipses abertas no plano da tela, centradas em y = 958 px (rx 640/702/770, ry 166/180/196), que sobem pelas laterais até y ≈ 790 e passam por trás da cúpula. Nada mais mudou. Comparação: review/v11/zoom-base.jpg.

# Jarvis — dashboard vivo (JVP-037/v1)

Página feita com a skill `video2html` a partir da imagem JVP-037 (conteúdo) e do vídeo JVP-039 (movimento).

## O que vive
- **Mão em wireframe (Three.js):** respira, se inclina para o cursor; a ponta clicada flexiona e acende.
- **Núcleo (Three.js):** ~4.500 pontos, círculos máximos, órbitas com nós, filamentos, coração com batida dupla.
  Com o mouse em cima, acelera; ao clicar, uma onda de luz percorre a esfera e o Jarvis fala.
- **Fios e skills (SVG):** os fios saem das pontas reais dos dedos 3D; a cada 6,5 s pulsos descem e acendem as
  skills da esquerda para a direita (o movimento do vídeo). Hover acende; clique faz o Jarvis falar da skill.
- **Cards:** clicar num e-mail marca como lido (o badge baixa) e o Jarvis resume; clicar num evento dá os detalhes.
- **Chat:** campo de verdade; respostas por palavra-chave (música, casa, código, finanças, pesquisa, e-mail, agenda),
  com "digitando", avatar pulsando, a skill citada acendendo e o núcleo reagindo.

## Como foi feito
- Palco fixo de 1536×864 (1 px = 1 px da imagem), escalado para a janela. Camadas: canvas 3D (fundo) → quadradinhos e
  linhas de HUD → fios e arco (SVG) → skills → textos de HUD → cards e chat (vidro com backdrop-filter).
- three@0.170.0 (jsDelivr), JetBrains Mono (Google Fonts). Sem build.
- `assets/scene3d.js` (Fase 1, aprovada), `assets/app.js`, `assets/styles.css`.

## O que ficou de fora e por quê
- **Mão de image-to-3D:** a fal.ai estava sem saldo; a mão foi modelada em código. A mão isolada (JVP-041) está pronta
  para um image-to-3D depois, que entraria no lugar sem mudar o resto.
- **Defeitos do vídeo ignorados:** a mão fechando no meio, o avatar virando rosto.
- Respostas do chat são roteirizadas (não há modelo de linguagem ligado).
