# enGAN.AI — Engana aí. Aprende aqui.

Base de interface do Trabalho 07, integrada ao ChAprendizagem em `/enganai`. O nome é lido como “engana aí” e destaca GAN e AI. Fifi representa o Gerador; Lupa, o Discriminador. “A Guerra dos Pixels” permanece como nome da arena.

## Evolução para o Ateliê de Investigação dos Pixels

A direção de arte da [proposta v2](proposta-v2/README.md) foi aprovada. A [Etapa 01 — Direção e contratos](etapa-01/README.md) definiu a especificação visual e os contratos. A [Etapa 02 — Cena e navegação](etapa-02/README.md) implementa o ateliê e os controles. A [Etapa 03 — DCGAN real](etapa-03/README.md) entrega dados preparados, duas execuções de treinamento, pesos, checkpoints e amostras verificáveis. A [Etapa 04 — Inferência na aplicação](etapa-04/README.md) exporta G/D para ONNX, mede a paridade e executa as redes no navegador, dentro da bancada. A [Etapa 05 — Missão jogável](etapa-05/README.md) completa o jogo: cinco evidências com fotos da partição `arena` e criações de G geradas na hora, revelação com o palpite da Lupa, relatório e progresso local.

## Escopo desta entrega

A interface disponível implementa a experiência visual e educacional. O pipeline da etapa 03 possui treinamento e pesos reais em `public/models/enganai/research/`. Desde a etapa 04, a bancada da arena carrega esses pesos em ONNX, confere suas assinaturas e reproduz as saídas de referência. Desde a etapa 05, a missão usa essas redes em rodadas pontuadas. As figuras de `etapa-03/` e a bancada mostram saídas da DCGAN; as prévias procedurais das outras telas continuam identificadas como conceituais.

| Rota | Experiência disponível |
| --- | --- |
| `/enganai` | Entrada imersiva, personagens integradas ao cenário e convite para o mural |
| `/enganai/missoes` | Três casos com prévias registradas da DCGAN, pré-requisitos, melhor resultado, conclusões e acesso ao aquecimento |
| `/enganai/arena?missao=primeiros-rastros` | Instruções com a bancada verificada, cinco rodadas (investigação e revelação), relatório revisável e progresso. `&semente=N` repete a seleção para depuração |
| `/enganai/aquecimento` | Quiz opcional de três perguntas conceituais, feedback, expressões e reinício |
| `/enganai/lab` | Fluxos do Gerador, Discriminador e treinamento; modos intuitivo/técnico; etapas selecionáveis |
| `/enganai/museu` | Evolução conceitual com desenhos procedurais, seleção de etapas e reprodução opcional |
| `/enganai/mutacoes` | Sementes reproduzíveis, interpolação numérica de vetores com 8 dimensões e coleção local |
| `/enganai/caos` | Explorações conceituais de colapso de modos, desequilíbrio e oscilação |

Os ambientes, as preferências e o guia ficam disponíveis nos controles compactos. As janelas usam o elemento nativo `dialog`, com Tab contido e fechamento por Escape. O layout inclui foco visível, foco após navegação e resposta, anúncios de feedback e respeito a movimento reduzido. A seleção de um caso leva o foco até seus detalhes, inclusive no celular.

## Identidade e assets

Paleta em carvão, madeira, papel, ameixa e petróleo, com âmbar reservado às ações. Tipografia Manrope e Lilita One servida localmente, com licenças em `public/fonts/enganai/`. Estilos e tokens ficam isolados em `src/features/enganai/styles/`.

Os assets atuais foram gerados com ChatGPT Imagem integrado (`image_gen`), a partir da direção aprovada e das referências de identidade:

- `public/images/enganai/atelier/`: três cenários, dois bustos transparentes, duas folhas de expressões e `prompts.json`.
- `docs/enganai/etapa-01/referencias/`: folhas originais e prompts das expressões.
- `public/images/enganai/cover.webp`: capa da base anterior, ainda usada no catálogo geral; os arquivos originais dessa identidade permanecem em `public/images/enganai/`.

Os PNGs originais foram mantidos no diretório de imagens geradas do Codex. As cópias de produção em WebP preservam a transparência dos personagens. As ilustrações são material de identidade visual; não são amostras produzidas pela DCGAN do projeto.

## Organização

`src/features/enganai/` separa páginas, componentes de interface, conteúdo didático e auxiliares numéricos. O módulo é carregado por lazy import. O catálogo de projetos, os módulos da Home e os links globais também apontam para ele.

`lib/illustration.js` contém somente funções didáticas determinísticas. `illustrationPixels` desenha peças de roupa simples e adiciona ruído procedural. `latentVector` produz valores pseudoaleatórios uniformes entre −1 e 1. Nenhuma dessas funções substitui um modelo. A interpolação é realmente numérica: `(1−t)zA + tzB`; ela ainda não passa por G.

A coleção armazena até 8 sementes em `enganai-seeds`. Preferências usam `enganai.preferences.v1`: som inicialmente desligado, movimento reduzido e explicações intuitivas/técnicas. Uma preferência de som salva exige novo gesto para retomá-lo após recarregar. Dados incompatíveis são preservados até a redefinição explícita. Sem armazenamento disponível, os ajustes funcionam em memória.

O mural lê `enganai.progress.v1` somente quando o registro é coerente e usa `dataMode: recorded`. A etapa 02 não grava conclusões. O aquecimento tem placar separado e não desbloqueia casos. Não há conta, upload ou servidor. A sequência do museu não atribui épocas fictícias aos desenhos.

## Pipeline científico e próxima integração

O [pipeline PyTorch](../../training/enganai/README.md) prepara o Fashion-MNIST e registra treinamento, pesos, configurações, vetores fixos, histórico e procedência. `npm run check:enganai`, `npm run test:enganai:training` e `npm run verify:enganai` verificam esses dados. `npm run report:enganai` reproduz as figuras da etapa 03. O ambiente Python isolado já está em `training/enganai/.venv/`; o guia documenta a reinstalação.

A etapa 04 concluiu a exportação ONNX, a paridade, o manifesto e o worker (`npm run export:enganai:onnx`, `npm run verify:enganai:onnx`). As próximas integrações usam essa base:

1. ~~Amostras reais e sintéticas com origem conhecida para a arena~~ — concluído na etapa 05 (`npm run prepare:enganai:arena`, `npm run verify:enganai:arena`).
2. Inferência por vetor/semente e por vetor interpolado, sem misturar pixels no lugar do espaço latente.
3. Resultados de experimentos registrados para substituir os exemplos conceituais do museu e da Câmara do Caos.

Até lá, as telas não inventam perdas, acurácia ou épocas treinadas.

## Executar e verificar

`npm run dev` inicia a aplicação; abra `/enganai`. `npm run lint`, `npm test` e `npm run build` verificam a integração. `npm run test:enganai` exercita persistência, progresso e ciclo de vida do áudio. `npm run test:enganai:browser` verifica o fluxo no servidor local já iniciado; `ENGANAI_URL` seleciona outra URL e `CHROME_BIN` permite indicar Chromium.

`npm run test:enganai:inference-browser` verifica a bancada com o build de produção em `http://127.0.0.1:4173`. Isso inclui paridade nas três épocas, falha de rede com nova tentativa, pesos adulterados e indisponibilidade.

`npm run test:enganai:mission-browser` joga missões completas no mesmo servidor.

Verificações e capturas: [etapa 02](etapa-02/README.md), [etapa 04](etapa-04/README.md) e [etapa 05](etapa-05/README.md). A revisão cobre oito rotas em 320, 390, 768 e 1440 px, teclado, preferências, isolamento do quiz, som e movimento reduzido. Os estados científicos continuam conceituais até as próximas etapas.
