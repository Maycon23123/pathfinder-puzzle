/* ==========================================================================
   audio.js - efeitos sonoros simples gerados por código (sem arquivos)
   ========================================================================== */
PP.Sfx = (function () {
  "use strict";

  var ctx = null;

  /** Toca um "bip" curto. freq em Hz, dur em segundos. */
  function beep(freq, dur) {
    if (!PP.Storage.get("sound")) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) { /* áudio indisponível */ }
  }

  return {
    tap:  function () { beep(660, 0.08); },   // toque em botão
    drop: function () { beep(440, 0.06); },   // soltar peça
    bad:  function () { beep(180, 0.18); }    // ação inválida
  };
})();
