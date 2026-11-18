/* ==========================================================================
   background.js - fundo de espaço (nebulosa + estrelas) desenhado em canvas
   Cada tela tem um "tema" de cores (atributo data-theme no HTML).
   ========================================================================== */
PP.Background = (function () {
  "use strict";

  var THEMES = {
    home:       { base: "#01040f", colors: ["#0e7490", "#14b8a6", "#1d4ed8", "#047857"], alpha: 0.34, blobs: 24, seed: 11 },
    difficulty: { base: "#03030f", colors: ["#6d28d9", "#4c1d95", "#312e81", "#7c3aed"], alpha: 0.32, blobs: 22, seed: 23 },
    dark:       { base: "#020512", colors: ["#1e1b4b", "#312e81", "#0c4a6e", "#134e4a"], alpha: 0.30, blobs: 16, seed: 37 }
  };

  var canvas, ctx;
  var current = "home";

  /** Gerador pseudoaleatório com semente: o fundo fica igual a cada redesenho. */
  function seeded(seed) {
    var a = seed;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function init() {
    canvas = document.getElementById("bg");
    ctx = canvas.getContext("2d");
  }

  /** Redesenha o fundo usando o tema indicado (ou o último usado). */
  function draw(themeName) {
    current = THEMES[themeName] ? themeName : current;
    var t = THEMES[current];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.width = Math.round(window.innerWidth * dpr);
    var h = canvas.height = Math.round(window.innerHeight * dpr);
    var rand = seeded(t.seed);
    var base = Math.max(w, h);

    ctx.fillStyle = t.base;
    ctx.fillRect(0, 0, w, h);

    // Nebulosa: várias manchas grandes e suaves sobrepostas
    ctx.globalCompositeOperation = "screen";
    for (var i = 0; i < t.blobs; i++) {
      var x = rand() * w, y = rand() * h;
      var r = base * (0.12 + rand() * 0.22);
      var color = t.colors[Math.floor(rand() * t.colors.length)];
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = t.alpha * (0.4 + rand() * 0.6);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Estrelas
    ctx.globalCompositeOperation = "source-over";
    var stars = Math.round((w * h) / 4500);
    for (var s = 0; s < stars; s++) {
      var big = rand() > 0.94;
      ctx.globalAlpha = 0.35 + rand() * 0.65;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, (big ? 1.6 : 0.7 + rand() * 0.7) * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return { init: init, draw: draw };
})();
