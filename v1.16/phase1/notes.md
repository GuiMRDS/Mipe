# Fase 1 — mão e núcleo 3D

- **Mão:** a fal.ai estava sem saldo (HTTP 403), então, por decisão do usuário, a mão é feita do zero em Three.js:
  palma (seções superelípticas com a eminência tenar) e 5 dedos (tubos curvos com ponta arredondada), desenhados como
  grade de linhas brancas, com uma malha preta que esconde as linhas de trás. A mão isolada (JVP-041) ficou como asset
  para um image-to-3D futuro.
- **Núcleo:** esfera de pontos em latitudes (~4.500), 3 círculos máximos, 3 órbitas com nós, 320 filamentos na coroa,
  arcos de horizonte, coração que pulsa (batida dupla a cada 1,6 s).
- **Brilho:** UnrealBloom (0.5, 0.15, limiar 0.7) no mesmo canvas, opaco e preto (é a camada de fundo da página).
- **Câmera:** fov 8°, posta para que o plano z=0 coincida com a imagem pixel a pixel.

## Revisão (3 rodadas)
- r1: névoa de bloom, mão estourada, coração fora da tela (perspectiva forte) → fov 8°, bloom menor.
- r2: bom; palma quadrada, núcleo apagado.
- r3: núcleo estourado → meio-termo no final.
- Diferença que fica: a palma é mais geométrica que a da imagem (sem as linhas da palma e as dobras); os dedos são mais retos.
