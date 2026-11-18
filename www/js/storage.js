/* ==========================================================================
   storage.js - salva configurações, progresso e recordes no aparelho (RF30)
   Usa localStorage com try/catch: se o navegador bloquear, o jogo continua
   (só não guarda nada).
   ========================================================================== */
PP.Storage = (function () {
  "use strict";

  var KEY = "pathfinder-puzzle:v1";
  var defaults = {
    sound: true,
    colorblind: false,
    unlockAll: false,      // libera todas as fases (útil para testar/apresentar)
    tutorial: false,       // o tutorial da 1ª fase já foi visto?
    progress: {},          // "std:easy" -> { unlocked: 3, done: { 1: {moves, ms}, ... } }
    ranking: {}            // "easy" -> [{ ms, date }, ...] (SpeedRun, melhores primeiro)
  };
  var data = JSON.parse(JSON.stringify(defaults));

  /** Carrega os dados salvos (chamado uma vez na inicialização). */
  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      data = Object.assign(JSON.parse(JSON.stringify(defaults)), saved);
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

  /* ---------- Progresso das fases (RF28) ---------- */

  /** Progresso de um modo/dificuldade: { unlocked, done }. */
  function getProgress(kind, diff) {
    var p = data.progress[kind + ":" + diff];
    return p || { unlocked: 1, done: {} };
  }

  /** Registra uma fase vencida e libera a próxima. */
  function completeLevel(kind, diff, n, moves, ms) {
    var key = kind + ":" + diff, p = getProgress(kind, diff);
    p.done[n] = { moves: moves, ms: ms };
    p.unlocked = Math.min(PP.CONFIG.LEVELS, Math.max(p.unlocked, n + 1));
    data.progress[key] = p;
    save();
  }

  /** Nível mais alto liberado (considera a opção "liberar todas"). */
  function unlockedLevel(kind, diff) {
    return data.unlockAll ? PP.CONFIG.LEVELS : getProgress(kind, diff).unlocked;
  }

  /* ---------- Ranking do SpeedRun (RN09) ---------- */

  function getRanking(diff) { return (data.ranking[diff] || []).slice(); }

  /** Insere um tempo (ms); devolve a posição (1 = recorde) entre os tempos do jogador. */
  function addRecord(diff, ms) {
    var list = getRanking(diff);
    list.push({ ms: ms, date: Date.now() });
    list.sort(function (a, b) { return a.ms - b.ms; });
    var pos = 1 + list.findIndex(function (r) { return r.ms === ms; });
    data.ranking[diff] = list.slice(0, 5);
    save();
    return pos;
  }

  return {
    load: load, get: get, set: set,
    getProgress: getProgress, completeLevel: completeLevel, unlockedLevel: unlockedLevel,
    getRanking: getRanking, addRecord: addRecord
  };
})();
