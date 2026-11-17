/* Teste do gerador: toda fase gerada deve ter solução e começar embaralhada.
   Uso: node tests/generator.test.js [sementes-por-combinação]   (padrão: 4) */
const PP = require("./load")();
const seeds = parseInt(process.argv[2] || "4", 10);
let total = 0, failures = 0, maxMs = 0, sumMs = 0;
const rows = [];

function conflictFree(level) {
  const ps = level.pieces;
  for (let i = 0; i < ps.length; i++) {
    const others = ps.filter((p, j) => j !== i);
    if (PP.Level.conflicts(ps[i], ps[i].x, ps[i].y, others)) return false;
    if (!PP.Level.fits(ps[i], ps[i].x, ps[i].y) && !ps[i].fixed) return false;
  }
  return true;
}

["std", "grav"].forEach(function (kind) {
  ["easy", "medium", "hard"].forEach(function (diff) {
    for (let n = 1; n <= 10; n++) {
      let ok = 0, t = 0, pcs = 0, mv = 0;
      for (let s = 0; s < seeds; s++) {
        const t0 = Date.now();
        let lvl;
        try { lvl = PP.Level.generate({ kind, diff, n, seed: 1000 * n + s * 7919 + 13 }); }
        catch (e) { failures++; total++; console.log("FALHA geração", kind, diff, n, s, e.message); continue; }
        const ms = Date.now() - t0; t += ms; maxMs = Math.max(maxMs, ms); sumMs += ms; total++;
        const errs = [];
        // 1) arranjo inicial: sem cruzamentos e não resolvido
        if (!conflictFree(lvl)) errs.push("inicial com cruzamento");
        if (PP.Level.evaluate(lvl).win) errs.push("já nasce resolvida");
        // 2) arranjo resolvido: ganha
        const init = PP.Level.snapshot(lvl);
        PP.Level.restore(lvl, lvl.solved);
        if (!conflictFree(lvl)) errs.push("solução com cruzamento");
        if (!PP.Level.evaluate(lvl).win) errs.push("solução não ganha");
        PP.Level.restore(lvl, init);
        // 3) parâmetros respeitados
        if (lvl.coins.length > lvl.params.coins) errs.push("moedas demais");
        if (errs.length) { failures++; console.log("ERRO", kind, diff, n, s, errs.join(", ")); } else ok++;
        pcs += lvl.pieces.length; mv += lvl.minMoves;
      }
      rows.push([kind, diff, n, ok + "/" + seeds, Math.round(t / seeds) + "ms", (pcs / seeds).toFixed(1) + " peças", (mv / seeds).toFixed(1) + " mov.mín"].join("  "));
    }
  });
});
console.log(rows.join("\n"));
console.log("\nTotal:", total, "fases | falhas:", failures, "| média", Math.round(sumMs / total) + "ms | máx", maxMs + "ms");
process.exit(failures ? 1 : 0);
