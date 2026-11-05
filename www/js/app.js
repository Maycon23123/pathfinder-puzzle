/* ==========================================================================
   app.js - inicialização, navegação entre telas, escala e opções
   ========================================================================== */
(function () {
  "use strict";

  var C = PP.CONFIG;
  var history = [];           // pilha de telas visitadas (botão voltar)
  var current = null;         // nome da tela atual
  var toastTimer = null;

  /* ---------- Aviso rápido ---------- */
  PP.toast = function (message) {
    var t = document.getElementById("toast");
    t.textContent = message;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
  };

  /* ---------- Escala: encaixa o design 819x1456 em qualquer tela ---------- */
  function fitScreen() {
    var s = Math.min(window.innerWidth / C.DESIGN_W, window.innerHeight / C.DESIGN_H);
    document.documentElement.style.setProperty("--s", s);
    PP.Background.draw();
    PP.Game.resize(s);
  }

  /* ---------- Navegação ---------- */

  /** Mostra a tela `name`. Se `push` for verdadeiro, lembra a anterior. */
  function go(name, push) {
    if (current === "game") PP.Game.leave();
    if (push !== false && current) history.push(current);
    show(name);
  }

  /** Volta para a tela anterior (ou menu, se não houver histórico). */
  function back() {
    show(history.pop() || "home");
    if (current === "game") PP.Game.leave();
  }

  function show(name) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove("active");
    var screen = document.getElementById("screen-" + name);
    screen.classList.add("active");
    current = name;
    PP.Background.draw(screen.dataset.theme);
    if (name === "help") PP.Help.open(back);
  }

  /* ---------- Opções ---------- */
  function applyColorblind() {
    document.body.classList.toggle("colorblind", !!PP.Storage.get("colorblind"));
  }

  function initSettings() {
    var sound = document.getElementById("opt-sound");
    var cb = document.getElementById("opt-colorblind");
    sound.checked = !!PP.Storage.get("sound");
    cb.checked = !!PP.Storage.get("colorblind");
    sound.addEventListener("change", function () { PP.Storage.set("sound", sound.checked); PP.Sfx.tap(); });
    cb.addEventListener("change", function () { PP.Storage.set("colorblind", cb.checked); applyColorblind(); });
    applyColorblind();
  }

  /* ---------- Ligação dos botões ---------- */
  function bindButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;

      if (btn.dataset.go) { PP.Sfx.tap(); go(btn.dataset.go); }
      else if (btn.hasAttribute("data-back")) { PP.Sfx.tap(); back(); }
      else if (btn.dataset.difficulty) {
        PP.Sfx.tap();
        go("game");
        PP.Game.enter(btn.dataset.difficulty);
      }
    });
  }

  /* ---------- Início ---------- */
  function start() {
    PP.Storage.load();
    PP.Background.init();
    PP.Help.init();
    PP.Game.init();
    initSettings();
    bindButtons();
    fitScreen();
    window.addEventListener("resize", fitScreen);
    go("home", false);

    // PWA: permite instalar e usar offline (só funciona via http/https)
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("sw.js").catch(function () { /* ignora */ });
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})();
