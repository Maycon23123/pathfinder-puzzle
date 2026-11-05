/* ==========================================================================
   help.js - tela de Ajuda (3 páginas, mesmo texto do PDF)
   ========================================================================== */
PP.Help = (function () {
  "use strict";

  var page = 0;
  var onExit = function () {};

  /* ---------- Ícones usados nas páginas ---------- */
  var ICON_COIN =
    '<span class="ico-coin"><svg viewBox="0 0 60 60" width="60" height="60">' +
    '<circle cx="30" cy="30" r="21" fill="none" stroke="#7f8590" stroke-width="5"/></svg></span>';

  var ICON_ENEMY =
    '<span class="ico-enemy"><svg viewBox="0 0 60 60" width="64" height="64">' +
    '<circle cx="30" cy="30" r="24" fill="none" stroke="#7f8590" stroke-width="5"/>' +
    '<circle cx="22" cy="25" r="3.4" fill="#1a1a2e"/><circle cx="38" cy="25" r="3.4" fill="#1a1a2e"/>' +
    '<path d="M20 41q10-10 20 0" fill="none" stroke="#1a1a2e" stroke-width="4" stroke-linecap="round"/></svg></span>';

  var ICON_CLOCK =
    '<span class="ico-clock"><svg viewBox="0 0 24 24" width="62" height="62" fill="none" stroke="#0b1138" ' +
    'stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5v8l3.8 2.6"/></svg></span>';

  /** Item numerado (página 1). */
  function numbered(n, text) {
    return '<div class="help-item numbered"><div class="ico"><span class="num">' + n +
           '</span></div><p>' + text + '</p></div>';
  }

  /** Item com ícone, título e descrição (páginas 2 e 3). */
  function titled(icon, title, text) {
    return '<div class="help-item"><div class="ico">' + icon + '</div><div><h3>' +
           title + '</h3><p>' + text + '</p></div></div>';
  }

  /* ---------- Conteúdo das páginas ---------- */
  var PAGES = [
    '<h3 class="help-heading">Como jogar</h3>' +
    '<p class="help-sub">Modo padrão</p>' +
    '<div class="help-items">' +
      numbered(1, "Monte um caminho até o portal usando as peças disponíveis na área de jogo.") +
      numbered(2, "Você deve apertar nos lados que você deseja andar, assim andando um quadrado.") +
      numbered(3, "Arraste as peças para fazer seus caminhos. Quando você quiser começar, aperte Iniciar para andar pelo seu caminho.") +
    '</div>',

    '<h3 class="help-heading">Elementos e obstáculos</h3>' +
    '<div class="help-chip">Liberados no modo médio ou difícil</div>' +
    '<div class="help-items">' +
      titled(ICON_COIN, "Moeda", "Adiciona pontos extras, que obrigatoriamente devem ser passados antes de terminar a fase.") +
      titled(ICON_ENEMY, "Inimigo", "Bloqueia o caminho, mais informações em novas atualizações.") +
    '</div>',

    '<h3 class="help-heading">Painel da fase</h3>' +
    '<div class="help-items">' +
      titled(ICON_CLOCK, "Tempo", "O cronograma irá contar quando você apertar no botão de iniciar, e caso volte para a tela de edição, o cronômetro será pausado e só voltará na hora que iniciar novamente. Quando ele zera, a fase será totalmente resetada.") +
      titled('<span class="num">4</span>', "Voltar ao início", "Caso você edite a fase, sendo que já moveu seu personagem, o mesmo vai voltar para o centro.") +
    '</div>'
  ];

  /** Desenha a página atual (texto, contador, bolinhas). */
  function render() {
    document.getElementById("help-card").innerHTML = PAGES[page];
    document.getElementById("help-page-label").textContent = "Página " + (page + 1) + " de " + PAGES.length;
    var dots = document.querySelectorAll("#help-dots i");
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("on", i === page);
  }

  /** Abre a ajuda na primeira página. `exitCallback` é chamado ao sair. */
  function open(exitCallback) {
    page = 0;
    onExit = exitCallback || function () {};
    render();
  }

  function init() {
    // "Voltar": página anterior; na primeira página, sai da ajuda
    document.getElementById("help-prev").addEventListener("click", function () {
      if (page === 0) onExit(); else { page--; render(); }
    });
    // "Avançar": próxima página; na última, sai da ajuda
    document.getElementById("help-next").addEventListener("click", function () {
      if (page === PAGES.length - 1) onExit(); else { page++; render(); }
    });
  }

  return { init: init, open: open };
})();
