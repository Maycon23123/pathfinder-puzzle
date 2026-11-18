/* ==========================================================================
   rng.js - gerador pseudoaleatório com semente (mulberry32)
   Com a mesma semente, a fase sai sempre igual: é isso que permite o ranking
   do SpeedRun usar os mesmos puzzles para todos os jogadores (RN09).
   ========================================================================== */
PP.Rng = function (seed) {
  "use strict";
  var a = (seed >>> 0) || 1;

  /** Número em [0, 1). */
  function next() {
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next: next,
    /** Inteiro de 0 a n-1. */
    int: function (n) { return Math.floor(next() * n); },
    pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
    chance: function (p) { return next() < p; },
    shuffle: function (arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(next() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },
    /** Sorteia um item de uma lista de { w: peso, ... }. */
    weighted: function (items) {
      var total = 0, i;
      for (i = 0; i < items.length; i++) total += items[i].w;
      var r = next() * total;
      for (i = 0; i < items.length; i++) { r -= items[i].w; if (r <= 0) return items[i]; }
      return items[items.length - 1];
    }
  };
};

/** Transforma um texto em semente numérica (FNV-1a). */
PP.hashSeed = function (text) {
  var h = 2166136261;
  for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
