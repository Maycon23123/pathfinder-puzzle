/* ==========================================================================
   level.js - geração das fases (RF01 a RF05, RF14, RG10)
   --------------------------------------------------------------------------
   COMO GARANTIMOS QUE TODA FASE TEM SOLUÇÃO (RF04 / RG10)
     1. Monta primeiro a SOLUÇÃO: uma cadeia de peças ligando o personagem ao
        portal (modo padrão: grade/Dijkstra; gravitacional: simulação física).
     2. Acrescenta peças "isca" que não atrapalham a solução.
     3. Espalha todas as peças com translações (e giros, se o nível permitir),
        de modo que cada peça da solução possa ir direto ao seu lugar.
     4. Confere que a fase embaralhada ainda NÃO está resolvida.
   O arranjo resolvido fica guardado em level.solved (usado nos testes).

   Coordenadas de nível são em vértices da grade (0..10). A conversão para
   pixels é feita em game.js.
   ========================================================================== */
PP.Level = (function () {
  "use strict";

  var C = PP.CONFIG;
  var G = PP.Geo;
  var GRID = C.GRID;
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /* ====================================================================
     PEÇAS
     ==================================================================== */

  /** Largura e altura (em casas) da caixa de uma lista de segmentos. */
  function sizeOf(segs) {
    var w = 0, h = 0;
    segs.forEach(function (s) { w = Math.max(w, s[0], s[2]); h = Math.max(h, s[1], s[3]); });
    return { w: w, h: h };
  }

  /** Gira 90° no sentido horário uma lista de segmentos dentro de uma caixa w x h. */
  function rotSegs(segs, h) {
    return segs.map(function (s) { return [h - s[1], s[0], h - s[3], s[2]]; });
  }

  /** Peça `base` girada `rot` vezes 90°: { segs, w, h }. */
  function variant(base, rot) {
    var sz = sizeOf(base), segs = base, w = sz.w, h = sz.h;
    for (var i = 0; i < rot; i++) { segs = rotSegs(segs, h); var t = w; w = h; h = t; }
    return { segs: segs, w: w, h: h };
  }

  /** Vértices (pontos da grade) por onde passam os segmentos. */
  function nodesOf(segs) {
    var seen = {}, out = [];
    segs.forEach(function (s) {
      var steps = G.gcd(Math.abs(s[2] - s[0]), Math.abs(s[3] - s[1]));
      for (var k = 0; k <= steps; k++) {
        var x = s[0] + (s[2] - s[0]) / steps * k, y = s[1] + (s[3] - s[1]) / steps * k;
        var key = x + "," + y;
        if (!seen[key]) { seen[key] = true; out.push({ x: x, y: y }); }
      }
    });
    return out;
  }

  function makePiece(id, shape, rot, x, y, opts) {
    var v = variant(shape.segs, rot);
    return {
      id: id, name: shape.name, base: shape.segs, rot: rot,
      segs: v.segs, w: v.w, h: v.h, x: x, y: y,
      fixed: !!(opts && opts.fixed), role: (opts && opts.role) || "decoy"
    };
  }

  /** Muda a rotação da peça (0..3), atualizando segmentos e caixa. */
  function setRot(piece, rot) {
    var v = variant(piece.base, rot);
    piece.rot = rot; piece.segs = v.segs; piece.w = v.w; piece.h = v.h;
  }

  /** Segmentos da peça já deslocados para a posição (x, y) dela. */
  function absSegs(piece, x, y) {
    x = x === undefined ? piece.x : x;
    y = y === undefined ? piece.y : y;
    return piece.segs.map(function (s) { return [s[0] + x, s[1] + y, s[2] + x, s[3] + y]; });
  }

  /** Igual a absSegs, mas com o id da peça no fim (para a física saber quem foi tocado). */
  function absSegsId(piece) {
    return piece.segs.map(function (s) { return [s[0] + piece.x, s[1] + piece.y, s[2] + piece.x, s[3] + piece.y, piece.id]; });
  }

  /** Esses segmentos cruzam ou sobrepõem alguma das peças `others`? */
  function conflictsSegs(mine, others, ignore) {
    for (var i = 0; i < others.length; i++) {
      var o = others[i];
      if (o === ignore) continue;
      var theirs = absSegs(o);
      for (var a = 0; a < mine.length; a++) {
        for (var b = 0; b < theirs.length; b++) {
          if (G.segmentsConflict(mine[a], theirs[b])) return true;
        }
      }
    }
    return false;
  }

  /** A peça (na posição x, y) cruza ou sobrepõe alguma outra peça? */
  function conflicts(piece, x, y, others) {
    return conflictsSegs(absSegs(piece, x, y), others, piece);
  }

  function fits(piece, x, y) {
    return x >= -1e-9 && y >= -1e-9 && x + piece.w <= GRID + 1e-9 && y + piece.h <= GRID + 1e-9;
  }

  /** Guarda a pose (posição + giro) de todas as peças. */
  function snapshot(level) {
    return level.pieces.map(function (p) { return { x: p.x, y: p.y, rot: p.rot }; });
  }

  /** Volta as peças às poses guardadas por snapshot(). */
  function restore(level, snap) {
    level.pieces.forEach(function (p, i) { setRot(p, snap[i].rot); p.x = snap[i].x; p.y = snap[i].y; });
  }

  /** Assinatura de uma forma (conjunto de arestas), para comparar giros equivalentes. */
  function sig(segs) {
    return segs.map(function (s) {
      var a = s[0] + "," + s[1], b = s[2] + "," + s[3];
      return a < b ? a + ">" + b : b + ">" + a;
    }).sort().join("|");
  }

  /** Quantos toques de giro levam a peça de `from` até uma orientação igual a `to`? */
  function tapsBetween(base, from, to) {
    var target = sig(variant(base, to).segs);
    for (var k = 0; k < 4; k++) if (sig(variant(base, (from + k) % 4).segs) === target) return k;
    return 0;
  }

  /* ====================================================================
     FERRAMENTAS DE SORTEIO
     ==================================================================== */

  function pickWeighted(rng, items) { return rng.weighted(items); }
  function sq(v) { return v * v; }

  /** Adiciona até `count` peças-isca em posições livres. */
  function addDecoys(pieces, count, rng, pool, rotate, accept) {
    var added = 0;
    for (var d = 0; d < count; d++) {
      for (var tr = 0; tr < 60; tr++) {
        var shape = rng.pick(pool), rot = rotate ? rng.int(4) : 0, v = variant(shape.segs, rot);
        var x = rng.int(GRID - v.w + 1), y = rng.int(GRID - v.h + 1);
        var p = makePiece(pieces.length, shape, rot, x, y, { role: "decoy" });
        if (conflicts(p, x, y, pieces)) continue;
        if (accept && !accept(p)) continue;
        pieces.push(p); added++;
        break;
      }
    }
    return added;
  }

  /**
   * Espalha as peças móveis (RF04: "dispersar por translações aleatórias").
   * Regra extra: nenhuma peça fica onde atrapalharia o lugar de solução de outra
   * peça da cadeia; assim cada peça da cadeia pode ir direto ao seu lugar.
   */
  function scramble(level, P, rng) {
    var pieces = level.pieces, rail = pieces[0];
    var movable = pieces.filter(function (p) { return !p.fixed; });
    var chain = movable.filter(function (p) { return p.role === "chain"; });
    var solvedPose = {};
    pieces.forEach(function (p) { solvedPose[p.id] = { x: p.x, y: p.y, rot: p.rot }; });
    var solvedAbs = {};
    chain.forEach(function (p) { solvedAbs[p.id] = absSegs(p); });

    for (var attempt = 0; attempt < 30; attempt++) {
      var order = rng.shuffle(movable.slice());
      var placed = [rail], ok = true;
      for (var oi = 0; oi < order.length && ok; oi++) {
        var p = order[oi], sp = solvedPose[p.id], found = false;
        for (var k = 0; k < 160 && !found; k++) {
          var rot = P.rotate ? rng.int(4) : sp.rot;
          var v = variant(p.base, rot);
          var x = rng.int(GRID - v.w + 1), y = rng.int(GRID - v.h + 1);
          if (p.role === "chain" && rot === sp.rot && Math.abs(x - sp.x) + Math.abs(y - sp.y) < 3) continue;
          if (P.rotate && p.role === "chain" && tapsBetween(p.base, rot, sp.rot) === 0 &&
              Math.abs(x - sp.x) + Math.abs(y - sp.y) < 3) continue;
          var abs = v.segs.map(function (s) { return [s[0] + x, s[1] + y, s[2] + x, s[3] + y]; });
          if (conflictsSegs(abs, placed)) continue;
          var bad = false;
          for (var ci = 0; ci < chain.length && !bad; ci++) {
            if (chain[ci] === p) continue;
            var sa = solvedAbs[chain[ci].id];
            for (var a = 0; a < abs.length && !bad; a++)
              for (var b = 0; b < sa.length; b++)
                if (G.segmentsConflict(abs[a], sa[b])) { bad = true; break; }
          }
          if (bad) continue;
          setRot(p, rot); p.x = x; p.y = y;
          found = true;
        }
        if (!found) ok = false; else placed.push(p);
      }
      if (ok && !evaluate(level).win) return true;
    }
    return false;
  }

  /** Movimentos mínimos: 1 arraste + 1 (toques de giro seguidos contam como um só) por peça da solução. */
  function minMovesOf(level, solvedPose) {
    var total = 0;
    level.pieces.forEach(function (p) {
      if (p.role !== "chain") return;
      total += 1 + (level.params.rotate && tapsBetween(p.base, p.rot, solvedPose[p.id].rot) > 0 ? 1 : 0);
    });
    return total;
  }

  /* ====================================================================
     MODO PADRÃO (vista de cima)
     ==================================================================== */

  /** Monta a cadeia de peças que liga o trilho inicial ao portal (RF04). */
  function chainStd(P, rng, rail, E, Gp) {
    var pieces = [rail], tip = { x: E.x, y: E.y };
    var d0 = Math.hypot(tip.x - Gp.x, tip.y - Gp.y);
    for (var i = 0; i < P.chain; i++) {
      var remaining = P.chain - i, ideal = d0 * (remaining - 1) / P.chain, cands = [];
      for (var si = 0; si < PP.POOL_STD.length; si++) {
        var shape = PP.POOL_STD[si];
        for (var rot = 0; rot < (P.rotate ? 4 : 1); rot++) {
          var v = variant(shape.segs, rot), nodes = nodesOf(v.segs);
          for (var ai = 0; ai < nodes.length; ai++) {
            var x = tip.x - nodes[ai].x, y = tip.y - nodes[ai].y;
            if (x < 0 || y < 0 || x + v.w > GRID || y + v.h > GRID) continue;
            var abs = v.segs.map(function (s) { return [s[0] + x, s[1] + y, s[2] + x, s[3] + y]; });
            if (conflictsSegs(abs, pieces)) continue;
            for (var bi = 0; bi < nodes.length; bi++) {
              if (bi === ai) continue;
              var nx = x + nodes[bi].x, ny = y + nodes[bi].y;
              var dd = Math.hypot(nx - Gp.x, ny - Gp.y), w;
              if (remaining === 1) { if (dd > 0) continue; w = 1; }
              else { if (dd > 3.4 * (remaining - 1)) continue; w = Math.exp(-sq((dd - ideal) / 1.6)) + 0.001; }
              cands.push({ shape: shape, rot: rot, x: x, y: y, nx: nx, ny: ny, w: w });
            }
          }
        }
      }
      if (!cands.length) return null;
      var c = pickWeighted(rng, cands);
      pieces.push(makePiece(pieces.length, c.shape, c.rot, c.x, c.y, { role: "chain" }));
      tip = { x: c.nx, y: c.ny };
    }
    return pieces;
  }

  function genStd(P, rng) {
    var S = { x: 5, y: 5 }, d = rng.pick(DIRS);
    var rail = makePiece(0, { name: "trilho", segs: [[0, 0, Math.abs(d[0]), Math.abs(d[1])]] }, 0,
                         Math.min(5, 5 + d[0]), Math.min(5, 5 + d[1]), { fixed: true, role: "rail" });
    var E = { x: 5 + d[0], y: 5 + d[1] };

    var cands = [], x, y;
    for (x = 0; x <= GRID; x++) for (y = 0; y <= GRID; y++) {
      if ((x === 0 || x === GRID || y === 0 || y === GRID) && Math.hypot(x - S.x, y - S.y) >= P.goalMin) cands.push({ x: x, y: y });
    }
    var Gp = rng.pick(cands.length ? cands : [{ x: 0, y: 0 }, { x: GRID, y: 0 }, { x: 0, y: GRID }, { x: GRID, y: GRID }]);

    var pieces = null;
    for (var att = 0; att < 60 && !pieces; att++) pieces = chainStd(P, rng, rail, E, Gp);
    if (!pieces) return null;
    addDecoys(pieces, P.decoys, rng, PP.POOL_STD, P.rotate);

    var level = { kind: "std", pieces: pieces, start: S, goal: Gp, coins: [], enemies: [], params: P };
    var sol = PP.Path.solve(level);
    if (sol.status !== "win") return null;

    // Moedas ficam em vértices da rota de solução; inimigos, em vértices fora dela
    var routeKeys = {};
    sol.route.forEach(function (r) { routeKeys[r[0] + "," + r[1]] = true; });
    var interior = sol.route.slice(2, sol.route.length - 1), uniq = {}, free = [];
    interior.forEach(function (r) { var k = r[0] + "," + r[1]; if (!uniq[k]) { uniq[k] = true; free.push(r); } });
    var nCoins = Math.min(P.coins, free.length);
    for (var c = 0; c < nCoins; c++) {
      var idx = Math.floor((c + 0.5) * free.length / nCoins), r = free[idx];
      level.coins.push({ x: r[0], y: r[1] });
    }
    var nodePool = [], seenN = {};
    pieces.forEach(function (p) {
      nodesOf(absSegs(p)).forEach(function (n) {
        var k = n.x + "," + n.y;
        if (seenN[k] || routeKeys[k] || Math.hypot(n.x - S.x, n.y - S.y) < 1.5) return;
        seenN[k] = true; nodePool.push(n);
      });
    });
    rng.shuffle(nodePool);
    level.enemies = nodePool.slice(0, P.enemies).map(function (n) { return { x: n.x, y: n.y }; });

    if (PP.Path.solve(level).status !== "win") return null;
    return level;
  }

  /* ====================================================================
     MODO GRAVITACIONAL (vista lateral)
     ==================================================================== */

  function simSpec(level, pieces) {
    var segs = [];
    pieces.forEach(function (p) { absSegsId(p).forEach(function (s) { segs.push(s); }); });
    return { segs: segs, start: level.ball, goal: level.goal, coins: level.coins, enemies: level.enemies };
  }

  function simPieces(level, pieces) { return PP.Physics.simulate(simSpec(level, pieces)); }

  /** Último quadro em contato com alguma linha (de onde o personagem "decola"). */
  function lastSupport(res) {
    for (var i = res.frames.length - 1; i >= 0; i--) {
      var f = res.frames[i];
      if (f[4]) return { i: i, x: f[0], y: f[1], vx: f[2], vy: f[3] };
    }
    return null;
  }

  /** Posição x do voo livre quando ele chega à altura yC. */
  function flightX(info, yC) {
    var g = PP.Physics.G, disc = info.vy * info.vy + 2 * g * (yC - info.y);
    if (disc < 0) return null;
    var t = (-info.vy + Math.sqrt(disc)) / g;
    return Math.min(9.6, Math.max(0.4, info.x + info.vx * t));
  }

  function genGrav(P, rng) {
    var right = rng.chance(0.5);
    var rail = makePiece(0, { name: "trilho", segs: right ? [[0, 0, 1, 1]] : [[0, 1, 1, 0]] }, 0, 4.5, 4.5,
                         { fixed: true, role: "rail" });
    var level = {
      kind: "grav", pieces: [rail], start: { x: 5, y: 5 },
      ball: right ? { x: 5.17, y: 4.83 } : { x: 4.83, y: 4.83 },
      goal: null, coins: [], enemies: [], params: P
    };
    var pieces = [rail], res = simPieces(level, pieces), count = 0;

    // 1) cadeia de rampas/plataformas que leva a bolinha até embaixo
    for (var step = 0; step < P.chain; step++) {
      var info = lastSupport(res), placed = null;
      if (!info) break;
      for (var tr = 0; tr < 90 && !placed; tr++) {
        var shape = rng.pick(PP.POOL_GRAV_CHAIN), rot = P.rotate ? rng.int(4) : 0, v = variant(shape.segs, rot);
        var js = [];
        v.segs.forEach(function (s, i) { if (s[0] !== s[2]) js.push(i); });
        if (!js.length) continue;
        var sg = v.segs[rng.pick(js)], f = 0.2 + 0.6 * rng.next();
        var sx = sg[0] + (sg[2] - sg[0]) * f, sy = sg[1] + (sg[3] - sg[1]) * f;
        var yC = info.y + 0.6 + rng.next() * 2.2;
        if (yC > 9.0) continue;
        var xC = flightX(info, yC);
        if (xC === null) continue;
        var x = Math.round(xC - sx), y = Math.round(yC - sy);
        if (x < 0 || y < 0 || x + v.w > GRID || y + v.h > GRID) continue;
        var cand = makePiece(pieces.length, shape, rot, x, y, { role: "chain" });
        if (conflicts(cand, x, y, pieces)) continue;
        var r2 = simPieces(level, pieces.concat([cand]));
        if (r2.status !== "fell" || !r2.touched[cand.id]) continue;
        var ni = lastSupport(r2);
        if (!ni || ni.y < info.y + 0.5) continue;
        placed = { piece: cand, res: r2, info: ni };
      }
      if (!placed) break;
      pieces.push(placed.piece); res = placed.res; count++;
      if (placed.info.y > 8.2) break;
    }
    if (count < Math.min(2, P.chain)) return null;

    // 2) o portal fica no chão, onde a bolinha cai
    var xf = null;
    for (var i = res.frames.length - 1; i >= 0; i--) if (res.frames[i][1] <= 10) { xf = res.frames[i][0]; break; }
    if (xf === null) return null;
    var gx = Math.min(9.5, Math.max(0.5, Math.round(xf * 2) / 2)), won = null;
    [0, 0.5, -0.5].some(function (dx) {
      level.goal = { x: Math.min(9.5, Math.max(0.5, gx + dx)), y: 10 };
      won = simPieces(level, pieces);
      return won.status === "win";
    });
    if (won.status !== "win") return null;
    if (simPieces(level, [rail]).status === "win") return null;          // fase trivial

    // 3) moedas sobre a trajetória; inimigos longe dela
    var fr = won.frames, cum = [0];
    for (i = 1; i < fr.length; i++) cum.push(cum[i - 1] + Math.hypot(fr[i][0] - fr[i - 1][0], fr[i][1] - fr[i - 1][1]));
    var total = cum[cum.length - 1];
    for (var c = 0; c < P.coins; c++) {
      var target = total * (0.18 + 0.7 * (c + 0.5) / P.coins);
      for (i = 0; i < fr.length && cum[i] < target; i++) { /* avança */ }
      var q = fr[Math.min(i, fr.length - 1)];
      var okc = q[1] < 9.2 && q[1] > 3.5 && Math.hypot(q[0] - level.goal.x, q[1] - level.goal.y) > 1.2 &&
                level.coins.every(function (o) { return Math.hypot(o.x - q[0], o.y - q[1]) > 1.0; });
      if (okc) level.coins.push({ x: Math.round(q[0] * 100) / 100, y: Math.round(q[1] * 100) / 100 });
    }
    for (var e = 0; e < P.enemies; e++) {
      for (var t2 = 0; t2 < 100; t2++) {
        var ex = 0.7 + rng.next() * 8.6, ey = 2.5 + rng.next() * 6.5;
        var far = fr.every(function (f) { return Math.hypot(f[0] - ex, f[1] - ey) > 1.25; });
        if (far && Math.hypot(ex - level.goal.x, ey - level.goal.y) > 1.5 &&
            Math.hypot(ex - 5, ey - 5) > 1.5 &&
            level.enemies.every(function (o) { return Math.hypot(o.x - ex, o.y - ey) > 1.5; })) {
          level.enemies.push({ x: Math.round(ex * 100) / 100, y: Math.round(ey * 100) / 100 });
          break;
        }
      }
    }
    if (simPieces(level, pieces).status !== "win") return null;

    // 4) iscas que não mudam o resultado
    for (var dcount = 0; dcount < P.decoys; dcount++) {
      for (var t3 = 0; t3 < 30; t3++) {
        var before = pieces.length;
        addDecoys(pieces, 1, rng, PP.POOL_GRAV_ALL, P.rotate);
        if (pieces.length === before) continue;
        if (simPieces(level, pieces).status === "win") break;
        pieces.pop();
      }
    }
    level.pieces = pieces;
    if (evaluate(level).status !== "win") return null;
    return level;
  }

  /* ====================================================================
     API PÚBLICA
     ==================================================================== */

  /** Resolve a fase no arranjo atual: { win, status, ... } (usado no gerador e nos testes). */
  function evaluate(level) {
    if (level.kind === "std") {
      var r = PP.Path.solve(level);
      return { win: r.status === "win", status: r.status, plan: r };
    }
    var s = PP.Physics.simulate(simSpec(level, level.pieces));
    return { win: s.status === "win", status: s.status, sim: s };
  }

  /**
   * Cria uma fase.
   * spec = { kind: "std"|"grav", diff, n (1..10), seed?, overrides? }
   * Retorna { kind, pieces, start, goal, coins, enemies, solved, initial, minMoves, maxMoves, timeLimit, seed, params }
   */
  function generate(spec) {
    var P = PP.levelParams(spec.kind, spec.diff, spec.n);
    if (spec.overrides) for (var k in spec.overrides) P[k] = spec.overrides[k];
    var seed = spec.seed === undefined || spec.seed === null ? (Math.random() * 4294967296) >>> 0 : spec.seed >>> 0;
    var rng = PP.Rng(seed), level = null;

    for (var attempt = 0; attempt < 80 && !level; attempt++) {
      // Se a fase está apertada demais, vai simplificando (menos iscas, cadeia menor)
      var P2 = Object.assign({}, P);
      P2.decoys = Math.max(0, P.decoys - Math.floor(attempt / 4));
      P2.chain = Math.max(2, P.chain - Math.floor(attempt / 10));
      var lv = spec.kind === "std" ? genStd(P2, rng) : genGrav(P2, rng);
      if (!lv) continue;
      lv.params = P2;
      var solvedPose = {};
      lv.pieces.forEach(function (p) { solvedPose[p.id] = { x: p.x, y: p.y, rot: p.rot }; });
      lv.solved = snapshot(lv);
      if (!evaluate(lv).win) continue;
      if (!scramble(lv, P2, rng)) continue;
      lv.minMoves = minMovesOf(lv, solvedPose);
      lv.maxMoves = P.slack === Infinity ? Infinity : lv.minMoves + P.slack;
      lv.timeLimit = P.time;
      lv.initial = snapshot(lv);
      lv.seed = seed;
      level = lv;
    }
    if (!level) throw new Error("Não foi possível gerar a fase (" + spec.kind + "/" + spec.diff + "/" + spec.n + ")");
    return level;
  }

  return {
    generate: generate, evaluate: evaluate, snapshot: snapshot, restore: restore,
    absSegs: absSegs, conflicts: conflicts, conflictsSegs: conflictsSegs, fits: fits,
    setRot: setRot, variant: variant, tapsBetween: tapsBetween, nodesOf: nodesOf, simSpec: simSpec
  };
})();
