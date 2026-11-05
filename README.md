# Pathfinder Puzzle (alpha 0.1)

Puzzle 2D: arraste as peças de linha para montar o caminho do centro até o portal.
Projeto de Prototipação - FATEC Sorocaba (ADS, 1º ano).

## Testar no PC (2 jeitos)

1. **Mais fácil:** dê dois cliques em `www/index.html`. Funciona em Chrome, Edge e Firefox.
2. **Servidor local** (recomendado): `python -m http.server 8000 --directory www`
   e abra <http://localhost:8000>. Dica: no Chrome, `F12` → ícone de celular para simular a tela.

## Testar no celular Android

Veja `docs/DOCUMENTACAO.md`, seção 7 (três caminhos, do mais simples ao APK).

## Estrutura

```
www/            o jogo (HTML + CSS + JavaScript puro, sem dependências)
docs/           documentação completa
capacitor.config.json, package.json   para gerar o APK depois
```

Documentação completa: [`docs/DOCUMENTACAO.md`](docs/DOCUMENTACAO.md)
