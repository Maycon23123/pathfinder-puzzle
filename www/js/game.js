/* ==========================================================================
   game.js - tela de jogo: planejar, confirmar, executar e mostrar o resultado
   --------------------------------------------------------------------------
   FASES DE UMA TENTATIVA
     "edit" - planejamento: as peças podem ser arrastadas/giradas (RF06 a RF14)
     (modal "Confirmar caminho?" ao tocar em Iniciar)
     "run"  - execução: peças travadas (RG05); o herói anda sozinho (RF16/RF17)
     "over" - fim da tentativa: vitória ou derrota (RF18)

   SESSÕES
     campaign - fase numerada de um modo (Padrão ou Gravitacional) e dificuldade
     speed    - SpeedRun: 5 puzzles fixos, o relógio só sobe (RN09)
     skill    - Skill Check: puzzle rápido acionado por um evento do MOBA (RF24)
   ========================================================================== */
PP.Game = (function () {
  "use strict";

  var C = PP.CONFIG;
  var L = PP.Level;

  /* ---------- Estado ---------- */
  var canvas, ctx, res = 1;
  var el = {};                       // elementos do HTML
  var session = null;                // veja "SESSÕES" acima
  var level = null;                  // fase atual (level.js)
  var phase = "edit";
  var undoStack = [], redoStack = [];
  var limit = 0, timeLeft = 0;       // tempo de planejamento (0 = sem limite)
  var planUsed = 0;                  // segundos gastos planejando nesta fase
  var drag = null;                   // { piece, offX, offY, from, startPt, moved }
  var run = null;                    // animação do percurso
  var collected = [];                // moedas já coletadas na animação
  var connected = {};                // peças ligadas ao personagem (modo padrão)
  var charPos = { x: 5, y: 5 };
  var raf = null, lastTs = 0;
  var modalOpen = false;
  var timers = [];                   // timeouts pendentes (limpos ao sair)
  var autoTimer = null;

  /** Rivais simulados do ranking do SpeedRun (segundos para os 5 puzzles). */
  var RIVALS = {
    easy:   [["Ana", 95], ["Bruno", 130], ["Carla", 175], ["Diego", 230]],
    medium: [["Ana", 130], ["Bruno", 180], ["Carla", 240], ["Diego", 320]],
    hard:   [["Ana", 190], ["Bruno", 260], ["Carla", 340], ["Diego", 440]]
  };

  function px(v) { return C.PAD + v * C.CELL; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; clearTimeout(autoTimer); autoTimer = null; }

  /** Formata segundos como m:ss. */
  function format(seconds) {
    var s = Math.max(0, Math.ceil(seconds));
    return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
  }

  /* ======================================================================
     DESENHO
     ====================================================================== */

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBoardBackground(kind) {
    var s = C.BOARD_SIZE;
    roundedRect(2, 2, s - 4, s - 4, 40);
    if (kind === "grav") {
      var g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, "#161d57"); g.addColorStop(1, "#0b0f33");
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = "#121a4b";
    }
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#4a5fd0";
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(120, 140, 255, 0.13)";
    ctx.beginPath();
    for (var i = 0; i <= C.GRID; i++) {
      ctx.moveTo(px(i), px(0)); ctx.lineTo(px(i), px(C.GRID));
      ctx.moveTo(px(0), px(i)); ctx.lineTo(px(C.GRID), px(i));
    }
    ctx.stroke();

    if (kind === "grav") {
      // paredes laterais e "abismo" embaixo
      ctx.strokeStyle = "rgba(150, 170, 255, .55)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(px(0), px(0)); ctx.lineTo(px(0), px(C.GRID) + 10);
      ctx.moveTo(px(C.GRID), px(0)); ctx.lineTo(px(C.GRID), px(C.GRID) + 10);
      ctx.stroke();
      var ab = ctx.createLinearGradient(0, px(C.GRID), 0, s);
      ab.addColorStop(0, "rgba(255, 77, 77, 0)"); ab.addColorStop(1, "rgba(255, 77, 77, .28)");
      ctx.fillStyle = ab;
      ctx.fillRect(px(0), px(C.GRID) + 4, px(C.GRID) - px(0), s - px(C.GRID) - 14);
      // seta de gravidade
      ctx.strokeStyle = "rgba(185, 192, 245, .75)"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s - 36, 62); ctx.lineTo(s - 36, 100);
      ctx.moveTo(s - 47, 90); ctx.lineTo(s - 36, 101); ctx.lineTo(s - 25, 90);
      ctx.stroke();
      ctx.fillStyle = "rgba(185, 192, 245, .75)"; ctx.font = "600 18px Poppins, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("g", s - 36, 54);
    }
  }

  function drawPortal(pt) {
    var x = px(pt.x), y = px(pt.y);
    ctx.save();
    ctx.shadowColor = "#5eead4";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#5eead4";
    ctx.beginPath(); ctx.arc(x, y, 21, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#5a86cf";
    ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.5)";
    ctx.lineWidth = 1.6;
    [12, 8, 4].forEach(function (r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); });
  }

  function drawCoin(pt) {
    var x = px(pt.x), y = px(pt.y);
    ctx.save();
    ctx.shadowColor = "rgba(255, 210, 63, .8)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#7f8590";
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.stroke();
  }

  function drawEnemy(pt) {
    var x = px(pt.x), y = px(pt.y);
    ctx.save();
    ctx.shadowColor = "rgba(255, 77, 77, .8)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = (getComputedStyle(document.body).getPropertyValue("--bad") || "#ff4d4d").trim();
    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#7f8590"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath(); ctx.arc(x - 5, y - 3, 2.2, 0, Math.PI * 2); ctx.arc(x + 5, y - 3, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1a1a2e"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(x, y + 8, 6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }

  function drawCharacter(pt, kind) {
    var x = px(pt.x), y = px(pt.y), r = kind === "grav" ? PP.Physics.R * C.CELL : 21;
    ctx.save();
    ctx.shadowColor = "rgba(34, 214, 238, .6)"; ctx.shadowBlur = 10;
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.55)";                 // brilho
    ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, Math.PI * 2); ctx.fill();
  }

  function drawPiece(piece) {
    var dragging = drag && drag.piece === piece && drag.moved;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = piece.fixed ? 6 : 4.5;
    if (piece.fixed) ctx.strokeStyle = "#4ea1ff";                 // trilho inicial (fixo): azul
    else if (dragging) ctx.strokeStyle = "#7df3ff";
    else if (connected[piece.id]) ctx.strokeStyle = "#b6f7ff";    // ligada ao personagem
    else ctx.strokeStyle = phase === "edit" ? "#fff" : "rgba(255,255,255,.6)";
    if (dragging) { ctx.shadowColor = "#22d6ee"; ctx.shadowBlur = 14; }
    ctx.beginPath();
    piece.segs.forEach(function (s) {
      ctx.moveTo(px(s[0] + piece.x), px(s[1] + piece.y));
      ctx.lineTo(px(s[2] + piece.x), px(s[3] + piece.y));
    });
    ctx.stroke();
    ctx.restore();
  }

  function drawTrail() {
    if (!run) return;
    ctx.save();
    ctx.strokeStyle = "rgba(94, 234, 212, .75)";
    ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    var pts = run.trail;
    for (var i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(px(pts[i][0]), px(pts[i][1])); else ctx.lineTo(px(pts[i][0]), px(pts[i][1]));
    }
    ctx.lineTo(px(charPos.x), px(charPos.y));
    ctx.stroke();
    ctx.restore();
  }

  /** Redesenha o tabuleiro inteiro. */
  function render() {
    if (!ctx || !level) return;
    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.clearRect(0, 0, C.BOARD_SIZE, C.BOARD_SIZE);
    drawBoardBackground(level.kind);
    drawPortal(level.goal);
    level.coins.forEach(function (c, i) { if (!collected[i]) drawCoin(c); });
    level.enemies.forEach(drawEnemy);
    level.pieces.forEach(drawPiece);
    drawTrail();
    drawCharacter(charPos, level.kind);
  }

  /* ======================================================================
     ENTRADA (mouse e toque usam os mesmos Pointer Events - RF26)
     ====================================================================== */

  function toBoard(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * C.BOARD_SIZE / r.width, y: (e.clientY - r.top) * C.BOARD_SIZE / r.height };
  }

  /** Acha a peça móvel mais próxima do ponto (dentro do raio de captura). */
  function pickPiece(p) {
    var best = null, bestDist = C.GRAB_RADIUS;
    level.pieces.forEach(function (piece) {
      if (piece.fixed) return;                                  // RF10: trilho fixo não se move
      L.absSegs(piece).forEach(function (s) {
        var d = PP.Geo.distToSegment(p.x, p.y, px(s[0]), px(s[1]), px(s[2]), px(s[3]));
        if (d < bestDist) { bestDist = d; best = piece; }
      });
    });
    return best;
  }

  function pose(piece) { return { x: piece.x, y: piece.y, rot: piece.rot }; }
  function samePose(a, b) { return a.x === b.x && a.y === b.y && a.rot === b.rot; }

  function onPointerDown(e) {
    if (phase !== "edit" || modalOpen) return;                  // RG05: travado na execução
    var p = toBoard(e), piece = pickPiece(p);
    if (!piece) return;
    drag = { piece: piece, offX: p.x - px(piece.x), offY: p.y - px(piece.y), from: pose(piece), startPt: p, moved: false };
    canvas.setPointerCapture(e.pointerId);
    render();
  }

  function onPointerMove(e) {
    if (!drag) return;
    var p = toBoard(e), piece = drag.piece;
    if (!drag.moved) {
      if (Math.hypot(p.x - drag.startPt.x, p.y - drag.startPt.y) < C.TAP_SLOP) return;
      drag.moved = true;
    }
    // A peça acompanha o dedo, mas fica presa dentro do tabuleiro (RF07, RF08)
    piece.x = clamp((p.x - drag.offX - C.PAD) / C.CELL, 0, C.GRID - piece.w);
    piece.y = clamp((p.y - drag.offY - C.PAD) / C.CELL, 0, C.GRID - piece.h);
    refreshConnections();
    render();
  }

  function onPointerUp() {
    if (!drag) return;
    var d = drag, piece = d.piece;
    drag = null;

    if (!d.moved) {                                             // só um toque
      if (level.params.rotate) tryRotate(piece); else render();
      return;
    }
    // Encaixa na grade (RF12)
    var nx = clamp(Math.round(piece.x), 0, C.GRID - piece.w);
    var ny = clamp(Math.round(piece.y), 0, C.GRID - piece.h);
    if (L.conflicts(piece, nx, ny, level.pieces)) {
      // RF09: não pode cruzar nem sobrepor outra peça -> volta ao lugar anterior
      piece.x = d.from.x; piece.y = d.from.y;
      PP.Sfx.bad();
      PP.toast("As linhas não podem se cruzar");
    } else {
      piece.x = nx; piece.y = ny;
      if (!samePose(d.from, pose(piece))) { PP.Sfx.drop(); commit(piece, d.from, pose(piece), false); return; }
    }
    refreshConnections();
    render();
  }

  /** Gira a peça 90° (RF14). Tenta ancorar no canto; se bater, tenta centralizar. */
  function tryRotate(piece) {
    var from = pose(piece), rot = (piece.rot + 1) % 4, v = L.variant(piece.base, rot);
    var tries = [
      [piece.x, piece.y],
      [Math.floor(piece.x + (piece.w - v.w) / 2), Math.floor(piece.y + (piece.h - v.h) / 2)],
      [Math.ceil(piece.x + (piece.w - v.w) / 2), Math.ceil(piece.y + (piece.h - v.h) / 2)]
    ];
    for (var i = 0; i < tries.length; i++) {
      var x = clamp(tries[i][0], 0, C.GRID - v.w), y = clamp(tries[i][1], 0, C.GRID - v.h);
      var abs = v.segs.map(function (s) { return [s[0] + x, s[1] + y, s[2] + x, s[3] + y]; });
      if (L.conflictsSegs(abs, level.pieces, piece)) continue;
      L.setRot(piece, rot); piece.x = x; piece.y = y;
      PP.Sfx.rotate();
      commit(piece, from, pose(piece), true);
      return;
    }
    PP.Sfx.bad();
    PP.toast("Não há espaço para girar aqui");
    render();
  }

  /* ======================================================================
     HISTÓRICO (desfazer / refazer / restaurar - RF13)
     ====================================================================== */

  /** Registra uma ação. Toques de giro seguidos na mesma peça contam como um movimento só. */
  function commit(piece, from, to, isRot) {
    var last = undoStack[undoStack.length - 1];
    if (isRot && last && last.rot && last.id === piece.id) {
      last.to = to;
      if (samePose(last.from, last.to)) undoStack.pop();
    } else {
      undoStack.push({ id: piece.id, from: from, to: to, rot: isRot });
    }
    redoStack = [];
    afterAction();
  }

  function applyPose(id, p) {
    var piece = level.pieces[id];
    L.setRot(piece, p.rot); piece.x = p.x; piece.y = p.y;
  }

  function undo() {
    if (phase !== "edit" || modalOpen || !undoStack.length) return;
    var a = undoStack.pop(); redoStack.push(a);
    applyPose(a.id, a.from);
    clearTimeout(autoTimer);
    PP.Sfx.tap(); afterAction(true);
  }

  function redo() {
    if (phase !== "edit" || modalOpen || !redoStack.length) return;
    var a = redoStack.pop(); undoStack.push(a);
    applyPose(a.id, a.to);
    PP.Sfx.tap(); afterAction(true);
  }

  /** Volta ao arranjo original da fase (zera os movimentos). */
  function restoreOriginal(silent) {
    L.restore(level, level.initial);
    undoStack = []; redoStack = [];
    clearTimeout(autoTimer);
    if (!silent) PP.Sfx.tap();
    afterAction(true);
  }

  function afterAction(quiet) {
    refreshConnections();
    updateHud();
    render();
    // RG09: ao esgotar o limite de movimentos, a execução começa sozinha
    if (!quiet && level.maxMoves !== Infinity && undoStack.length >= level.maxMoves) {
      PP.toast("Movimentos esgotados! Iniciando...");
      clearTimeout(autoTimer);
      autoTimer = setTimeout(function () {
        if (phase === "edit" && !modalOpen && undoStack.length >= level.maxMoves) beginRun();
      }, 1400);
    }
  }

  /** Quais peças estão ligadas ao personagem (só no modo padrão). */
  function refreshConnections() {
    connected = level && level.kind === "std" ? PP.Path.connectedPieces(level.pieces, level.start) : {};
  }

  /* ======================================================================
     PAINEL (HUD), CRONÔMETRO E CICLO PRINCIPAL
     ====================================================================== */

  function coinsGot() { return collected.filter(Boolean).length; }

  function updateHud() {
    var used = undoStack.length, max = level.maxMoves;
    el.moves.textContent = "Mov " + used + "/" + (max === Infinity ? "∞" : max);
    el.moves.classList.toggle("warn", max !== Infinity && used >= max - 1);
    el.coins.textContent = level.coins.length ? "Moedas " + coinsGot() + "/" + level.coins.length : "Sem moedas";
    el.rotate.textContent = level.params.rotate ? "Giro ligado" : "Giro desligado";
    el.rotate.classList.toggle("on", !!level.params.rotate);
    el.undo.disabled = !undoStack.length || phase !== "edit";
    el.redo.disabled = !redoStack.length || phase !== "edit";
    el.reset.disabled = phase !== "edit" || !undoStack.length;
    el.action.disabled = phase !== "edit";
    el.action.textContent = phase === "edit" ? "Iniciar" : (phase === "run" ? "Executando..." : "Fim");
    el.action.classList.toggle("running", phase !== "edit");
  }

  function updateTimerLabel() {
    var showUp = session && session.type === "speed";
    el.timer.textContent = showUp ? format(session.elapsed) : (limit > 0 ? format(timeLeft) : "0:00");
    el.timerPill.classList.toggle("low", !showUp && limit > 0 && timeLeft <= 10);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.1, (now - lastTs) / 1000);
    lastTs = now;
    if (modalOpen || !level) return;

    if (session.type === "speed" && phase !== "over") session.elapsed += dt;
    if (phase === "edit") {
      planUsed += dt;
      if (limit > 0) {
        timeLeft -= dt;
        if (timeLeft <= 0) {                                    // RG09: tempo acabou -> executa
          timeLeft = 0; updateTimerLabel();
          PP.toast("Tempo de planejamento esgotado!");
          beginRun();
          return;
        }
      }
    } else if (phase === "run") {
      stepRun(dt);
    }
    updateTimerLabel();
  }

  /* ======================================================================
     EXECUÇÃO (RF16, RF17)
     ====================================================================== */

  /** Toca em "Iniciar": abre a tela de confirmação (depois da edição). */
  function requestStart() {
    if (phase !== "edit" || modalOpen) return;
    PP.Sfx.tap();
    var stats = [
      ["Movimentos", undoStack.length + (level.maxMoves === Infinity ? "" : " / " + level.maxMoves)]
    ];
    if (limit > 0) stats.push(["Tempo restante", format(timeLeft)]);
    var text = "Depois de confirmar, as linhas ficam travadas até o fim da tentativa e o personagem anda sozinho.";
    var warn = null;
    if (level.kind === "std" && !PP.Path.goalConnected(level.pieces, level.start, level.goal)) {
      warn = "Atenção: o portal ainda não está ligado ao personagem.";
    }
    showModal({
      title: "Confirmar caminho?", text: text, warn: warn, stats: stats,
      actions: [
        { label: "Confirmar e iniciar", kind: "primary", onClick: function () { closeModal(); beginRun(); } },
        { label: "Continuar editando", kind: "ghost", onClick: closeModal }
      ]
    });
  }

  function beginRun() {
    if (phase !== "edit") return;
    closeModal();
    clearTimeout(autoTimer);
    drag = null;
    phase = "run";
    PP.Sfx.start();
    collected = level.coins.map(function () { return false; });

    if (level.kind === "std") {
      var plan = PP.Path.solve(level), cum = [0];
      for (var i = 1; i < plan.route.length; i++) {
        cum.push(cum[i - 1] + Math.hypot(plan.route[i][0] - plan.route[i - 1][0], plan.route[i][1] - plan.route[i - 1][1]));
      }
      run = { type: "path", plan: plan, cum: cum, total: cum[cum.length - 1], s: 0, idx: 0, trail: [plan.route[0]], done: false };
    } else {
      var sim = PP.Physics.simulate(L.simSpec(level, level.pieces));
      run = { type: "sim", sim: sim, f: 0, trail: [[sim.frames[0][0], sim.frames[0][1]]], done: false };
    }
    refreshConnections();
    updateHud();
    render();
  }

  function stepRun(dt) {
    if (!run || run.done) return;
    if (run.type === "path") {
      var route = run.plan.route;
      run.s = Math.min(run.total, run.s + C.RUN_SPEED * dt);
      while (run.idx < route.length - 1 && run.cum[run.idx + 1] <= run.s + 1e-9) {
        run.idx++;
        run.trail.push(route[run.idx]);
        var k = run.plan.coinAt[run.idx];
        if (k !== undefined && !collected[k]) { collected[k] = true; PP.Sfx.coin(); updateHud(); }
      }
      var a = route[run.idx], b = route[Math.min(run.idx + 1, route.length - 1)];
      var seg = run.cum[Math.min(run.idx + 1, route.length - 1)] - run.cum[run.idx];
      var t = seg > 0 ? (run.s - run.cum[run.idx]) / seg : 0;
      charPos = { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
      if (run.s >= run.total) endRun(run.plan.status);
    } else {
      var fr = run.sim.frames;
      run.f = Math.min(fr.length - 1, run.f + dt * 60);
      var i0 = Math.floor(run.f), i1 = Math.min(i0 + 1, fr.length - 1), u = run.f - i0;
      charPos = { x: fr[i0][0] + (fr[i1][0] - fr[i0][0]) * u, y: fr[i0][1] + (fr[i1][1] - fr[i0][1]) * u };
      run.trail.push([charPos.x, charPos.y]);
      for (var c = 0; c < level.coins.length; c++) {
        var cf = run.sim.coinFrame[c];
        if (!collected[c] && cf !== undefined && run.f >= cf) { collected[c] = true; PP.Sfx.coin(); updateHud(); }
      }
      if (run.f >= fr.length - 1) endRun(run.sim.status);
    }
    render();
  }

  var REASONS = {
    deadend: "O personagem chegou a um beco sem saída.",
    enemy: "O personagem colidiu com um inimigo.",
    coins: "Faltaram moedas: colete todas antes de entrar no portal.",
    fell: "O personagem caiu no vazio.",
    stuck: "O personagem parou antes de chegar ao portal.",
    timeout: "O personagem não chegou ao portal a tempo."
  };

  function endRun(status) {
    run.done = true;
    phase = "over";
    updateHud();
    var win = status === "win";
    win ? PP.Sfx.win() : PP.Sfx.lose();
    later(function () { win ? onWin() : onLose(status); }, 650);
  }

  /* ======================================================================
     RESULTADOS (RF18)
     ====================================================================== */

  /** Tentar de novo: reeditar o último arranjo ou restaurar o original. */
  function retry(restore) {
    closeModal();
    if (restore) restoreOriginal(true);
    startEdit();
    if (session.type === "speed") session.fails++;
  }

  /** Volta ao planejamento com o mesmo arranjo (move o herói de volta ao início). */
  function startEdit() {
    phase = "edit"; run = null;
    collected = level.coins.map(function () { return false; });
    charPos = level.kind === "grav" ? { x: level.ball.x, y: level.ball.y } : { x: level.start.x, y: level.start.y };
    timeLeft = limit; planUsed = 0;
    refreshConnections(); updateHud(); updateTimerLabel(); render();
  }

  function statsOf(extra) {
    var out = [["Movimentos", undoStack.length + " (mín. " + level.minMoves + ")"]];
    if (level.coins.length) out.push(["Moedas", coinsGot() + "/" + level.coins.length]);
    return out.concat(extra || []);
  }

  function onWin() {
    if (session.type === "campaign") {
      var ms = Math.round(planUsed * 1000);
      PP.Storage.completeLevel(session.kind, session.diff, session.n, undoStack.length, ms);
      var last = session.n >= C.LEVELS;
      showModal({
        tone: "good", title: "Fase concluída!",
        text: last ? "Você terminou todas as fases desta dificuldade. Parabéns!" : "O personagem chegou ao portal.",
        stats: statsOf([["Tempo planejando", format(planUsed)]]),
        actions: [
          last ? { label: "Voltar às fases", kind: "primary", onClick: exit }
               : { label: "Próxima fase", kind: "primary", onClick: function () { closeModal(); playCampaign(session.kind, session.diff, session.n + 1); } },
          { label: "Jogar esta fase de novo", kind: "ghost", onClick: function () { closeModal(); playCampaign(session.kind, session.diff, session.n); } },
          { label: last ? "Menu" : "Voltar às fases", kind: "ghost", onClick: exit }
        ]
      });
    } else if (session.type === "speed") {
      winSpeed();
    } else {
      winSkill();
    }
  }

  function onLose(status) {
    var reason = REASONS[status] || "Tente de novo.";
    if (session.type === "speed") { session.elapsed += C.SPEED_PENALTY; reason += " (+" + C.SPEED_PENALTY + " s de penalidade)"; }
    if (session.type === "skill") { loseSkill(reason); return; }
    showModal({
      tone: "bad", title: "Não foi dessa vez", text: reason, stats: statsOf(),
      actions: [
        { label: "Reeditar (último arranjo)", kind: "primary", onClick: function () { retry(false); } },
        { label: "Restaurar arranjo original", kind: "ghost", onClick: function () { retry(true); } },
        { label: "Sair", kind: "ghost", onClick: exit }
      ]
    });
  }

  /* ----- SpeedRun ----- */
  function winSpeed() {
    var idx = session.idx, total = C.SPEED_KINDS.length;
    if (idx < total - 1) {
      showModal({
        tone: "good", title: "Puzzle " + (idx + 1) + " de " + total + " concluído!",
        text: "O relógio continua correndo.",
        stats: [["Tempo até agora", format(session.elapsed)]],
        actions: [{ label: "Próximo puzzle", kind: "primary", onClick: function () { closeModal(); loadSpeedPuzzle(idx + 1); } }]
      });
      return;
    }
    var ms = Math.round(session.elapsed * 1000);
    var pos = PP.Storage.addRecord(session.diff, ms);
    var rows = (RIVALS[session.diff] || []).map(function (r) { return { name: r[0], s: r[1], rival: true }; });
    rows.push({ name: "Você", s: session.elapsed, me: true });
    rows.sort(function (a, b) { return a.s - b.s; });
    var place = rows.findIndex(function (r) { return r.me; }) + 1;
    showModal({
      tone: "good", title: "SpeedRun concluído!",
      text: "Seu tempo: " + format(session.elapsed) + (pos === 1 ? " - novo recorde!" : "") + " (" + place + "º lugar entre os rivais simulados)",
      ranking: rows,
      actions: [
        { label: "Correr de novo", kind: "primary", onClick: function () { closeModal(); playSpeed(session.diff); } },
        { label: "Menu", kind: "ghost", onClick: exit }
      ]
    });
  }

  function loadSpeedPuzzle(i) {
    session.idx = i;
    var lv = L.generate({
      kind: C.SPEED_KINDS[i], diff: session.diff, n: C.SPEED_LEVELS[i],
      seed: PP.hashSeed("speedrun:" + session.diff + ":" + i), overrides: { time: 0, slack: Infinity }
    });
    loadLevel(lv);
  }

  /* ----- Skill Check (integração MOBA) ----- */
  function winSkill() {
    var frac = limit > 0 ? timeLeft / limit : 0;
    var tier = frac >= 0.5 ? "ouro" : (frac >= 0.2 ? "prata" : "bronze");
    var dur = { ouro: 15, prata: 10, bronze: 6 }[tier];
    var b = PP.BONUSES[session.bonus];
    var result = {
      success: true, tier: tier, bonus: { id: b.id, label: b.label, durationSec: dur },
      timeMs: Math.round(planUsed * 1000), difficulty: session.diff
    };
    PP.Moba.emit(result);
    showModal({
      tone: "good", title: "Skill Check concluído!",
      text: "Bônus desbloqueado: " + b.label + " por " + dur + " s (nível " + tier + ").",
      stats: [["Tempo", format(planUsed)], ["Bônus", b.label]],
      actions: [
        { label: "Outro Skill Check", kind: "primary", onClick: function () { closeModal(); playSkill({ difficulty: session.diff }); } },
        { label: "Menu", kind: "ghost", onClick: exit }
      ]
    });
  }

  function loseSkill(reason) {
    var b = PP.BONUSES[session.bonus];
    PP.Moba.emit({ success: false, tier: null, bonus: { id: b.id, label: b.label, durationSec: 0 }, timeMs: Math.round(planUsed * 1000), difficulty: session.diff });
    showModal({
      tone: "bad", title: "Skill Check falhou", text: reason + " Bônus perdido: " + b.label + ".",
      actions: [
        { label: "Tentar outro Skill Check", kind: "primary", onClick: function () { closeModal(); playSkill({ difficulty: session.diff }); } },
        { label: "Menu", kind: "ghost", onClick: exit }
      ]
    });
  }

  /* ======================================================================
     JANELAS (modal), PAUSA E TUTORIAL
     ====================================================================== */

  /**
   * Mostra uma janela. opts = { title, text, warn, tone, stats:[[rótulo, valor]],
   * ranking:[{name,s,me}], actions:[{label, kind, onClick}] }
   */
  function showModal(opts) {
    modalOpen = true;
    var card = el.modalCard;
    card.className = "modal-card" + (opts.tone ? " " + opts.tone : "");
    el.modalTitle.textContent = opts.title;
    el.modalText.textContent = opts.text || "";
    el.modalText.style.display = opts.text ? "" : "none";
    el.modalWarn.textContent = opts.warn || "";
    el.modalWarn.style.display = opts.warn ? "" : "none";

    el.modalStats.innerHTML = "";
    (opts.stats || []).forEach(function (s) {
      var row = document.createElement("div");
      row.className = "stat";
      var a = document.createElement("span"), b = document.createElement("strong");
      a.textContent = s[0]; b.textContent = s[1];
      row.appendChild(a); row.appendChild(b); el.modalStats.appendChild(row);
    });
    if (opts.ranking) {
      opts.ranking.forEach(function (r, i) {
        var row = document.createElement("div");
        row.className = "stat rank" + (r.me ? " me" : "");
        var a = document.createElement("span"), b = document.createElement("strong");
        a.textContent = (i + 1) + "º " + r.name + (r.rival ? " (simulado)" : ""); b.textContent = format(r.s);
        row.appendChild(a); row.appendChild(b); el.modalStats.appendChild(row);
      });
    }

    el.modalActions.innerHTML = "";
    opts.actions.forEach(function (a) {
      var btn = document.createElement("button");
      btn.className = "m-btn " + (a.kind || "ghost");
      btn.textContent = a.label;
      btn.addEventListener("click", function () { PP.Sfx.tap(); a.onClick(); });
      el.modalActions.appendChild(btn);
    });
    el.modal.classList.add("show");
    lastTs = performance.now();
  }

  function closeModal() {
    modalOpen = false;
    if (el.modal) el.modal.classList.remove("show");
    lastTs = performance.now();
  }

  /** Botão voltar / pausa: abre o menu de pausa (RF32). */
  function openPause() {
    if (!level || modalOpen) return;
    var inSpeed = session.type === "speed";
    showModal({
      title: "Jogo pausado",
      text: inSpeed ? "O relógio do SpeedRun fica parado enquanto você está aqui." : "O tempo de planejamento está parado.",
      actions: [
        { label: "Continuar", kind: "primary", onClick: closeModal },
        { label: "Reiniciar fase", kind: "ghost", onClick: function () { closeModal(); if (phase === "edit") restoreOriginal(); else { restoreOriginal(true); startEdit(); } } },
        { label: "Sair", kind: "ghost", onClick: exit }
      ]
    });
  }

  /** Tutorial guiado da primeira fase (RF29). */
  function tutorial() {
    var steps = [
      ["1. Arraste as linhas", "Toque em uma linha e arraste: ela inteira se move. Encaixe as pontas para formar um caminho do personagem (centro) até o portal."],
      ["2. Linhas azuis são fixas", "O trilho azul no centro não se move. As linhas ligadas ao personagem ficam azul-claras: use isso para saber se está conectado."],
      ["3. Toque em Iniciar", "Quando o caminho estiver pronto, toque em Iniciar e confirme. Depois, é só observar o personagem andar."]
    ];
    function step(i) {
      showModal({
        title: steps[i][0], text: steps[i][1],
        actions: [{ label: i < steps.length - 1 ? "Próximo" : "Entendi!", kind: "primary", onClick: function () {
          if (i < steps.length - 1) step(i + 1); else { closeModal(); PP.Storage.set("tutorial", true); }
        } }]
      });
    }
    step(0);
  }

  function exit() {
    closeModal();
    clearTimers();
    PP.Nav.exitGame(session);
  }

  /* ======================================================================
     SESSÕES E CICLO DE VIDA
     ====================================================================== */

  function loadLevel(lv) {
    clearTimers();
    closeModal();
    level = lv;
    undoStack = []; redoStack = [];
    limit = lv.timeLimit || 0;
    drag = null; run = null;
    startEdit();

    var kindLabel = level.kind === "grav" ? "Gravitacional" : "Padrão";
    if (session.type === "campaign") el.title.textContent = kindLabel + " · Fase " + session.n;
    else if (session.type === "speed") el.title.textContent = "SpeedRun · Puzzle " + (session.idx + 1) + "/" + C.SPEED_KINDS.length + " · " + kindLabel;
    else el.title.textContent = "Skill Check · " + PP.BONUSES[session.bonus].label;
    el.badge.textContent = PP.DIFFICULTIES[session.diff].label;
    el.badge.className = "pill diff-badge " + session.diff;

    if (!raf) { lastTs = performance.now(); raf = requestAnimationFrame(loop); }
  }

  /** Fase numerada de um modo (Padrão/Gravitacional). */
  function playCampaign(kind, diff, n) {
    session = { type: "campaign", kind: kind, diff: diff, n: n };
    loadLevel(L.generate({ kind: kind, diff: diff, n: n }));
    if (kind === "std" && diff === "easy" && n === 1 && !PP.Storage.get("tutorial")) tutorial();
  }

  /** SpeedRun: 5 puzzles com sementes fixas (mesmos para todos) e relógio que só sobe. */
  function playSpeed(diff) {
    session = { type: "speed", diff: diff, idx: 0, elapsed: 0, fails: 0 };
    loadSpeedPuzzle(0);
    showModal({
      title: "SpeedRun", text: "Vença 5 puzzles seguidos no menor tempo. Cada derrota soma " + C.SPEED_PENALTY + " s. O relógio começa ao confirmar.",
      actions: [{ label: "Começar!", kind: "primary", onClick: closeModal }]
    });
  }

  /**
   * Skill Check (RF24). opts = { difficulty, bonus ("vision"|"heal"|"speed"), kind ("std"|"grav"), seed, timeLimit }.
   * Mostra o "evento" do MOBA e um puzzle curto; devolve o resultado via PP.Moba.emit.
   */
  function playSkill(opts) {
    opts = opts || {};
    var diff = PP.DIFFICULTIES[opts.difficulty] ? opts.difficulty : "medium";
    var ids = Object.keys(PP.BONUSES);
    var bonus = PP.BONUSES[opts.bonus] ? opts.bonus : ids[Math.floor(Math.random() * ids.length)];
    var kind = opts.kind === "grav" ? "grav" : "std";
    var secs = opts.timeLimit > 0 ? opts.timeLimit : 30;
    session = { type: "skill", diff: diff, bonus: bonus };
    loadLevel(L.generate({ kind: kind, diff: diff, n: 4, seed: opts.seed, overrides: { time: secs } }));
    var b = PP.BONUSES[bonus];
    showModal({
      title: "Skill Check!", text: "Evento do MOBA: resolva o puzzle em " + secs + " s para ganhar " + b.label + ". Quanto mais rápido, maior e mais longo o bônus.",
      actions: [{ label: "Aceitar desafio", kind: "primary", onClick: closeModal }]
    });
  }

  function init() {
    canvas = document.getElementById("board");
    ctx = canvas.getContext("2d");
    el.timer = document.getElementById("game-timer");
    el.timerPill = el.timer.parentNode;
    el.action = document.getElementById("game-action");
    el.badge = document.getElementById("game-badge");
    el.title = document.getElementById("game-title");
    el.moves = document.getElementById("hud-moves");
    el.coins = document.getElementById("hud-coins");
    el.rotate = document.getElementById("hud-rotate");
    el.undo = document.getElementById("btn-undo");
    el.redo = document.getElementById("btn-redo");
    el.reset = document.getElementById("btn-reset");
    el.modal = document.getElementById("modal");
    el.modalCard = el.modal.querySelector(".modal-card");
    el.modalTitle = document.getElementById("modal-title");
    el.modalText = document.getElementById("modal-text");
    el.modalWarn = document.getElementById("modal-warn");
    el.modalStats = document.getElementById("modal-stats");
    el.modalActions = document.getElementById("modal-actions");

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    el.action.addEventListener("click", requestStart);
    el.undo.addEventListener("click", undo);
    el.redo.addEventListener("click", redo);
    el.reset.addEventListener("click", function () { if (phase === "edit" && !modalOpen) restoreOriginal(); });
    document.getElementById("btn-pause").addEventListener("click", function () { PP.Sfx.tap(); openPause(); });
  }

  /** Chamado ao sair da tela de jogo: para o relógio e fecha janelas. */
  function leave() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    clearTimers();
    closeModal();
    level = null; run = null; drag = null;
  }

  /** Ajusta a resolução do canvas à escala atual da tela (imagem nítida). */
  function resize(scale) {
    if (!canvas) return;
    res = Math.min(3, (window.devicePixelRatio || 1) * scale);
    canvas.width = canvas.height = Math.round(C.BOARD_SIZE * res);
    render();
  }

  /** Para testes automatizados: acesso ao estado interno. */
  function debug() { return { level: level, session: session, phase: function () { return phase; }, undo: undoStack, modalOpen: function () { return modalOpen; } }; }

  return {
    init: init, leave: leave, resize: resize, openPause: openPause,
    playCampaign: playCampaign, playSpeed: playSpeed, playSkill: playSkill, debug: debug
  };
})();
