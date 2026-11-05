/* ==========================================================================
   geometry.js - funções geométricas puras (sem desenhar nada)
   ========================================================================== */
PP.Geo = (function () {
  "use strict";

  /** Menor distância do ponto (px,py) ao segmento (x1,y1)-(x2,y2). */
  function distToSegment(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var len2 = dx * dx + dy * dy;
    var t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  /** Orientação do trio (a, b, c): >0 anti-horário, <0 horário, 0 colinear. */
  function orient(ax, ay, bx, by, cx, cy) {
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  }

  /**
   * Dois segmentos entram em conflito quando se CRUZAM no meio ou quando se
   * SOBREPÕEM (colineares). Apenas encostar nas pontas é permitido: é assim
   * que as peças se conectam (RF-09 / RG-06).
   * Cada segmento é [x1, y1, x2, y2].
   */
  function segmentsConflict(a, b) {
    var o1 = orient(a[0], a[1], a[2], a[3], b[0], b[1]);
    var o2 = orient(a[0], a[1], a[2], a[3], b[2], b[3]);
    var o3 = orient(b[0], b[1], b[2], b[3], a[0], a[1]);
    var o4 = orient(b[0], b[1], b[2], b[3], a[2], a[3]);

    // Cruzamento próprio (um atravessa o outro)
    if (o1 * o2 < 0 && o3 * o4 < 0) return true;

    // Colineares: conflito só se a sobreposição tiver comprimento > 0
    if (o1 === 0 && o2 === 0) {
      var useX = Math.abs(a[2] - a[0]) >= Math.abs(a[3] - a[1]);
      var a1 = useX ? a[0] : a[1], a2 = useX ? a[2] : a[3];
      var b1 = useX ? b[0] : b[1], b2 = useX ? b[2] : b[3];
      var lo = Math.max(Math.min(a1, a2), Math.min(b1, b2));
      var hi = Math.min(Math.max(a1, a2), Math.max(b1, b2));
      return hi - lo > 0;
    }
    return false;
  }

  return { distToSegment: distToSegment, orient: orient, segmentsConflict: segmentsConflict };
})();
