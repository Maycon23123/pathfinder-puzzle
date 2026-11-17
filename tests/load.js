/* Carrega os módulos "de lógica" do jogo (sem DOM) para testes em Node. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

module.exports = function load() {
  const ctx = { console, Math, Object, Array, JSON, Date, Infinity, Number, String, Error };
  ctx.window = ctx;
  vm.createContext(ctx);
  ["config", "rng", "geometry", "physics", "pathfinding", "level"].forEach(function (f) {
    const file = path.join(__dirname, "..", "www", "js", f + ".js");
    vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  });
  return ctx.PP;
};
