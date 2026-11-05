/* ==========================================================================
   config.js - constantes globais do jogo
   --------------------------------------------------------------------------
   Todo o código usa o namespace global PP ("Pathfinder Puzzle") em vez de
   módulos ES, para que o jogo abra até com duplo clique em index.html.
   ========================================================================== */
window.PP = window.PP || {};

/** Medidas do design e do tabuleiro. */
PP.CONFIG = {
  DESIGN_W: 819,          // largura da tela de design (mesma do PDF)
  DESIGN_H: 1456,         // altura da tela de design
  GRID: 10,               // o tabuleiro tem 10 x 10 casas (11 x 11 vértices)
  CELL: 56,               // tamanho de uma casa, em px de design
  PAD: 40,                // margem interna do tabuleiro
  BOARD_SIZE: 640,        // PAD + GRID * CELL + PAD
  PLAN_TIME: 90,          // segundos do cronômetro (1:30)
  PIECE_COUNT: 12,        // quantidade de peças geradas por fase
  GRAB_RADIUS: 26         // distância (px) em que o toque "pega" uma peça
};

/** Parâmetros de cada dificuldade (RF-05). */
PP.DIFFICULTIES = {
  easy:   { id: "easy",   label: "FÁCIL",   coins: 0, enemies: 0 },
  medium: { id: "medium", label: "MÉDIO",   coins: 4, enemies: 0 },
  hard:   { id: "hard",   label: "DIFÍCIL", coins: 5, enemies: 3 }
};

/**
 * Formas de peças (RF-01). Cada peça é uma lista de segmentos
 * [x1, y1, x2, y2] em coordenadas de vértice da grade, a partir de (0,0).
 * Peças são rígidas: só podem ser movidas, nunca giradas ou deformadas (RG-04).
 */
PP.SHAPES = [
  { name: "reta-h2",   segs: [[0, 0, 2, 0]] },
  { name: "reta-h3",   segs: [[0, 0, 3, 0]] },
  { name: "reta-v2",   segs: [[0, 0, 0, 2]] },
  { name: "reta-v3",   segs: [[0, 0, 0, 3]] },
  { name: "diagonal",  segs: [[0, 0, 2, 2]] },
  { name: "diagonal-i", segs: [[0, 2, 2, 0]] },
  { name: "canto-L",   segs: [[0, 0, 0, 2], [0, 2, 2, 2]] },
  { name: "canto-J",   segs: [[2, 0, 2, 2], [2, 2, 0, 2]] },
  { name: "seta",      segs: [[2, 0, 0, 2], [0, 2, 2, 4]] },
  { name: "v",         segs: [[0, 0, 1, 1], [1, 1, 2, 0]] },
  { name: "zigue-zague", segs: [[0, 0, 2, 0], [2, 0, 2, 2], [2, 2, 4, 2]] },
  { name: "bifurcacao-Y", segs: [[0, 0, 1, 1], [2, 0, 1, 1], [1, 1, 1, 3]] },
  { name: "cruz-X",    segs: [[0, 0, 2, 2], [2, 0, 0, 2]] },
  { name: "quadrado",  segs: [[0, 0, 2, 0], [2, 0, 2, 2], [2, 2, 0, 2], [0, 2, 0, 0]] }
];
