/* ==========================================================================
   game.js - tela de jogo: desenho do tabuleiro, arrastar peças e cronômetro
   --------------------------------------------------------------------------
   ESTADOS
     "edit" - planejamento: as peças podem ser arrastadas (RF-06 a RF-10)
     "run"  - execução: peças travadas e cronômetro correndo (RF-16)

   ALPHA: o personagem ainda não anda pelo caminho (RF-17 e RF-18 pendentes).
   O ponto de extensão é a função startRun(), marcada com "TODO".
   ========================================================================== */
PP.Game = (function () {
  "use strict";

  var C = PP.CONFIG;

  /* ---------- Estado ---------- */
  var canvas, ctx;
  var res = 1;                    // resolução interna do canvas (nitidez)
  var level;                      // fase atual (ver level.js)
  var initialPositions;           // posições originais das peças (para resetar)
  var difficultyId = "easy";
  var mode = "edit";
  var remaining = C.PLAN_TIME;    // segundos restantes
  var lastTick = 0;
  var timerId = null;
  var drag = null;                // peça em arraste: { piece, offX, offY, fromX, fromY }
  var el = {};                    // elementos do HTML

  /** Converte coordenada de vértice (0..10) para pixel do canvas. */
  function px(v) { return C.PAD + v * C.CELL; }

  /** Limita um número ao intervalo [lo, hi]. */
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* ======================================================================
     DESENHO
     ====================================================================== */

  /** Traça um retângulo de cantos arredondados (compatível com webviews antigas). */
  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBoardBackground() {
    var s = C.BOARD_SIZE;
    roundedRect(2, 2, s - 4, s - 4, 40);
    ctx.fillStyle = "#121a4b";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#4a5fd0";
    ctx.stroke();

    // Grade suave
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(120, 140, 255, 0.13)";
    ctx.beginPath();
    for (var i = 0; i <= C.GRID; i++) {
      ctx.moveTo(px(i), px(0)); ctx.lineTo(px(i), px(C.GRID));
      ctx.moveTo(px(0), px(i)); ctx.lineTo(px(C.GRID), px(i));
    }
    ctx.stroke();
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
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--bad") || "#ff4d4d";
    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#7f8590"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#1a1a2e";                       // olhos
    ctx.beginPath(); ctx.arc(x - 5, y - 3, 2.2, 0, Math.PI * 2); ctx.arc(x + 5, y - 3, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1a1a2e"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(x, y + 8, 6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();   // boca triste
  }

  function drawCharacter(pt) {
    var x = px(pt.x), y = px(pt.y);
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(x, y, 21, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawPiece(piece) {
    var dragging = drag && drag.piece === piece;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = dragging ? "#7df3ff" : (mode === "run" ? "rgba(255,255,255,.65)" : "#fff");
    if (dragging) { ctx.shadowColor = "#22d6ee"; ctx.shadowBlur = 14; }
    ctx.beginPath();
    piece.segs.forEach(function (s) {
      ctx.moveTo(px(s[0] + piece.x), px(s[1] + piece.y));
      ctx.lineTo(px(s[2] + piece.x), px(s[3] + piece.y));
    });
    ctx.stroke();
    ctx.restore();
  }

  /** Redesenha o tabuleiro inteiro. */
  function render() {
    if (!ctx || !level) return;
    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.clearRect(0, 0, C.BOARD_SIZE, C.BOARD_SIZE);
    drawBoardBackground();
    drawPortal(level.goal);
    level.coins.forEach(drawCoin);
    level.enemies.forEach(drawEnemy);
    level.pieces.forEach(drawPiece);
    drawCharacter(level.start);          // ALPHA: o personagem fica sempre no centro
  }

  /* ======================================================================
     ENTRADA (mouse e toque usam os mesmos Pointer Events - RF-26)
     ====================================================================== */

  /** Posição do ponteiro em pixels do canvas (compensa a escala da tela). */
  function toBoard(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * C.BOARD_SIZE / r.width,
      y: (e.clientY - r.top) * C.BOARD_SIZE / r.height
    };
  }

  /** Acha a peça mais próxima do ponto (dentro do raio de captura). */
  function pickPiece(p) {
    var best = null, bestDist = C.GRAB_RADIUS;
    level.pieces.forEach(function (piece) {
      PP.Level.absSegs(piece).forEach(function (s) {
        var d = PP.Geo.distToSegment(p.x, p.y, px(s[0]), px(s[1]), px(s[2]), px(s[3]));
        if (d < bestDist) { bestDist = d; best = piece; }
      });
    });
    return best;
  }

  function onPointerDown(e) {
    if (mode !== "edit") return;                    // RG-05: travado na execução
    var p = toBoard(e);
    var piece = pickPiece(p);
    if (!piece) return;
    drag = { piece: piece, offX: p.x - px(piece.x), offY: p.y - px(piece.y), fromX: piece.x, fromY: piece.y };
    canvas.setPointerCapture(e.pointerId);
    render();
  }

  function onPointerMove(e) {
    if (!drag) return;
    var p = toBoard(e), piece = drag.piece;
    // A peça acompanha o dedo, mas fica presa dentro do tabuleiro (RF-08)
    piece.x = clamp((p.x - drag.offX - C.PAD) / C.CELL, 0, C.GRID - piece.w);
    piece.y = clamp((p.y - drag.offY - C.PAD) / C.CELL, 0, C.GRID - piece.h);
    render();
  }

  function onPointerUp() {
    if (!drag) return;
    var piece = drag.piece;
    // Encaixa na grade (RF-12)
    var nx = clamp(Math.round(piece.x), 0, C.GRID - piece.w);
    var ny = clamp(Math.round(piece.y), 0, C.GRID - piece.h);

    if (PP.Level.conflicts(piece, nx, ny, level.pieces)) {
      // RF-09: não pode cruzar nem sobrepor outra peça -> volta ao lugar anterior
      piece.x = drag.fromX; piece.y = drag.fromY;
      PP.Sfx.bad();
      PP.toast("As linhas não podem se cruzar");
    } else {
      piece.x = nx; piece.y = ny;
      PP.Sfx.drop();
    }
    drag = null;
    render();
  }

  /* ======================================================================
     CRONÔMETRO E MODOS
     ====================================================================== */

  /** Formata segundos como m:ss. */
  function format(seconds) {
    var s = Math.max(0, Math.ceil(seconds));
    return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
  }

  function updateTimerLabel() {
    el.timer.textContent = format(remaining);
    el.timerPill.classList.toggle("low", remaining <= 10);
  }

  /** Roda a cada 200 ms. O tempo só passa durante a execução. */
  function tick() {
    var now = performance.now();
    if (mode === "run") {
      remaining -= (now - lastTick) / 1000;
      if (remaining <= 0) timeUp();
      updateTimerLabel();
    }
    lastTick = now;
  }

  /** Tempo esgotado: a fase é totalmente resetada. */
  function timeUp() {
    PP.Level.restore(level, initialPositions);
    remaining = C.PLAN_TIME;
    setMode("edit");
    PP.Sfx.bad();
    PP.toast("Tempo esgotado! Fase resetada");
  }

  /** Alterna entre edição e execução e atualiza o botão. */
  function setMode(newMode) {
    mode = newMode;
    lastTick = performance.now();
    el.action.textContent = mode === "edit" ? "Iniciar" : "Editar";
    el.action.classList.toggle("running", mode === "run");
    if (mode === "edit") {
      // Ajuda, página 3: ao voltar para a edição o personagem volta ao centro.
      // (No alpha ele nunca sai de lá, então não há nada a mover ainda.)
    } else {
      startRun();
    }
    updateTimerLabel();
    render();
  }

  /** TODO (beta): calcular o caminho conectado a partir do centro e animar o personagem. */
  function startRun() {
    drag = null;
  }

  function onActionClick() {
    PP.Sfx.tap();
    setMode(mode === "edit" ? "run" : "edit");
  }

  /* ======================================================================
     CICLO DE VIDA
     ====================================================================== */

  function init() {
    canvas = document.getElementById("board");
    ctx = canvas.getContext("2d");
    el.timer = document.getElementById("game-timer");
    el.timerPill = el.timer.parentNode;
    el.action = document.getElementById("game-action");
    el.badge = document.getElementById("game-badge");

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    el.action.addEventListener("click", onActionClick);
  }

  /** Chamado ao abrir a tela de jogo: gera uma fase nova. */
  function enter(diffId) {
    difficultyId = diffId;
    level = PP.Level.generate(diffId);
    initialPositions = PP.Level.snapshot(level);
    remaining = C.PLAN_TIME;
    drag = null;

    el.badge.textContent = PP.DIFFICULTIES[diffId].label;
    el.badge.className = "pill diff-badge " + diffId;

    setMode("edit");
    clearInterval(timerId);
    timerId = setInterval(tick, 200);
  }

  /** Chamado ao sair da tela de jogo: para o cronômetro. */
  function leave() {
    clearInterval(timerId);
    timerId = null;
  }

  /** Ajusta a resolução do canvas à escala atual da tela (imagem nítida). */
  function resize(scale) {
    if (!canvas) return;
    res = Math.min(3, (window.devicePixelRatio || 1) * scale);
    canvas.width = canvas.height = Math.round(C.BOARD_SIZE * res);
    render();
  }

  return { init: init, enter: enter, leave: leave, resize: resize };
})();
