export const kmeansCopy = {
  unsupervised: {
    title: 'Aprendizagem não supervisionada',
    text: 'Os pontos chegam sem rótulos ou respostas corretas. O algoritmo procura estrutura somente pelas posições e semelhanças presentes nos dados.',
  },
  centroid: {
    title: 'O que é um centroide?',
    text: 'É o ponto médio de um grupo. Ele não precisa ser uma observação real: suas coordenadas são a média de todos os pontos atribuídos ao cluster.',
  },
  eqt: {
    title: 'Erro quadrático total (EQT)',
    text: 'Somamos, para cada observação, o quadrado da distância até o centroide do seu cluster. Quanto menor o EQT, mais compactos ficaram os grupos.',
  },
  initialization: {
    title: 'Por que a inicialização importa?',
    text: 'O K-Means pode chegar a soluções diferentes quando começa em lugares diferentes. Uma seed torna o experimento reproduzível; o k-means++ tende a separar melhor os centros iniciais.',
  },
  whyFour: {
    title: 'Por que K = 4 nesta base?',
    text: 'A dispersão revela quatro regiões bem separadas e o cotovelo do EQT aparece em torno de quatro grupos. É uma leitura didática forte, apoiada por geometria e métrica.',
  },
  graphVsMetric: {
    title: 'Gráfico e métrica se complementam',
    text: 'O gráfico mostra forma, separação e possíveis sobreposições. A métrica resume compactação. Nenhum dos dois, isoladamente, conhece o significado real dos grupos.',
  },
};

export const kmeansThinkingSteps = [
  { number: '01', title: 'Escolher K', text: 'Defina quantos grupos o algoritmo deverá procurar.' },
  { number: '02', title: 'Iniciar centroides', text: 'Posicione K referências iniciais no espaço dos dados.' },
  { number: '03', title: 'Atribuir pontos', text: 'Associe cada ponto ao centroide mais próximo.' },
  { number: '04', title: 'Recalcular', text: 'Mova cada centroide para a média do seu grupo.' },
  { number: '05', title: 'Repetir', text: 'Alterne atribuição e média até os centros estabilizarem.' },
  { number: '06', title: 'Acompanhar o EQT', text: 'Observe se o erro cai e deixa de mudar.' },
];
