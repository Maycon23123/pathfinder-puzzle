# Pathfinder Puzzle - Documentação (Alpha 0.1)

FATEC Sorocaba - Análise e Desenvolvimento de Sistemas - Prototipação - 2026

---

## 1. Sobre esta versão

Esta é a **alpha**: as cinco telas existem, seguem o design do PDF `telas_jogo.pdf` e funcionam de forma básica.
O jogo **ainda não é jogável do início ao fim** (o personagem não anda pelo caminho), mas a parte de planejamento
(arrastar peças) e o cronômetro já funcionam.

| Já funciona | Ainda não funciona (próximas versões) |
|---|---|
| Menu principal, escolha de dificuldade, ajuda (3 páginas), tela de jogo e opções | Personagem andando pelo caminho (RF-17) |
| Geração aleatória de peças, portal, moedas e inimigos conforme a dificuldade | Garantia de que toda fase tem solução (RF-04 / RG-10) |
| Arrastar peças com mouse ou dedo, presas ao tabuleiro, com encaixe na grade | Telas de vitória/derrota e próxima fase (RF-18, RF-28) |
| Peças não podem se cruzar nem se sobrepor | Desfazer / refazer (RF-13) |
| Botão Iniciar/Editar: trava as peças e liga/pausa o cronômetro | Modo gravitacional (RF-20 a RF-22) |
| Cronômetro de 1:30; ao zerar, a fase é resetada | Pausa, tutorial guiado, ranking |
| Opções: som e modo daltônico (salvos no aparelho) | Idioma (só português por enquanto) |
| Funciona offline e instala no Android (PWA) | |

## 2. Como jogar (versão atual)

1. No menu, toque no botão de play e escolha a dificuldade.
2. **Arraste as peças brancas** pelo tabuleiro. Elas se encaixam na grade ao soltar.
3. Toque em **Iniciar**: as peças travam e o tempo corre. Toque em **Editar** para voltar a mexer (o tempo pausa).
4. Se o tempo chegar a zero, a fase volta ao arranjo original.

Dificuldades: **Fácil** (só caminho), **Médio** (+ moedas), **Difícil** (+ moedas e inimigos).

## 3. Decisões tomadas (itens que o PDF/GDD não definiam)

- **Botão "?" no menu** (canto superior esquerdo): o PDF mostra a tela de Ajuda mas não diz como chegar nela.
- **Tela de Opções** (engrenagem): o PDF só mostra o ícone. Criei uma tela simples com som, modo daltônico e idioma (RF-31).
- **Seta de voltar na tela de jogo**: não aparece no PDF, mas é necessária para sair da fase.
- **Botão Iniciar vira "Editar"** durante a execução (a Ajuda fala em "voltar para a tela de edição").
- **Botão "Avançar" da última página de Ajuda** fecha a ajuda (e "Voltar" da primeira também).
- **Tabuleiro 10 x 10** quadrado, como pede o GDD ("área de jogo quadrada"). O portal aparece em um dos 4 cantos, sorteado.
- O rótulo **"Normal"** da tela de jogo é o modo (Padrão). Quando existir o modo gravitacional, ele mudará.
- **Nome do jogo**: usei o nome do GDD, *Pathfinder Puzzle*, no ícone/instalação. O título dentro do jogo continua "NOME DO JOGO", como no PDF.

## 4. Tecnologia

O GDD sugere Unity ou Godot. Como o foco é **Android com teste fácil no PC**, esta alpha usa **web puro**
(HTML + CSS + JavaScript + Canvas), sem bibliotecas:

- roda em qualquer navegador e no celular **sem instalar nada**;
- vira app Android de duas formas: **PWA** (instalar pelo Chrome) ou **APK** (empacotado com Capacitor);
- o código é pequeno e fácil de a equipe ler e alterar.

Se mais tarde a equipe quiser migrar para Unity/Godot, as regras (`level.js`, `geometry.js`) servem como referência.

## 5. Estrutura do projeto

```
pathfinder-puzzle/
├── README.md
├── package.json                 scripts para o Capacitor (APK)
├── capacitor.config.json        nome e id do app Android
├── docs/DOCUMENTACAO.md         este arquivo
└── www/                         tudo o que roda no navegador/celular
    ├── index.html               as 5 telas (HTML)
    ├── manifest.webmanifest     dados de instalação (PWA)
    ├── sw.js                    service worker (modo offline)
    ├── css/style.css            visual de todas as telas
    ├── fonts/                   fonte Poppins embutida (licença OFL)
    ├── icons/                   ícones do app (192 e 512 px)
    └── js/
        ├── config.js            constantes, dificuldades e formas das peças
        ├── storage.js           salvar opções no aparelho
        ├── audio.js             bipes simples
        ├── geometry.js          matemática: distância e cruzamento de segmentos
        ├── level.js             geração aleatória da fase
        ├── background.js        fundo de espaço (nebulosa e estrelas)
        ├── help.js              conteúdo e navegação da Ajuda
        ├── game.js              tela de jogo: desenho, arrastar, cronômetro
        └── app.js               inicialização, navegação, escala da tela, opções
```

Ordem de carregamento (importa, pois um arquivo usa o anterior):
`config → storage → audio → geometry → level → background → help → game → app`.

## 6. Como o código funciona

### 6.1 Namespace `PP`
Todos os arquivos adicionam coisas a um objeto global `PP` (ex.: `PP.Game`, `PP.Level`). Não usei módulos ES
porque eles não funcionam ao abrir `index.html` com duplo clique.

### 6.2 Escala da tela
O design inteiro foi feito em **819 x 1456 px** (tamanho das telas do PDF). `app.js → fitScreen()` calcula
`escala = min(largura/819, altura/1456)` e aplica no `#app` via variável CSS `--s`. Assim as medidas do CSS são
exatamente as do PDF e o jogo se adapta a qualquer celular. Em telas mais compridas sobram faixas de fundo estrelado.

### 6.3 Navegação (`app.js`)
Cada tela é uma `<section class="screen" id="screen-NOME">`; só uma tem a classe `active`.
- `data-go="NOME"` num botão → abre a tela e empilha a atual no histórico.
- `data-back` → volta para a tela anterior.
- `data-difficulty="easy|medium|hard"` → abre o jogo com aquela dificuldade.

Para criar uma tela nova: adicione uma `<section>` no HTML, um botão `data-go` e (se quiser) um `data-theme` de fundo.

### 6.4 Fundo (`background.js`)
Desenha nebulosas (manchas de gradiente) e estrelas em um canvas. Há 3 temas (`home`, `difficulty`, `dark`),
escolhidos pelo `data-theme` da tela. Usa um gerador com semente, então o fundo não "pisca" ao redesenhar.

### 6.5 Fases (`level.js`)
Coordenadas de fase são em **vértices da grade** (0 a 10). `generate(dificuldade)`:
1. Põe o personagem no centro (5,5) - RG-01.
2. Sorteia o portal em um canto - RG-02.
3. Sorteia até 12 peças (formas de `config.js → SHAPES`) em posições aleatórias, rejeitando as que cruzam outra peça
   ou tocam o centro/portal - RG-03.
4. Sorteia moedas (médio/difícil) e inimigos (difícil) em vértices livres e afastados.

Cada peça é `{ id, name, segs, w, h, x, y }`. `segs` são os segmentos `[x1,y1,x2,y2]` da forma; `x,y` é a posição atual.
Peças só se movem; nunca giram nem mudam de forma (RG-04).

### 6.6 Arrastar peças (`game.js`)
Usa **Pointer Events**, que cobrem mouse e toque com o mesmo código (RF-26).
- `pointerdown`: acha a peça mais próxima do dedo (raio de 26 px) e guarda o deslocamento do toque.
- `pointermove`: a peça acompanha o dedo, presa dentro do tabuleiro (RF-08).
- `pointerup`: **encaixa na grade** (arredonda para o vértice mais próximo - RF-12). Se a posição final cruza ou
  sobrepõe outra peça, a peça **volta ao lugar anterior** (RF-09). Encostar pontas é permitido (é a conexão).

A posição do toque é convertida com `getBoundingClientRect()`, o que compensa a escala da tela.

### 6.7 Estados e cronômetro (`game.js`)
- `mode = "edit"`: peças móveis, tempo parado.
- `mode = "run"`: peças travadas, tempo correndo (`tick()` a cada 200 ms).
- Zerou → `timeUp()` restaura as posições originais e volta para `edit`.

**Ponto de extensão da beta:** a função `startRun()` está vazia (marcada com `TODO`). É ali que entrará o cálculo
do caminho (BFS/A*) e a animação do personagem.

### 6.8 Geometria (`geometry.js`)
`segmentsConflict(a, b)` usa o teste de orientação: dois segmentos conflitam se **se cruzam no meio** ou **se sobrepõem
em linha reta**. Tocar só nas pontas não conta (RG-06).

### 6.9 Dados salvos (`storage.js`)
Opções ficam em `localStorage` (chave `pathfinder-puzzle:v1`): `{ sound, colorblind }`.

### 6.10 Modo daltônico
Troca as variáveis CSS `--good/--mid/--bad` (verde/amarelo/vermelho) por azul/amarelo/laranja (paleta Okabe-Ito).

## 7. Como testar

### 7.1 No PC
- Duplo clique em `www/index.html`, **ou**
- Terminal na pasta do projeto: `python -m http.server 8000 --directory www` e abra `http://localhost:8000`.
- Para ver como no celular: Chrome → `F12` → botão de dispositivo (Ctrl+Shift+M) → escolha um celular.

### 7.2 No celular - **Caminho A: mesma rede Wi-Fi** (mais simples e seguro, nada é instalado)
1. Conecte PC e celular **no mesmo Wi-Fi**.
2. No PC, rode o servidor do item 7.1 (porta 8000).
3. Descubra o IP do PC: Windows → `ipconfig` (procure *Endereço IPv4*, ex. `192.168.0.15`); Mac/Linux → `ifconfig`/`ip a`.
4. No Chrome do celular, abra `http://192.168.0.15:8000` (use o seu IP).
5. Se não abrir, permita o Python no firewall do Windows (rede **privada**). Ao terminar, feche o servidor (Ctrl+C).

Seguro porque só aparelhos da sua rede local enxergam o jogo e nada vai para a internet.

### 7.3 No celular - **Caminho B: instalar como app (PWA)**
O Android só deixa instalar PWA por **HTTPS**. O jeito mais fácil e gratuito:
1. Entre em <https://app.netlify.com/drop> e arraste a **pasta `www`**. Você recebe um link `https://...`.
2. Abra o link no Chrome do celular → menu (⋮) → **Instalar app** / **Adicionar à tela inicial**.
3. O jogo abre em tela cheia, com ícone próprio, e funciona offline.

(O link é público para quem o conhecer. Por ser uma alpha sem dados pessoais, o risco é baixo; apague o site no Netlify depois da apresentação.)

### 7.4 No celular - **Caminho C: gerar o APK** (app Android de verdade)
Necessário no PC: [Node.js LTS](https://nodejs.org), [Android Studio](https://developer.android.com/studio) (instala o JDK e o SDK).

```bash
# 1. na pasta do projeto (onde está o package.json)
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android          # cria a pasta android/ (só na primeira vez)
npx cap sync android         # copia a pasta www para o app (repita a cada mudança)
npx cap open android         # abre no Android Studio
```
2. No celular: **Configurações → Sobre o telefone →** toque 7 vezes em *Número da versão* → volta →
   **Opções do desenvolvedor → Depuração USB** (ligar).
3. Conecte o cabo USB, aceite "Permitir depuração" no celular, escolha o aparelho no Android Studio e clique em **Run ▶**.
4. Para um arquivo `.apk` para enviar a colegas: *Build → Build Bundle(s)/APK(s) → Build APK(s)*.
   Instale só APKs que **você mesmo gerou** e nunca baixe APK de sites desconhecidos.

Dica: antes de gerar, em `app.js` o registro do service worker só roda em http/https, então dentro do APK ele é
ignorado sem problema (os arquivos já ficam no aparelho).

## 8. Mapa de requisitos do GDD nesta alpha

| ID | Status | Onde |
|---|---|---|
| RF-01, RF-02, RF-03, RF-05 | Feito (básico) | `level.js` |
| RF-04, RG-10 (solução garantida) | Pendente | `level.js` |
| RF-06, RF-07, RF-08, RF-09, RF-10 | Feito | `game.js` |
| RF-11, RF-16, RG-05 (Iniciar e travar) | Feito | `game.js` |
| RF-12 (encaixe) | Feito | `game.js` |
| RF-13 (desfazer/refazer) | Pendente | - |
| RF-15 (limite de tempo) | Parcial: cronômetro de 1:30 | `game.js` |
| RF-17, RF-18 (vitória/derrota) | Pendente | `startRun()` |
| RF-19 (modo padrão) | Parcial (só planejamento) | `game.js` |
| RF-20 a RF-22 (gravitacional) | Pendente | - |
| RF-25 (menu principal) | Feito | `index.html` |
| RF-26 (toque) | Feito | `game.js` |
| RF-27 (tela de jogo) | Parcial (sem desfazer/arrastes) | `index.html` |
| RF-28 (progressão de fases) | Pendente | - |
| RF-29 (tutorial) | Parcial: telas de Ajuda | `help.js` |
| RF-30 (salvar local) | Parcial: só opções | `storage.js` |
| RF-31 (volume, idioma, daltonismo) | Parcial: som on/off e daltonismo | `app.js` |
| RF-32 (pausa) | Parcial: "Editar" pausa o tempo | `game.js` |

## 9. Próximos passos sugeridos (beta)

1. **Gerar a fase a partir de uma solução** (RF-04): criar primeiro um caminho centro → portal e depois espalhar as peças.
2. **Calcular o caminho** em `startRun()`: montar um grafo com os vértices das peças conectadas (pontas coincidentes ou cruzamentos) e rodar BFS a partir do centro.
3. **Animar o personagem** pelo caminho; vitória ao chegar ao portal, derrota em beco sem saída ou inimigo; moedas obrigatórias.
4. Telas de vitória/derrota (tentar de novo, próxima fase, menu) e desbloqueio de fases.
5. Desfazer/refazer, contador de arrastes, pausa.
6. Modo gravitacional (pode usar a biblioteca Matter.js ou física própria).

## 10. Problemas comuns

| Sintoma | Solução |
|---|---|
| Tela em branco ao abrir | Abra o console (`F12`) e veja o erro; confira se a pasta `www` está completa |
| Alterei o código e o celular não mudou | Aumente `CACHE_VERSION` em `sw.js` (o app guarda arquivos em cache) |
| Não consigo arrastar peça | Toque bem em cima da linha (raio de ~26 px); no modo "Editar" as peças ficam travadas |
| Celular não abre o endereço do PC | Mesmo Wi-Fi? Firewall liberado? IP correto? |

## 11. Créditos e licenças

- Fonte **Poppins** - SIL Open Font License (arquivo em `www/fonts/`).
- Restante do código: equipe do projeto (Rapazes, 2026).
