# Prompt para o Hermes gerar o APK (plano B)

> O jogo já pode ser **instalado no celular sem APK** (PWA: Chrome → menu ⋮ → *Instalar app*).
> Use este prompt só se a equipe realmente quiser um arquivo `.apk`. A geração depende do Android SDK,
> que não existe no ambiente online do Claude, por isso o pedido é para o Hermes, na máquina do Maycon.

Cole o texto abaixo no Hermes (rodando no Windows, com o repositório clonado):

---

Você é o agente de build do projeto **Pathfinder Puzzle** (repositório `Maycon23123/pathfinder-puzzle`, privado).
Objetivo: gerar um **APK de debug instalável** a partir da pasta `www/`, usando Capacitor, e deixar o arquivo em
`dist/pathfinder-puzzle-debug.apk`.

Contexto: o app é HTML/CSS/JS puro em `www/` (sem bundler). `capacitor.config.json` e `package.json` já existem na raiz
(appId e nome já configurados). O jogo funciona offline.

Passos (pare e me avise se algo falhar, mostrando o erro completo):
1. Verifique Node.js LTS (`node -v`), Java JDK 17+ (`java -version`) e o Android SDK (variável `ANDROID_HOME`
   ou `ANDROID_SDK_ROOT`; instale as *command-line tools*, `platform-tools`, `platforms;android-34` e
   `build-tools;34.0.0` se faltarem, aceitando as licenças com `sdkmanager --licenses`).
2. Na raiz do repositório: `npm install @capacitor/core @capacitor/cli @capacitor/android`.
3. `npx cap add android` (só se a pasta `android/` ainda não existir), depois `npx cap sync android`.
4. Em `android/app/src/main/AndroidManifest.xml`, mantenha a orientação **portrait**
   (`android:screenOrientation="portrait"` na activity principal).
5. Gere o APK: `cd android && ./gradlew assembleDebug` (no Windows: `gradlew.bat assembleDebug`).
6. Copie `android/app/build/outputs/apk/debug/app-debug.apk` para `dist/pathfinder-puzzle-debug.apk`.
7. Rode `npm test` na raiz (testes do gerador de fases) e confirme que passa.
8. Me diga o caminho do APK e como instalar: copiar para o celular e abrir, permitindo "instalar apps desta fonte"
   quando o Android pedir. Não envie o APK para nenhum serviço externo.

Regras: não altere nada em `www/js/`; não faça commit de `android/build/`, `node_modules/` nem do APK (já estão no
`.gitignore`); não use chaves de assinatura de produção (é só um APK de debug para testes da equipe).
