# Convolução 2D — Chaprendizagem

Módulo da disciplina de Aprendizagem Profunda de Modelos Generativos, disponível em `/convolucao`. Demonstra convolução espacial em RGB e escala de cinza, com comparação visual, inspeção por pixel e exportação em PNG.

## Fluxo e consistência

- Conteúdo disponível desde a abertura, com navegação por seções e botão “Ir para o laboratório”.
- Definição matemática, conversão da resposta, exemplo numérico, catálogo dos oito filtros, configuração, comparação, inspeção e roteiro de apresentação.
- Relação com CNNs, correlação cruzada, dimensões de saída, contagem de parâmetros e aplicações em autoencoders, VAEs, GANs e difusão. Filtros manuais não representam treinamento ou geração de amostras.
- Paleta e shell globais, ícones Lucide, componentes por feature, rota lazy e CSS próprio, seguindo a organização recente do Sonar.
- A nova transformação parte sempre da entrada original. Mudar imagem ou configuração descarta o resultado anterior e cancela qualquer execução ativa. É necessário aplicar novamente.
- RGB e cinza são executados juntos e comparados com suas respectivas entradas; a alternância de visualização não recalcula o filtro.

## Operação implementada

Convolução espacial com passo 1, saída nas dimensões da entrada e kernel quadrado de tamanho ímpar 3 ou 5. O kernel informado é girado em 180° antes dos produtos. A inspeção apresenta o kernel girado, valores da vizinhança, produtos, soma e conversão em pixel. Isso diferencia convolução de correlação cruzada para kernels assimétricos.

RGB é filtrado por canal, sem misturar R, G e B. O cinza usa `round(0.2126 R + 0.7152 G + 0.0722 B)` sobre valores sRGB em 8 bits, sem linearização, e recebe a mesma operação com um único canal lógico. A entrada em cinza é calculada uma vez por imagem. O worker mantém RGB e cinza em memória e executa os dois filtros sem bloquear a thread da interface; novas aplicações enviam apenas os parâmetros.

Ordem da resposta: soma → divisão → módulo opcional → deslocamento → limitação a 0–255 → arredondamento. O divisor deve ser finito, com módulo mínimo de 0,000001; o deslocamento aceita −255 a 255; os pesos aceitam −100 a 100. As respostas antes de limitar podem ser negativas ou maiores que 255. Os percentuais de saturação contam essas respostas por canal, antes do arredondamento; o percentual de mudança conta pixels com pelo menos um canal alterado.

Tratamentos de borda: reflexão incluindo o pixel extremo (simetria de meia amostra), repetição do extremo ou zeros. Funcionam também quando a imagem é menor que a janela.

Definição, bordas e fixture independente dos testes: [SciPy — ndimage.convolve](https://docs.scipy.org/doc/scipy/reference/generated/scipy.ndimage.convolve.html). Convenção de saída do mesmo tamanho: [SciPy — signal.convolve2d](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.convolve2d.html).

## Imagens e limites

Dois exemplos SVG locais, desenhados para o módulo, são rasterizados antes de filtrar. Não dependem de serviços externos. Upload aceita PNG, JPEG e WebP de até 20 MB e 40 megapixels; o maior lado é reduzido a 640 px sem ampliar imagens menores. Transparências recebem fundo branco. As dimensões originais e processadas são informadas; os PNGs exportados usam as dimensões processadas. A operação isolada preserva alfa, embora a entrada da interface seja opaca.

Imagens, parâmetros e resultados ficam na memória da página. Uploads não são enviados ao servidor. URLs temporárias são revogadas; o worker ocioso é reutilizado entre aplicações. Execuções ativas são interrompidas ao trocar a entrada/configuração, e o worker é terminado ao sair da página. O navegador precisa suportar Canvas 2D e Web Workers.

## Organização e validação

- `src/features/convolution/data/`: filtros e exemplos.
- `lib/convolution.js`: matemática pura; `convolution.worker.js`: execução fora da interface; `imageIO.js`: leitura e PNG.
- `hooks/useConvolutionLab.js`: ciclo de execução e cancelamento.
- `components/`, `pages/` e `styles/`: interface responsiva com foco visível, controles por teclado, status e movimento reduzido.
- `tests/convolution.test.js`: fixture assimétrica independente, direção do kernel, RGB/alfa, cinza, bordas em imagens pequenas, normalização, saturação, rastreio e validação de entrada.

Comandos: `npm run test:convolution`, `npm test`, `npm run lint`, `npm run build`.

## Verificação em 12 de outubro de 2026

`npm test`: 128 testes aprovados, incluindo os 10 do novo módulo. Lint sem avisos, build de produção concluído e `git diff --check` limpo. No navegador, foram verificados abertura progressiva, validação do divisor zero, aplicação de nitidez e Sobel, edição e aplicação do kernel 5×5, descarte do resultado ao mudar parâmetros, seleção de pixel por clique e coordenadas, upload local e exportação dos dois PNGs. O filtro identidade preservou 100% dos pixels da imagem reenviada; o centro 2/divisor 2 do kernel 5×5 também produziu 0% de alteração.

O PNG RGB exportado tem 640×420 px; seu pixel (0,0), canal R, vale 3, igual ao trace do Sobel com módulo e divisor 1. O PNG cinza da execução com divisor 2 tem 640×420 px e valor 2 nos três canais desse pixel, com alfa 255. O build de produção executou o worker sem erros no console. Capa e quatro acessos à nova rota conferidos na Home.

Responsividade conferida em 1440/1280 px, 390 px e 320 px; as telas móveis ficaram sem transbordamento horizontal. Evidências: [comparação RGB e cinza](convolution/comparison.jpg) e [edição de kernel em 320 px](convolution/mobile.jpg).

## Revisão de conteúdo em 13 de outubro de 2026

Removida a identificação “Trabalho” do módulo e de seus acessos. Fórmulas e explicações são visíveis desde a abertura; o catálogo mostra kernels e parâmetros. O roteiro orienta a comparação de filtros, a justificativa numérica de um pixel e a discussão das características aprendidas em redes. A seção anterior registra a validação da versão de 12 de outubro; suas evidências visuais precedem esta revisão.

## Otimização da troca de filtros

A teoria e os canvases usam memoização; as coordenadas do pixel selecionado permanecem estáveis quando apenas os parâmetros mudam. O worker ocioso conserva a entrada e a escala de cinza, sem recriação ou cópia da imagem em cada aplicação. O cálculo pré-computa coordenadas de borda, ignora pesos zero e compartilha a busca de vizinhos entre os canais RGB.

Benchmark local em Node, entrada sintética 640 × 420, mediana de três execuções após aquecimento: nitidez 49 → 21 ms; média 54 → 23 ms; gaussiano 48 → 21 ms. Esses tempos medem apenas o cálculo RGB, não a renderização ou a latência total no navegador. Testes verificam a correspondência com a inspeção inclusive em kernels 5 × 5 fracionários, estatísticas e reutilização/substituição da entrada no worker com transferência dos buffers de saída.

## Correção do pico de memória na renderização

O consumo excessivo também ocorria com o cálculo otimizado. Foram corrigidos dois caminhos de crescimento da memória.

No desenvolvimento, o React 19.2.6 enumera as props modificadas para criar os registros de desempenho. Os objetos de imagem expunham `data` como propriedade enumerável: o profiler percorria mais de um milhão de posições do `Uint8ClampedArray` por imagem, gerando grandes listas de propriedades e cópias nos registros de User Timing. Isso atingia vários componentes em cada troca de filtro. `imageFrame.js` agora mantém o buffer em uma propriedade não enumerável; os pixels continuam acessíveis por `.data`, e os metadados continuam visíveis. A mensagem para o worker expõe o buffer explicitamente, pois structured clone omite propriedades não enumeráveis. Não foram desativados o profiler ou o Strict Mode.

O isolamento do CSS também identificou a regra do canvas (`width: 100%; height: auto`): retirar somente essa regra estabilizou a renderização. A limpeza e o redimensionamento do bitmap passam por dimensões zero, e seu tamanho intrínseco não deve determinar o tamanho da grade de comparação.

Cada contêiner agora define a proporção a partir das dimensões da imagem; o canvas ocupa essa área por posicionamento absoluto, com largura e altura de 100%. Zerar ou restaurar o bitmap deixa de alterar o espaço ocupado pela imagem. A proporção visual, os pixels exportados e as coordenadas da inspeção permanecem iguais.

Foi acrescentado `scripts/check-convolution-browser.mjs`. Com `npm run dev` aberto, execute `npm run test:convolution:browser`. Para o build servido por `npm run preview`, use `CONVOLUTION_URL=http://127.0.0.1:4173 npm run test:convolution:browser`. O script inicia um Chromium em perfil temporário; `CHROME_BIN` permite informar o executável. Em Linux, uma medição de PSS encerra somente o navegador de teste se ele ultrapassar 768 MiB.

A regressão verifica que os estados transitórios 0 × H, 0 × 0 e W × 0 preservam a área visual, aplica 51 filtros com um único worker e uma cópia da entrada, testa 5 × 5, seis cancelamentos e saída da página sem worker ativo. Também limita o tamanho dos registros do profiler: nas execuções de desenvolvimento em Chromium e Firefox, a maior lista continha 46 propriedades, sem enumeração dos pixels. Três testes de unidade verificam acesso aos pixels, preservação dos resultados e envio completo dos buffers ao worker.

O cenário passou em desenvolvimento e produção no Firefox 154.0 via WebDriver BiDi e no Chromium 153.0.8010.36. Em desenvolvimento, os picos observados de PSS foram aproximadamente 745 MiB no conjunto de processos do Firefox e 527 MiB no Chromium. Em produção, os picos foram 667 MiB no Firefox e 476 MiB no Chromium. As amostras são tomadas a cada 200 ms; os números incluem o navegador e variam por ambiente. Não representam apenas o heap JavaScript nem o consumo de uma aba em uma sessão já aberta.

A verificação adicional passou com trocas de exemplos, uploads PNG/JPEG/WebP, rejeição de cabeçalho com dimensões excessivas, alternância RGB/cinza, inspeção por pixel e larguras de 390 e 320 px sem transbordamento. Os 140 testes da suíte, lint e build passaram.
