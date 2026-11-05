/* ==========================================================================
   storage.js - salva configurações no aparelho (RF-30)
   Usa localStorage com try/catch: se o navegador bloquear, o jogo continua.
   ========================================================================== */
PP.Storage = (function () {
  "use strict";

  var KEY = "pathfinder-puzzle:v1";
  var defaults = { sound: true, colorblind: false };
  var data = Object.assign({}, defaults);

  /** Carrega os dados salvos (chamado uma vez na inicialização). */
  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      data = Object.assign({}, defaults, saved);
    } catch (e) { /* sem armazenamento: usa os padrões */ }
    return data;
  }

  /** Grava o estado atual. */
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignora */ }
  }

  /** Lê uma configuração. */
  function get(key) { return data[key]; }

  /** Altera e salva uma configuração. */
  function set(key, value) { data[key] = value; save(); }

  return { load: load, get: get, set: set };
})();
