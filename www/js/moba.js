/* ==========================================================================
   moba.js - integração com um MOBA (RF24, RN08)
   --------------------------------------------------------------------------
   O jogo pode ser acionado por um evento externo e devolve um resultado que
   desbloqueia um bônus temporário. Três formas de integrar:

   1) JavaScript na mesma página:
        PathfinderPuzzle.startSkillCheck({ difficulty: "hard", bonus: "heal", timeLimit: 30 })
          .then(function (resultado) { ... });

   2) Dentro de um <iframe> (o MOBA é a página "pai"):
        iframe.contentWindow.postMessage(
          { source: "moba", type: "skillcheck:start", id: "abc", difficulty: "medium", bonus: "vision" }, "*");
        window.addEventListener("message", function (e) {
          if (e.data && e.data.source === "pathfinder-puzzle") { ...e.data.success, e.data.bonus... }
        });

   3) Por endereço: index.html?skillcheck=1&difficulty=hard&bonus=speed&seed=123

   Resultado: { source:"pathfinder-puzzle", type:"skillcheck:result", id, success,
                tier:"ouro"|"prata"|"bronze"|null, bonus:{ id, label, durationSec }, timeMs, difficulty }
   Também é disparado o evento "pathfinder:result" em window.
   ========================================================================== */
PP.Moba = (function () {
  "use strict";

  var pending = null;

  /** Inicia um Skill Check; a promessa resolve com o resultado. */
  function start(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      pending = { resolve: resolve, id: opts.id };
      PP.Nav.go("game");
      PP.Game.playSkill(opts);
    });
  }

  /** Chamado pelo jogo ao terminar um Skill Check. */
  function emit(result) {
    var msg = Object.assign({ source: "pathfinder-puzzle", type: "skillcheck:result", id: pending ? pending.id : undefined }, result);
    try { window.dispatchEvent(new CustomEvent("pathfinder:result", { detail: msg })); } catch (e) { /* ignora */ }
    try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, "*"); } catch (e) { /* ignora */ }
    if (pending) { pending.resolve(msg); pending = null; }
  }

  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (d && d.source === "moba" && d.type === "skillcheck:start") start(d);
  });

  /** Lê ?skillcheck=1&... do endereço (chamado pelo app ao iniciar). */
  function fromUrl() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get("skillcheck") !== "1") return false;
      start({
        difficulty: q.get("difficulty") || undefined, bonus: q.get("bonus") || undefined,
        kind: q.get("kind") || undefined, seed: q.get("seed") ? +q.get("seed") : undefined,
        timeLimit: q.get("time") ? +q.get("time") : undefined
      });
      return true;
    } catch (e) { return false; }
  }

  window.PathfinderPuzzle = { startSkillCheck: start, version: "0.2.0" };
  return { start: start, emit: emit, fromUrl: fromUrl };
})();
