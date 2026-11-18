/* ==========================================================================
   pathfinding.js - modo padrão: conectividade e busca de caminho (RF04, RG06, RG07)
   --------------------------------------------------------------------------
   Cada peça é dividida em passos unitários entre vértices da grade (0..10).
   Duas peças estão conectadas quando compartilham um vértice (pontas que
   coincidem ou ponta encostando no meio de outra linha). Cruzar no meio é
   proibido (ver Geo.segmentsConflict), então todo contato é um vértice.

   O herói parte do centro e usa Dijkstra sobre o estado (vértice, moedas
   coletadas): acha o MENOR trajeto que passa por todas as moedas, evita
   inimigos e chega ao portal.
   ========================================================================== */
PP.Path = (function () {
  "use strict";

  var N = PP.CONFIG.GRID + 1;           // vértices por lado (11)
  var BIG = 1000;                       // custo de passar por inimigo na rota de "falha"

  function id(x, y) { return y * N + x; }
  function px(n) { return n % N; }
  function py(n) { return Math.floor(n / N); }

  /** Lista de adjacência { nó: [[vizinho, custo], ...] } a partir das peças. */
  function buildGraph(pieces) {
    var adj = [], i;
    for (i = 0; i < N * N; i++) adj.push([]);
    pieces.forEach(function (p) {
      PP.Level.absSegs(p).forEach(function (s) {
        var dx = s[2] - s[0], dy = s[3] - s[1];
        var steps = PP.Geo.gcd(Math.abs(dx), Math.abs(dy));
        if (!steps || s[0] !== Math.round(s[0]) || s[1] !== Math.round(s[1])) return;
        var sx = dx / steps, sy = dy / steps, w = Math.hypot(sx, sy);
        for (var k = 0; k < steps; k++) {
          var a = id(s[0] + sx * k, s[1] + sy * k), b = id(s[0] + sx * (k + 1), s[1] + sy * (k + 1));
          adj[a].push([b, w]);
          adj[b].push([a, w]);
        }
      });
    });
    return adj;
  }

  /** Fila de prioridade mínima (heap binário) de pares [prioridade, valor]. */
  function Heap() {
    var h = [];
    return {
      size: function () { return h.length; },
      push: function (item) {
        h.push(item);
        var i = h.length - 1;
        while (i > 0) {
          var p = (i - 1) >> 1;
          if (h[p][0] <= h[i][0]) break;
          var t = h[p]; h[p] = h[i]; h[i] = t; i = p;
        }
      },
      pop: function () {
        var top = h[0], last = h.pop();
        if (h.length) {
          h[0] = last;
          var i = 0;
          for (;;) {
            var l = 2 * i + 1, r = l + 1, m = i;
            if (l < h.length && h[l][0] < h[m][0]) m = l;
            if (r < h.length && h[r][0] < h[m][0]) m = r;
            if (m === i) break;
            var t = h[m]; h[m] = h[i]; h[i] = t; i = m;
          }
        }
        return top;
      }
    };
  }

  /** Nós alcançáveis a partir do início (ignora inimigos). Usado para destacar peças conectadas. */
  function reachable(pieces, start) {
    var adj = buildGraph(pieces), seen = {}, stack = [id(start.x, start.y)];
    seen[stack[0]] = true;
    while (stack.length) {
      var u = stack.pop();
      adj[u].forEach(function (e) { if (!seen[e[0]]) { seen[e[0]] = true; stack.push(e[0]); } });
    }
    return seen;
  }

  /** Quais peças tocam a rede conectada ao início? Retorna { idDaPeça: true }. */
  function connectedPieces(pieces, start) {
    var seen = reachable(pieces, start), out = {};
    pieces.forEach(function (p) {
      PP.Level.absSegs(p).some(function (s) {
        var steps = PP.Geo.gcd(Math.abs(s[2] - s[0]), Math.abs(s[3] - s[1]));
        for (var k = 0; k <= steps; k++) {
          var x = s[0] + (s[2] - s[0]) / steps * k, y = s[1] + (s[3] - s[1]) / steps * k;
          if (x === Math.round(x) && y === Math.round(y) && seen[id(x, y)]) {
            out[p.id] = true; return true;
          }
        }
        return false;
      });
    });
    return out;
  }

  /** O portal está ligado ao personagem (ignorando moedas e inimigos)? */
  function goalConnected(pieces, start, goal) {
    return !!reachable(pieces, start)[id(goal.x, goal.y)];
  }

  /**
   * Calcula o percurso do herói para a fase `level` no arranjo atual.
   * Retorna { status, route: [[x,y]...], coinAt: { índiceDaRota: índiceDaMoeda } }
   * status: "win" | "deadend" | "enemy" | "coins"
   */
  function solve(level) {
    var adj = buildGraph(level.pieces);
    var S = id(level.start.x, level.start.y), T = id(level.goal.x, level.goal.y);
    var blocked = {}, coinBit = {}, i;
    level.enemies.forEach(function (e) { blocked[id(e.x, e.y)] = true; });
    level.coins.forEach(function (c, k) { coinBit[id(c.x, c.y)] = 1 << k; });
    var full = (1 << level.coins.length) - 1;

    // 1) Busca o menor caminho que coleta todas as moedas e evita inimigos
    var dist = {}, prev = {}, heap = Heap();
    var s0 = (S << 8) | (coinBit[S] || 0);
    dist[s0] = 0; heap.push([0, s0]);
    var found = -1;
    while (heap.size()) {
      var cur = heap.pop(), st = cur[1], d = cur[0];
      if (d > dist[st]) continue;
      var u = st >> 8, mask = st & 255;
      if (u === T && mask === full) { found = st; break; }
      var edges = adj[u];
      for (i = 0; i < edges.length; i++) {
        var v = edges[i][0];
        if (blocked[v]) continue;
        var ns = (v << 8) | (mask | (coinBit[v] || 0)), nd = d + edges[i][1];
        if (dist[ns] === undefined || nd < dist[ns]) { dist[ns] = nd; prev[ns] = st; heap.push([nd, ns]); }
      }
    }
    if (found >= 0) {
      var nodes = [];
      for (var s = found; s !== undefined; s = prev[s]) nodes.push(s >> 8);
      nodes.reverse();
      return finish("win", nodes, coinBit, level);
    }

    // 2) Sem solução: o herói percorre a rota acessível até o ponto mais próximo do portal
    var d2 = {}, p2 = {}, h2 = Heap();
    d2[S] = 0; h2.push([0, S]);
    while (h2.size()) {
      var c2 = h2.pop(), u2 = c2[1];
      if (c2[0] > d2[u2]) continue;
      var e2 = adj[u2];
      for (i = 0; i < e2.length; i++) {
        var v2 = e2[i][0], nd2 = c2[0] + e2[i][1] + (blocked[v2] ? BIG : 0);
        if (d2[v2] === undefined || nd2 < d2[v2]) { d2[v2] = nd2; p2[v2] = u2; h2.push([nd2, v2]); }
      }
    }
    var best = S, bestD = Infinity, bestCost = Infinity;
    Object.keys(d2).forEach(function (k) {
      k = +k;
      var dd = Math.hypot(px(k) - level.goal.x, py(k) - level.goal.y);
      if (dd < bestD - 1e-9 || (Math.abs(dd - bestD) < 1e-9 && d2[k] < bestCost)) { best = k; bestD = dd; bestCost = d2[k]; }
    });
    var route = [];
    for (var q = best; q !== undefined; q = p2[q]) route.push(q);
    route.reverse();

    var status = best === T ? "coins" : "deadend";
    for (i = 0; i < route.length; i++) {
      if (blocked[route[i]]) { route = route.slice(0, i + 1); status = "enemy"; break; }
    }
    return finish(status, route, coinBit, level);
  }

  /** Converte nós em coordenadas e marca em que passo cada moeda é coletada. */
  function finish(status, nodes, coinBit, level) {
    var route = nodes.map(function (n) { return [px(n), py(n)]; });
    var coinAt = {}, seen = {};
    level.coins.forEach(function (c, k) {
      for (var i = 0; i < route.length; i++) {
        if (route[i][0] === c.x && route[i][1] === c.y && !seen[k]) { coinAt[i] = k; seen[k] = true; break; }
      }
    });
    return { status: status, route: route, coinAt: coinAt };
  }

  return { solve: solve, buildGraph: buildGraph, reachable: reachable, connectedPieces: connectedPieces, goalConnected: goalConnected, id: id };
})();
