# IAdivinha! — checkpoint da Etapa 1

## Escopo entregue

Rota `/iadivinha`, tela inicial, cabeçalho, três cartões Gato/Pato/Sapato, CTA, regras e layout responsivo.
React, CSS e SVG originais; nenhuma imagem de referência é usada como interface.
Sem canvas, cronômetro, sessão, probabilidades, treinamento ou modelo nesta etapa.

O botão **Jogar agora** abre um diálogo acessível informando que as partidas estão em preparação.
**Sobre** apresenta o contexto acadêmico. **Como funciona** e **Jogar** são âncoras locais.
O coração é decorativo, sem ação fictícia. Há retorno ao Chaprendizagem e acesso pelo catálogo da Home.

## Arquivos e decisões

- `src/features/iadivinha/pages/IAdivinhaPage.jsx`: composição, título de página com restauração ao sair e diálogo nativo.
- `src/features/iadivinha/components/GameHeader.jsx`: marca, navegação e coração SVG.
- `src/features/iadivinha/components/HomeScreen.jsx`: cartões, regras, CTA e anotações.
- `src/features/iadivinha/components/ClassDoodle.jsx`: desenhos SVG originais das três categorias.
- `src/features/iadivinha/styles/iadivinha.css`: tokens e regras sob `.iadivinha`, responsividade e movimento reduzido.
- `src/app/App.jsx`: rota carregada sob demanda e composição que mantém o layout antigo nas demais rotas.
- `src/pages/HomePage.jsx`: entrada no catálogo, marcada como “Em preparação”.
- `public/fonts/iadivinha/`: Lilita One e Patrick Hand locais, com suas licenças OFL.
- `eslint.config.js`, `package.json`, `package-lock.json`: lint da feature, App e Home; somente novas dependências de desenvolvimento.
- `README.md`: acesso, escopo e comandos de validação.

As versões dos pacotes que já existiam no lockfile não foram atualizadas. Não houve alteração de CSS global.
O texto do CTA usa tinta escura sobre coral para contraste superior ao branco da referência.
O manifesto de saídas do classificador será introduzido com a lógica do jogo; os cartões desta etapa não definem índices de inferência.

## Validação

- `npm test`: 15 testes existentes aprovados; cobrem K-Means e newsletter, não inferência ou canvas.
- `npm run lint`: aprovado, sem avisos; escopo explicitamente limitado aos arquivos citados.
- `npm run build`: compilação de produção aprovada.
- Chrome: revisão visual desktop 1536 × 1024, mobile 390 × 844 e largura 320 px, sem transbordamento horizontal detectado.
- CTA e Sobre: abertura, fechamento, Escape e retorno de foco conferidos. Link de regras navega à âncora correta.
- Retorno à Home conferido, incluindo restauração do título e layout global; rota de reconhecimento manuscrito abriu com seu cabeçalho e conteúdo originais. Não foi repetida a avaliação funcional do classificador antigo.
- Bundle final da feature: JavaScript 7,56 kB (2,68 kB gzip), CSS 9,16 kB (2,84 kB gzip), além das fontes locais. Build final em 26,33 segundos.
- Capturas em `docs/iadivinha/screenshots/`.

Comandos auxiliares: `git status --short`, `git diff --stat`, `npm ls`, `npm audit --json` e comparação programática do lockfile antes/depois.
Fontes obtidas do repositório oficial Google Fonts; nenhum serviço externo é necessário para carregá-las em execução.

## Limitações e riscos restantes

- A partida ainda não pode ser jogada, conforme o limite da Etapa 1.
- A validação mobile usa dimensões emuladas no Chrome; não representa teste em dispositivo físico ou leitor de tela real.
- `npm audit` reportou seis dependências com avisos (duas moderadas, quatro altas): baseline-browser-mapping, browserslist, nanoid, postcss, react-router e react-router-dom. Todas já constavam no lockfile anterior, nas mesmas versões. Não foi executado `npm audit fix` nem feita atualização ampla.
- ESLint 9 foi instalado por compatibilidade com o conjunto de plugins; o registro emitiu aviso de fim de suporte. Uma migração do ferramental pode ser planejada separadamente.
- O bundle global já contém bibliotecas e estilos dos laboratórios; a nova feature é carregada sob demanda e não importa TensorFlow.js.
- Captura de página completa pelo protocolo do navegador excedeu o tempo limite; foram usadas capturas do viewport.

## Próxima etapa proposta — aguardar aprovação

Etapa 2: sequência equilibrada de seis rodadas, estados de preparação/desenho/processamento/resultado/resumo,
canvas com Pointer Events e desfazer/limpar/pincel, dez segundos, término antecipado, rejeição de canvas vazio,
classificador simulado explicitamente identificado e desacoplado do desafio, pontuação e testes de sequência/transições.
Não iniciar treinamento ou integração de modelo real nessa etapa.

## Fontes

- [Google Fonts — Lilita One](https://github.com/google/fonts/tree/main/ofl/lilitaone)
- [Google Fonts — Patrick Hand](https://github.com/google/fonts/tree/main/ofl/patrickhand)
- [ESLint — configuração](https://eslint.org/docs/latest/use/configure/configuration-files)
