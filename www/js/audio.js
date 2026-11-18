/* ==========================================================================
   audio.js - efeitos sonoros simples gerados por código (sem arquivos)
   ========================================================================== */
PP.Sfx = (function () {
  "use strict";

  var ctx = null;

  /** Toca um "bip" curto. freq em Hz, dur em segundos, delay em segundos. */
  function beep(freq, dur, delay, type) {
    if (!PP.Storage.get("sound")) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      var t0 = ctx.currentTime + (delay || 0);
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = type || "sine";
      gain.gain.setValueAtTime(0.08, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur);
    } catch (e) { /* áudio indisponível */ }
  }

  return {
    tap:    function () { beep(660, 0.08); },                       // toque em botão
    drop:   function () { beep(440, 0.06); },                       // soltar peça
    rotate: function () { beep(520, 0.05); beep(620, 0.05, 0.05); },// girar peça
    bad:    function () { beep(180, 0.18); },                       // ação inválida
    coin:   function () { beep(880, 0.07, 0, "triangle"); beep(1320, 0.1, 0.07, "triangle"); },
    start:  function () { beep(392, 0.09); beep(523, 0.12, 0.09); },
    win:    function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.16, i * 0.11, "triangle"); }); },
    lose:   function () { [392, 330, 262].forEach(function (f, i) { beep(f, 0.22, i * 0.14, "sawtooth"); }); }
  };
})();
