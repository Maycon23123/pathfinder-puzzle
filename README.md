# Pathfinder Puzzle (v0.2 - jogável)

Puzzle 2D: arraste as peças de linha para montar o caminho do centro até o portal.
Projeto de Prototipação - FATEC Sorocaba (ADS).

**Modos:** Padrão (vista de cima), Gravitacional (vista lateral, com física), SpeedRun (5 puzzles, ranking) e
Skill Check (puzzle relâmpago para integrar com um MOBA).
**Dificuldades:** Fácil, Médio e Difícil, com 10 fases cada (moedas, inimigos, giro de peças, limite de movimentos e tempo).
Toda fase é gerada com **solução garantida** e passa por uma tela de **confirmação** antes de executar.

## Jogar online / no celular

- **Netlify Drop:** `npm run zip` gera `dist/pathfinder-puzzle-netlify.zip`; arraste em <https://app.netlify.com/drop>.
- **Instalar no celular sem APK (PWA):** abra o link https do Netlify no Chrome → menu ⋮ → *Instalar app*
  (iPhone: Safari → Compartilhar → *Adicionar à Tela de Início*). Funciona offline.
- **APK de verdade (opcional):** veja `docs/PROMPT-HERMES-APK.md`.

## Testes

`npm test` gera centenas de fases e confere que todas têm solução, nascem embaralhadas e não têm linhas cruzadas.

## Testar no PC (2 jeitos)

1. **Mais fácil:** dê dois cliques em `www/index.html`. Funciona em Chrome, Edge e Firefox.
2. **Servidor local** (recomendado): `python -m http.server 8000 --directory www`
   e abra <http://localhost:8000>. Dica: no Chrome, `F12` → ícone de celular para simular a tela.

## Testar no celular Android

Veja `docs/DOCUMENTACAO.md`, seção 7 (três caminhos, do mais simples ao APK).

## Integração com MOBA (Skill Check)

`PathfinderPuzzle.startSkillCheck({ difficulty, bonus, timeLimit })` (Promise), `postMessage` em iframe ou
`index.html?skillcheck=1&difficulty=hard&bonus=heal`. Detalhes no topo de `www/js/moba.js`.

## Estrutura

```
www/            o jogo (HTML + CSS + JavaScript puro, sem dependências)
docs/           documentação completa
capacitor.config.json, package.json   para gerar o APK depois
```

Documentação completa: [`docs/DOCUMENTACAO.md`](docs/DOCUMENTACAO.md)
