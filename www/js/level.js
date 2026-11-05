/* ==========================================================================
   level.js - geração aleatória das fases (RF-01 a RF-05)
   --------------------------------------------------------------------------
   Coordenadas de nível são em "vértices" da grade (0..10). A conversão para
   pixels é feita em game.js.

   ALPHA: as peças são espalhadas ao acaso, sem garantia de solução (RF-04 /
   RG-10 ainda pendentes). Veja docs/DOCUMENTACAO.md, seção "Próximos passos".
   ========================================================================== */
PP.Level = (function () {
  "use strict";

  var C = PP.CONFIG;
  var G = PP.Geo;

  /** Inteiro aleatório de 0 a n-1. */
  function rnd(n) { return Math.floor(Math.random() * n); }

  /** Largura e altura (em casas) ocupadas por uma lista de segmentos. */
  function sizeOf(segs) {
    var w = 0, h = 0;
    segs.forEach(function (s) { w = Math.max(w, s[0], s[2]); h = Math.max(h, s[1], s[3]); });
    return { w: w, h: h };
  }

  /** Segmentos da peça já deslocados para a posição (x, y) dela. */
  function absSegs(piece, x, y) {
    x = x === undefined ? piece.x : x;
    y = y === undefined ? piece.y : y;
    return piece.segs.map(function (s) { return [s[0] + x, s[1] + y, s[2] + x, s[3] + y]; });
  }

  /** A peça (na posição x, y) cruza ou sobrepõe alguma outra peça? */
  function conflicts(piece, x, y, others) {
    var mine = absSegs(piece, x, y);
    return others.some(function (o) {
      if (o === piece) return false;
      var theirs = absSegs(o);
      return mine.some(function (a) {
        return theirs.some(function (b) { return G.segmentsConflict(a, b); });
      });
    });
  }

  /** A peça passa a menos de `minDist` vértices do ponto pt? */
  function nearPoint(piece, pt, minDist) {
    return absSegs(piece).some(function (s) {
      return G.distToSegment(pt.x, pt.y, s[0], s[1], s[2], s[3]) < minDist;
    });
  }

  /** Sorteia `count` vértices livres, afastados do início, do portal e entre si. */
  function pickVertices(count, avoid) {
    var picked = [];
    var tries = 0;
    while (picked.length < count && tries++ < 300) {
      var v = { x: 1 + rnd(C.GRID - 1), y: 1 + rnd(C.GRID - 1) };
      var ok = avoid.concat(picked).every(function (a) {
        return Math.hypot(a.x - v.x, a.y - v.y) >= 2;
      });
      if (ok) picked.push(v);
    }
    return picked;
  }

  /**
   * Cria uma fase nova para a dificuldade informada.
   * Retorna { pieces, start, goal, coins, enemies }.
   */
  function generate(difficultyId) {
    var diff = PP.DIFFICULTIES[difficultyId];
    var mid = C.GRID / 2;
    var start = { x: mid, y: mid };                       // RG-01: personagem no centro
    var corners = [{ x: 0, y: 0 }, { x: C.GRID, y: 0 }, { x: 0, y: C.GRID }, { x: C.GRID, y: C.GRID }];
    var goal = corners[rnd(corners.length)];              // RG-02: objetivo na periferia

    var pieces = [];
    var attempts = 0;
    while (pieces.length < C.PIECE_COUNT && attempts++ < 500) {
      var shape = PP.SHAPES[rnd(PP.SHAPES.length)];
      var size = sizeOf(shape.segs);
      var piece = {
        id: pieces.length,
        name: shape.name,
        segs: shape.segs,
        w: size.w,
        h: size.h,
        x: rnd(C.GRID - size.w + 1),
        y: rnd(C.GRID - size.h + 1)
      };
      if (nearPoint(piece, start, 0.6) || nearPoint(piece, goal, 0.6)) continue;
      if (conflicts(piece, piece.x, piece.y, pieces)) continue;
      pieces.push(piece);
    }

    var coins = pickVertices(diff.coins, [start, goal]);
    var enemies = pickVertices(diff.enemies, [start, goal].concat(coins));
    return { pieces: pieces, start: start, goal: goal, coins: coins, enemies: enemies };
  }

  /** Guarda a posição atual das peças (para "restaurar" a fase). */
  function snapshot(level) {
    return level.pieces.map(function (p) { return { x: p.x, y: p.y }; });
  }

  /** Volta as peças às posições guardadas por snapshot(). */
  function restore(level, snap) {
    level.pieces.forEach(function (p, i) { p.x = snap[i].x; p.y = snap[i].y; });
  }

  return {
    generate: generate, snapshot: snapshot, restore: restore,
    absSegs: absSegs, conflicts: conflicts
  };
})();
