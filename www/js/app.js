/* ==========================================================================
   app.js - inicialização, navegação entre telas, escala, opções e instalação
   ========================================================================== */
(function () {
  "use strict";

  var C = PP.CONFIG;
  var history = [];           // pilha de telas visitadas (botão voltar)
  var current = null;         // nome da tela atual
  var toastTimer = null;
  var selection = { mode: "std", diff: "easy" };   // escolhas do menu
  var installEvent = null;    // evento "beforeinstallprompt" guardado

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

  /** Mostra a tela `name`. Se `push` for falso, não lembra a anterior. */
  function go(name, push) {
    if (current === "game") PP.Game.leave();
    if (push !== false && current) history.push(current);
    show(name);
  }

  /** Volta para a tela anterior (ou menu, se não houver histórico). */
  function back() {
    if (current === "game") PP.Game.leave();
    var prev = history.pop() || "home";
    if (prev === "game") prev = history.pop() || "home";   // nunca volta para uma fase já encerrada
    show(prev);
  }

  function show(name) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove("active");
    var screen = document.getElementById("screen-" + name);
    screen.classList.add("active");
    current = name;
    PP.Background.draw(screen.dataset.theme);
    if (name === "help") PP.Help.open(back);
    if (name === "levels") buildLevels();
    if (name === "install") refreshInstall();
  }

  /** Chamado pelo jogo ao sair de uma sessão (pausa -> Sair, ou fim do SpeedRun/Skill Check). */
  PP.Nav = {
    go: go, back: back,
    exitGame: function (session) {
      PP.Game.leave();
      history = history.filter(function (n) { return n !== "game"; });
      if (session && session.type === "campaign") { history = ["home", "mode", "difficulty"]; show("levels"); history.push("levels"); history.pop(); }
      else { history = ["home"]; show("mode"); }
    }
  };

  /* ---------- Escolha de fase ---------- */
  function buildLevels() {
    var kind = selection.mode, diff = selection.diff;
    document.getElementById("levels-label").textContent =
      PP.MODES[selection.mode].label + " · " + PP.DIFFICULTIES[diff].label.charAt(0) + PP.DIFFICULTIES[diff].label.slice(1).toLowerCase();
    var grid = document.getElementById("levels-grid");
    grid.innerHTML = "";
    var unlocked = PP.Storage.unlockedLevel(kind, diff), prog = PP.Storage.getProgress(kind, diff);
    for (var n = 1; n <= C.LEVELS; n++) {
      var b = document.createElement("button");
      var locked = n > unlocked, done = !!prog.done[n];
      b.className = "level-btn" + (locked ? " locked" : "") + (done ? " done" : "");
      b.dataset.level = n;
      b.disabled = locked;
      b.innerHTML = "<strong>" + n + "</strong><span>" + (locked ? "Bloqueada" : (done ? "Concluída" : "Jogar")) + "</span>";
      grid.appendChild(b);
    }
  }

  /* ---------- Opções ---------- */
  function applyColorblind() {
    document.body.classList.toggle("colorblind", !!PP.Storage.get("colorblind"));
  }

  function initSettings() {
    var sound = document.getElementById("opt-sound");
    var cb = document.getElementById("opt-colorblind");
    var un = document.getElementById("opt-unlock");
    sound.checked = !!PP.Storage.get("sound");
    cb.checked = !!PP.Storage.get("colorblind");
    un.checked = !!PP.Storage.get("unlockAll");
    sound.addEventListener("change", function () { PP.Storage.set("sound", sound.checked); PP.Sfx.tap(); });
    cb.addEventListener("change", function () { PP.Storage.set("colorblind", cb.checked); applyColorblind(); });
    un.addEventListener("change", function () { PP.Storage.set("unlockAll", un.checked); });
    applyColorblind();
  }

  /* ---------- Instalar como app (PWA) ---------- */
  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }

  function refreshInstall() {
    var status = document.getElementById("install-status"), btn = document.getElementById("install-btn");
    if (isStandalone()) { status.textContent = "Você já está usando o app instalado."; btn.hidden = true; return; }
    if (installEvent) { status.textContent = "Seu navegador permite instalar agora:"; btn.hidden = false; }
    else {
      btn.hidden = true;
      status.textContent = location.protocol === "https:" || location.hostname === "localhost"
        ? "Use o menu do navegador, como abaixo:"
        : "Para instalar, abra o jogo por um endereço https (por exemplo, o link do Netlify).";
    }
  }

  function initInstall() {
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      installEvent = e;
      document.getElementById("home-install").hidden = false;
      if (current === "install") refreshInstall();
    });
    window.addEventListener("appinstalled", function () {
      installEvent = null;
      document.getElementById("home-install").hidden = true;
      PP.toast("Instalado! Procure o ícone na tela inicial.");
      if (current === "install") refreshInstall();
    });
    document.getElementById("install-btn").addEventListener("click", function () {
      if (!installEvent) return;
      installEvent.prompt();
      installEvent.userChoice.then(function () { installEvent = null; refreshInstall(); });
    });
  }

  /* ---------- Ligação dos botões ---------- */
  function bindButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;

      if (btn.dataset.go) { PP.Sfx.tap(); go(btn.dataset.go); }
      else if (btn.hasAttribute("data-back")) {
        PP.Sfx.tap();
        if (current === "game") PP.Game.openPause(); else back();     // no jogo, "voltar" abre a pausa
      }
      else if (btn.dataset.mode) {
        PP.Sfx.tap();
        selection.mode = btn.dataset.mode;
        if (selection.mode === "skill") { go("game"); PP.Game.playSkill({}); }
        else go("difficulty");
      }
      else if (btn.dataset.difficulty) {
        PP.Sfx.tap();
        selection.diff = btn.dataset.difficulty;
        if (selection.mode === "speed") { go("game"); PP.Game.playSpeed(selection.diff); }
        else go("levels");
      }
      else if (btn.dataset.level) {
        PP.Sfx.tap();
        go("game");
        PP.Game.playCampaign(selection.mode, selection.diff, +btn.dataset.level);
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
    initInstall();
    bindButtons();
    fitScreen();
    window.addEventListener("resize", fitScreen);
    go("home", false);
    PP.Moba.fromUrl();

    // PWA: permite instalar e usar offline (só funciona via http/https)
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("sw.js").catch(function () { /* ignora */ });
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})();
