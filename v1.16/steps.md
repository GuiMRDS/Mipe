# Steps

- [x] 1 Fundo — ok. Preto liso; quadradinhos de HUD em DOM, piscando. review/f2-r2/side-by-side.jpg
- [x] 2 Estrutura e fontes — ok. JetBrains Mono (review/fonts-titulo.png, review/fonts-corpo.png); logo JARVIS em SVG (o "A" sem travessa não existe em fonte).
- [x] 3 Componentes — ok. Cards de E-mail e Calendário, chat, HUD com colchetes, rodapés. Diferenças por região: e-mail 12,6 · calendário 14,7 · chat 12,0 · topo 10,5 /255.
- [x] 4 Ícones — ok. Sprite SVG único (traço 1,5–1,6): envelope, calendário, chat, clipe, enviar, lupa, nota, casa, código, moedas.
- [x] 5 Camadas vivas — ok. Fios até as skills, arco, pulsos que descem dos dedos (SVG + rAF).
- [x] 6 Peça da Fase 1 — ok. assets/scene3d.js, a mesma da página aprovada (phase1/index.html).
- [x] 7 Interações — ok. Ciclo ocioso a cada 6,5 s (pulsos da esquerda para a direita, skills acendem); hover/clique nas skills, pontas dos dedos, núcleo, e-mails, eventos; chat com respostas.
- [x] 8 Revisão final — review/final/side-by-side.jpg, review/final.mp4. Diferença média na tela inteira: 19,0/255.

Diferenças que ficam:
- A mão é feita em Three.js (a fal.ai estava sem saldo): palma mais geométrica e dedos mais retos que os da imagem.
- O núcleo tem mais brilho difuso e os pontos menos nítidos que os da imagem (região do rodapé: 29,8/255).
- O texto renderiza um pouco mais grosso que o da imagem (fonte em peso 300 para compensar).
