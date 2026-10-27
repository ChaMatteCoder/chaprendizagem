# Arquitetura

O projeto usa uma estrutura por features para facilitar a expansão do laboratório sem misturar assuntos diferentes.

## Convenções

- `src/app/` concentra a composição do aplicativo e as rotas principais.
- `src/pages/` guarda páginas globais.
- `src/components/` guarda componentes reutilizáveis por mais de um módulo.
- `src/features/<modulo>/` guarda tudo que pertence a um assunto específico.
- `experiments/` guarda implementações de apoio, protótipos e códigos de estudo que não são importados diretamente pela interface.

## Navegação

A navegação global deve permanecer genérica:

- `Home` para a landing page e o catálogo de projetos.
- `Sobre` para contexto e motivação do site.
- `Contato` para apresentação pessoal e canais externos.

Projetos específicos devem ser acessados por cards, módulos ou links internos, não como abas fixas do cabeçalho.

## Checklist para novos módulos

1. Criar `src/features/<modulo>/pages`.
2. Criar `src/features/<modulo>/components` quando houver UI específica.
3. Criar `src/features/<modulo>/data` para bases, mocks ou constantes.
4. Criar `src/features/<modulo>/lib` para lógica isolada.
5. Registrar as novas rotas em `src/app/App.jsx`.
6. Atualizar a Home e o README quando o módulo estiver apresentável.

## Módulos em preparação

- Convolução: [guia do Trabalho 05](convolucao.md). Rota lazy `/convolucao`, feature isolada com CSS próprio, abertura progressiva, filtros em worker e inspeção matemática em funções puras. A Home inclui o projeto e o Módulo 05; a trilha K-Means++ aponta para o novo laboratório.

- Sonar ou Azar? + SonarLab: [plano — Etapa 01](sonar-etapa-1.md), [dados — Etapa 02](sonar-etapa-2.md), [MLP — Etapa 03](sonar-etapa-3.md), [SonarLab — Etapa 04](sonar-etapa-4.md) e [menu/missão — Etapa 05](sonar-etapa-5.md). Família lazy `/sonar/*`: menu `/sonar`, missão `/sonar/missao`, laboratório `/sonar/lab`, com CSS próprio. `SonarApp` mantém o controlador da missão entre suas rotas; sair da família aborta tarefas e libera o oficial. O controlador preserva rótulos em memória privada até a revelação, recebe só vetores na inferência e compartilha o trace original com a seção Eco da missão. A sessão experimental do laboratório continua independente e limitada ao desenvolvimento. Oficial congelado em `public/models/sonar/official/`; arte submarina local em `public/images/sonar/`.
- Sonar, conclusão: [auditoria — Etapa 06](sonar-etapa-6.md) e [guia técnico para apresentação](sonar-guia-professor.md). `training/sonar/explain-example.mjs` reproduz uma previsão de desenvolvimento e suas contas usando o oficial validado, sem novo treinamento/avaliação. A evidência didática fica fora dos artefatos oficiais. A revisão final ajustou a leitura da navegação, dos percentuais e do fluxo da rede em telas estreitas.
- Sonar, mídia: [capa e trilhas](sonar-midia.md). A Home exibe um único card em Jogos. `SonarApp` mantém um elemento de áudio entre suas rotas; `useSonarSound` e `lib/audio/sonarSoundtrack.js` selecionam a faixa pelo caminho e preservam mute. Trocar seções do laboratório não reinicia a faixa. Sair de `/sonar/*` pausa e libera a mídia e remove os handlers de interação. Arquivos em `public/images/sonar/` e `public/audio/sonar/` chegam ao build sem transformação.
- Pixel em Pânico! + PixelLab: [plano — Etapa 01](pixel-etapa-1.md), [dados — Etapa 02](pixel-etapa-2.md), [CNN/exportação — Etapa 03](pixel-etapa-3.md), [PixelLab — Etapa 04](pixel-etapa-4.md), [jogo — Etapa 05](pixel-etapa-5.md), [exemplo de inspeção matemática](pixel/etapa-6-exemplo.json) e [guia técnico para o professor](pixel-guia-professor.md). Família lazy `/pixel/*`: menu `/pixel`, estação de jogo `/pixel/jogo` e laboratório científico `/pixel/lab`. Opera sobre uma CNN real de `61.130` parâmetros treinada na base oficial CIFAR-10 (`32×32×3` RGB, 10 classes), exportada para TensorFlow.js em `public/models/pixel/official/` e acompanhada de pacote de validação sem perdas (`public/data/pixel/demo-samples.json`).
