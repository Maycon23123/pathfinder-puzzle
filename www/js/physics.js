/* ==========================================================================
   physics.js - Modo Gravitacional (RF20, RF21)
   --------------------------------------------------------------------------
   Vista lateral: a gravidade puxa o personagem para baixo e as linhas viram
   rampas, plataformas e paredes. O personagem é uma bolinha com massa, atrito
   e aceleração. A simulação é determinística (passo fixo): o gerador de fases
   usa a MESMA função para provar que cada fase tem solução (RF04) e o jogo a
   usa para animar o percurso.

   Unidades: "casas" do tabuleiro (0..10) e segundos.
   ========================================================================== */
PP.Physics = (function () {
  "use strict";

  var R = 0.22;               // raio da bolinha
  var G = 12;                 // gravidade (casas/s²)
  var DT = 1 / 240;           // passo de simulação
  var SUB = 4;                // grava 1 quadro a cada 4 passos (60 quadros/s)
  var MAX_T = 14;             // tempo máximo de uma tentativa (s)
  var MU = 0.08;              // atrito de deslizamento
  var ROLL = 0.5;             // resistência de rolamento constante (casas/s²)
  var DRAG = 0.8;             // resistência proporcional à velocidade (1/s)
  var FALL_Y = 10.9;          // abaixo disto o personagem "caiu no vazio"
  var COIN_R = 0.5, ENEMY_R = 0.2, GOAL_R = 0.55;

  /** Paredes laterais do tabuleiro (id -1: não contam como peça). */
  var WALLS = [[0, -30, 0, 30, -1], [10, -30, 10, 30, -1]];

  /**
   * spec = { segs: [[x1,y1,x2,y2,idDaPeça]...], start:{x,y}, goal:{x,y}|null,
   *          coins:[{x,y}], enemies:[{x,y}] }
   * Retorna { frames:[[x,y,vx,vy,contato]...], status, got:[bool], coinFrame:{i:quadro},
   *           touched:{idPeça:1}, gotCount }
   * status: "win" | "coins" (chegou ao portal sem todas as moedas) | "enemy" | "fell" | "stuck" | "timeout"
   */
  function simulate(spec) {
    var segs = spec.segs.concat(WALLS);
    var coins = spec.coins || [], enemies = spec.enemies || [], goal = spec.goal;
    var x = spec.start.x, y = spec.start.y, vx = 0, vy = 0;
    var got = [], gotCount = 0, coinFrame = {}, touched = {};
    var i, k;
    for (k = 0; k < coins.length; k++) got.push(false);

    var frames = [[x, y, 0, 0, 0]];
    var status = "timeout", still = 0;
    var maxN = Math.floor(MAX_T / DT);

    for (var n = 1; n <= maxN; n++) {
      vy += G * DT;
      x += vx * DT;
      y += vy * DT;

      var contact = 0;
      for (var it = 0; it < 2; it++) {
        for (i = 0; i < segs.length; i++) {
          var s = segs[i];
          var ex = s[2] - s[0], ey = s[3] - s[1], l2 = ex * ex + ey * ey;
          var t = l2 === 0 ? 0 : ((x - s[0]) * ex + (y - s[1]) * ey) / l2;
          t = t < 0 ? 0 : (t > 1 ? 1 : t);
          var qx = s[0] + ex * t, qy = s[1] + ey * t;
          var dx = x - qx, dy = y - qy, d2 = dx * dx + dy * dy;
          if (d2 >= R * R) continue;

          var d = Math.sqrt(d2), nx, ny;
          if (d < 1e-9) { nx = 0; ny = -1; } else { nx = dx / d; ny = dy / d; }
          x = qx + nx * R;
          y = qy + ny * R;

          var vn = vx * nx + vy * ny;
          if (vn < 0) {
            var e = vn < -2.5 ? 0.12 : 0;               // quica só em impactos fortes
            var tx = -ny, ty = nx;
            var vt = vx * tx + vy * ty;
            var dec = MU * (-vn) * (1 + e) + (ROLL + DRAG * Math.abs(vt)) * DT;
            if (Math.abs(vt) <= dec) vt = 0; else vt -= (vt > 0 ? 1 : -1) * dec;
            var vnn = -e * vn;
            vx = vnn * nx + vt * tx;
            vy = vnn * ny + vt * ty;
          }
          contact = 1;
          if (s[4] >= 0) touched[s[4]] = 1;
        }
      }

      for (k = 0; k < coins.length; k++) {
        if (!got[k] && Math.hypot(x - coins[k].x, y - coins[k].y) < COIN_R) {
          got[k] = true; gotCount++; coinFrame[k] = frames.length;
        }
      }
      var end = null;
      for (k = 0; k < enemies.length; k++) {
        if (Math.hypot(x - enemies[k].x, y - enemies[k].y) < R + ENEMY_R) { end = "enemy"; break; }
      }
      if (!end && goal && Math.hypot(x - goal.x, y - goal.y) < GOAL_R) {
        end = gotCount === coins.length ? "win" : "coins";
      }
      if (!end && y > FALL_Y) end = "fell";
      if (!end) {
        if (contact && Math.hypot(vx, vy) < 0.08) { still += DT; if (still > 0.6) end = "stuck"; }
        else still = 0;
      }
      if (end) { status = end; frames.push([x, y, vx, vy, contact]); break; }
      if (n % SUB === 0) frames.push([x, y, vx, vy, contact]);
    }
    return { frames: frames, status: status, got: got, coinFrame: coinFrame, touched: touched, gotCount: gotCount };
  }

  return { simulate: simulate, R: R, G: G, FALL_Y: FALL_Y };
})();
