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
  GRAB_RADIUS: 30,        // distância (px) em que o toque "pega" uma peça
  TAP_SLOP: 10,           // movimento (px) abaixo do qual o toque conta como "toque", não arraste
  LEVELS: 10,             // fases por modo/dificuldade
  RUN_SPEED: 4.5,         // casas por segundo do herói no modo padrão
  SPEED_PENALTY: 5,       // segundos somados no SpeedRun a cada derrota
  SPEED_LEVELS: [3, 4, 5, 6, 7],            // fase (dificuldade interna) de cada puzzle do SpeedRun
  SPEED_KINDS: ["std", "grav", "std", "grav", "std"]
};

/** Dificuldades (RF05). */
PP.DIFFICULTIES = {
  easy:   { id: "easy",   label: "FÁCIL"   },
  medium: { id: "medium", label: "MÉDIO"   },
  hard:   { id: "hard",   label: "DIFÍCIL" }
};

/** Modos de jogo (RF19 a RF23). */
PP.MODES = {
  std:   { id: "std",   label: "Padrão",        kind: "std"  },
  grav:  { id: "grav",  label: "Gravitacional", kind: "grav" },
  speed: { id: "speed", label: "SpeedRun",      kind: null   },
  skill: { id: "skill", label: "Skill Check",   kind: null   }
};

/** Bônus do Skill Check (integração com MOBA, RF24). */
PP.BONUSES = {
  vision: { id: "vision", label: "Visão de mapa",      effect: "revela o mapa inteiro" },
  heal:   { id: "heal",   label: "Cura da equipe",     effect: "cura a equipe" },
  speed:  { id: "speed",  label: "Buff de velocidade", effect: "velocidade de movimento" }
};

/* --------------------------------------------------------------------------
   Peças (RF01). Cada peça é uma lista de segmentos [x1, y1, x2, y2] em
   coordenadas de vértice da grade, a partir de (0,0) (canto superior esquerdo
   da caixa da peça). Peças são rígidas: só podem ser movidas ou (quando o
   nível habilita) giradas de 90 em 90 graus, nunca deformadas (RG04).
   -------------------------------------------------------------------------- */
PP.SHAPES = [
  { name: "reta-h2",      segs: [[0, 0, 2, 0]] },
  { name: "reta-h3",      segs: [[0, 0, 3, 0]] },
  { name: "reta-h4",      segs: [[0, 0, 4, 0]] },
  { name: "reta-v2",      segs: [[0, 0, 0, 2]] },
  { name: "reta-v3",      segs: [[0, 0, 0, 3]] },
  { name: "reta-v4",      segs: [[0, 0, 0, 4]] },
  { name: "diagonal",     segs: [[0, 0, 2, 2]] },
  { name: "diagonal-i",   segs: [[0, 2, 2, 0]] },
  { name: "diag3",        segs: [[0, 0, 3, 3]] },
  { name: "diag3-i",      segs: [[0, 3, 3, 0]] },
  { name: "rampa-suave",  segs: [[0, 0, 4, 1]] },
  { name: "rampa-suave-i", segs: [[0, 1, 4, 0]] },
  { name: "rampa-2",      segs: [[0, 0, 2, 1]] },
  { name: "rampa-2-i",    segs: [[0, 1, 2, 0]] },
  { name: "canto-L",      segs: [[0, 0, 0, 2], [0, 2, 2, 2]] },
  { name: "canto-J",      segs: [[2, 0, 2, 2], [2, 2, 0, 2]] },
  { name: "canto-L3",     segs: [[0, 0, 0, 3], [0, 3, 3, 3]] },
  { name: "seta",         segs: [[2, 0, 0, 2], [0, 2, 2, 4]] },
  { name: "v",            segs: [[0, 0, 1, 1], [1, 1, 2, 0]] },
  { name: "escada",       segs: [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 2, 1], [2, 1, 2, 2]] },
  { name: "zigue-zague",  segs: [[0, 0, 2, 0], [2, 0, 2, 2], [2, 2, 4, 2]] },
  { name: "bifurcacao-Y", segs: [[0, 0, 1, 1], [2, 0, 1, 1], [1, 1, 1, 3]] },
  { name: "cruz-X",       segs: [[0, 0, 2, 2], [2, 0, 0, 2]] },
  { name: "quadrado",     segs: [[0, 0, 2, 0], [2, 0, 2, 2], [2, 2, 0, 2], [0, 2, 0, 0]] }
];

PP.SHAPE_BY_NAME = {};
PP.SHAPES.forEach(function (s) { PP.SHAPE_BY_NAME[s.name] = s; });

function names(list) { return list.map(function (n) { return PP.SHAPE_BY_NAME[n]; }); }

/** Peças usadas no modo padrão (sem rampas suaves, que só fazem sentido com gravidade). */
PP.POOL_STD = names([
  "reta-h2", "reta-h3", "reta-h4", "reta-v2", "reta-v3", "reta-v4", "diagonal", "diagonal-i",
  "diag3", "diag3-i", "canto-L", "canto-J", "canto-L3", "seta", "v", "escada", "zigue-zague",
  "bifurcacao-Y", "cruz-X", "quadrado"
]);

/** Peças que formam a "rota" de solução no modo gravitacional (rampas e plataformas). */
PP.POOL_GRAV_CHAIN = names([
  "diagonal", "diagonal-i", "diag3", "diag3-i", "rampa-suave", "rampa-suave-i",
  "rampa-2", "rampa-2-i", "reta-h3", "reta-h4", "canto-L", "canto-J"
]);

/** Todas as peças possíveis como "isca" no modo gravitacional. */
PP.POOL_GRAV_ALL = PP.SHAPES.slice();

/* --------------------------------------------------------------------------
   Parâmetros de dificuldade por modo, nível (1..10) e dificuldade (RF05, RF28)
   -------------------------------------------------------------------------- */
function lerp(a, b, t) { return a + (b - a) * t; }
function ri(a, b, t) { return Math.round(lerp(a, b, t)); }

/**
 * kind: "std" | "grav"; diff: "easy" | "medium" | "hard"; n: 1..10.
 * chain  = nº de peças que formam a solução; decoys = peças "isca";
 * slack  = movimentos extras permitidos além do mínimo (Infinity = sem limite);
 * time   = segundos de planejamento; rotate = peças giram ao toque.
 */
PP.levelParams = function (kind, diff, n) {
  var t = Math.min(1, Math.max(0, (n - 1) / (PP.CONFIG.LEVELS - 1)));
  var p = { kind: kind, diff: diff, n: n, t: t, coins: 0, enemies: 0, rotate: false, slack: Infinity };

  if (kind === "std") {
    if (diff === "easy") {
      p.chain = ri(3, 6, t); p.decoys = ri(3, 6, t); p.goalMin = lerp(6.0, 7.0, t);
      p.time = ri(150, 100, t);
    } else if (diff === "medium") {
      p.chain = ri(4, 7, t); p.decoys = ri(5, 9, t); p.goalMin = lerp(6.5, 7.07, t);
      p.coins = ri(1, 3, t); p.enemies = ri(0, 2, t); p.rotate = n >= 5;
      p.slack = ri(5, 3, t); p.time = ri(120, 80, t);
    } else {
      p.chain = ri(5, 9, t); p.decoys = ri(7, 12, t); p.goalMin = 7.0;
      p.coins = ri(2, 5, t); p.enemies = ri(2, 5, t); p.rotate = n >= 2;
      p.slack = ri(4, 2, t); p.time = ri(90, 55, t);
    }
  } else {
    if (diff === "easy") {
      p.chain = ri(2, 3, t); p.decoys = ri(2, 4, t); p.time = ri(150, 100, t);
    } else if (diff === "medium") {
      p.chain = ri(3, 4, t); p.decoys = ri(3, 6, t);
      p.coins = ri(1, 3, t); p.enemies = ri(0, 1, t); p.rotate = n >= 5;
      p.slack = ri(5, 3, t); p.time = ri(120, 80, t);
    } else {
      p.chain = ri(3, 5, t); p.decoys = ri(5, 9, t);
      p.coins = ri(2, 4, t); p.enemies = ri(1, 3, t); p.rotate = n >= 2;
      p.slack = ri(4, 2, t); p.time = ri(90, 55, t);
    }
  }
  return p;
};
