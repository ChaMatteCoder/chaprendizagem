# Trabalho 05 — Convolução

O enunciado fornecido pede implementar convolução, aplicar a uma imagem em escala de cinza e a uma colorida e apresentar a original junto do resultado. O módulo fica em `/convolucao`, acessível pelo catálogo, pelo Módulo 05 na Home e pelo rodapé. O número **Trabalho 05** vem desse enunciado de processamento de imagens; não substitui o Trabalho 05 de Adaline, que pertence a outra trilha.

## Fluxo e consistência

- Abertura progressiva como os laboratórios K-Means e Iris, com capa conceitual e botão “Abrir laboratório”.
- Teoria, configuração, comparação, inspeção numérica e roteiro de estudo.
- Paleta e shell globais, ícones Lucide, componentes por feature, rota lazy e CSS próprio, seguindo a organização recente do Sonar.
- A nova transformação parte sempre da entrada original. Mudar imagem ou configuração descarta o resultado anterior e cancela o worker ativo. É necessário aplicar novamente.
- RGB e cinza são executados juntos e comparados com suas respectivas entradas; a alternância de visualização não recalcula o filtro.

## Operação implementada

Convolução espacial com passo 1, saída nas dimensões da entrada e kernel quadrado de tamanho ímpar 3 ou 5. O kernel informado é girado em 180° antes dos produtos. A inspeção apresenta o kernel girado, valores da vizinhança, produtos, soma e conversão em pixel. Isso diferencia convolução de correlação cruzada para kernels assimétricos.

RGB é filtrado por canal, sem misturar R, G e B. O cinza usa `round(0.2126 R + 0.7152 G + 0.0722 B)` sobre valores sRGB em 8 bits, sem linearização, e recebe a mesma operação com um único canal lógico. O worker executa a conversão e os dois filtros sem bloquear a thread da interface.

Ordem da resposta: soma → divisão → módulo opcional → deslocamento → limitação a 0–255 → arredondamento. O divisor deve ser finito, com módulo mínimo de 0,000001; o deslocamento aceita −255 a 255; os pesos aceitam −100 a 100. As respostas antes de limitar podem ser negativas ou maiores que 255. Os percentuais de saturação contam essas respostas por canal, antes do arredondamento; o percentual de mudança conta pixels com pelo menos um canal alterado.

Tratamentos de borda: reflexão incluindo o pixel extremo (simetria de meia amostra), repetição do extremo ou zeros. Funcionam também quando a imagem é menor que a janela.

Definição, bordas e fixture independente dos testes: [SciPy — ndimage.convolve](https://docs.scipy.org/doc/scipy/reference/generated/scipy.ndimage.convolve.html). Convenção de saída do mesmo tamanho: [SciPy — signal.convolve2d](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.convolve2d.html).

## Imagens e limites

Dois exemplos SVG locais, desenhados para o módulo, são rasterizados antes de filtrar. Não dependem de serviços externos. Upload aceita PNG, JPEG e WebP de até 20 MB e 40 megapixels; o maior lado é reduzido a 640 px sem ampliar imagens menores. Transparências recebem fundo branco. As dimensões originais e processadas são informadas; os PNGs exportados usam as dimensões processadas. A operação isolada preserva alfa, embora a entrada da interface seja opaca.

Imagens, parâmetros e resultados ficam na memória da página. Uploads não são enviados ao servidor. URLs temporárias são revogadas; workers são terminados ao concluir, trocar a entrada/configuração ou sair da página. O navegador precisa suportar Canvas 2D e Web Workers.

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
