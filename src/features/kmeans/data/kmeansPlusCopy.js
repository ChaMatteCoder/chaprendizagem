export const kmeansPlusTheoryCards = [
  {
    id: 'initialization',
    title: 'O problema da inicialização',
    text: 'O K-Means precisa começar com K centroides. Se eles forem escolhidos em regiões pouco representativas ou muito próximas, o refinamento pode partir de uma configuração desfavorável.',
  },
  {
    id: 'variability',
    title: 'Por que as soluções podem mudar?',
    text: 'A função objetivo do K-Means admite mínimos locais. Por isso, sementes diferentes podem produzir partições, EQTs finais e quantidades de iterações diferentes para a mesma base.',
  },
  {
    id: 'plusplus',
    title: 'O que o K-Means++ muda?',
    text: 'Ele altera somente a escolha dos centroides iniciais. Depois da semeadura, atribuição e atualização seguem o mesmo ciclo de Lloyd usado pelo K-Means clássico.',
  },
  {
    id: 'distance',
    title: 'Amostragem proporcional a D²',
    text: 'Cada ponto recebe um peso igual ao quadrado da distância até o centroide já escolhido mais próximo. Pontos distantes acumulam maior probabilidade de se tornarem o próximo centroide.',
  },
  {
    id: 'eqt',
    title: 'Erro quadrático total (EQT)',
    text: 'O EQT soma a distância quadrática de cada observação ao centroide do cluster ao qual ela foi atribuída. Menor EQT indica grupos geometricamente mais compactos, não necessariamente mais significativos.',
  },
  {
    id: 'minibatch',
    title: 'O que é MiniBatchKMeans?',
    text: 'É uma aproximação que atualiza os centroides usando pequenos subconjuntos aleatórios da base. Cada passo processa menos pontos e reduz o custo computacional por iteração.',
  },
  {
    id: 'scale',
    title: 'Quando usar MiniBatchKMeans?',
    text: 'Ele é útil quando a base é grande, o tempo de resposta importa e uma pequena perda de precisão é aceitável em troca de maior eficiência e menor uso de memória.',
  },
];

export const kmeansPlusInitializationSteps = [
  {
    number: '01',
    title: 'Escolher o primeiro centroide',
    text: 'Selecione uma observação usando a seed do experimento, tornando a execução reproduzível.',
  },
  {
    number: '02',
    title: 'Calcular a distância mais próxima',
    text: 'Para cada ponto x, calcule D(x), a distância até o centroide escolhido mais próximo.',
  },
  {
    number: '03',
    title: 'Transformar D² em probabilidade',
    text: 'Eleve as distâncias ao quadrado e normalize os pesos. Regiões ainda distantes passam a ter maior chance de escolha.',
  },
  {
    number: '04',
    title: 'Sortear o próximo centroide',
    text: 'Faça uma escolha ponderada e repita o cálculo até obter K centroides iniciais distintos.',
  },
  {
    number: '05',
    title: 'Executar o ciclo de Lloyd',
    text: 'Atribua pontos, recalcule médias e repita até a tolerância ou o limite de iterações ser atingido.',
  },
];

export const kmeansPlusReferences = [
  {
    id: 'macqueen-1967',
    kind: 'Fundamento histórico',
    authors: 'MacQueen, J.',
    year: '1967',
    title: 'Some Methods for Classification and Analysis of Multivariate Observations',
    url: 'https://digicoll.lib.berkeley.edu/record/113015?v=pdf',
  },
  {
    id: 'lloyd-1982',
    kind: 'Algoritmo clássico',
    authors: 'Lloyd, S.',
    year: '1982',
    title: 'Least Squares Quantization in PCM',
    url: 'https://doi.org/10.1109/TIT.1982.1056489',
  },
  {
    id: 'arthur-vassilvitskii-2007',
    kind: 'K-Means++',
    authors: 'Arthur, D.; Vassilvitskii, S.',
    year: '2007',
    title: 'k-means++: The Advantages of Careful Seeding',
    url: 'https://research.google/pubs/k-means-the-advantages-of-careful-seeding/',
  },
  {
    id: 'sklearn-kmeans',
    kind: 'Referência prática',
    authors: 'scikit-learn',
    year: 'documentação atual',
    title: 'KMeans',
    url: 'https://scikit-learn.org/stable/modules/generated/sklearn.cluster.KMeans.html',
  },
  {
    id: 'sklearn-minibatch',
    kind: 'Referência prática',
    authors: 'scikit-learn',
    year: 'documentação atual',
    title: 'MiniBatchKMeans',
    url: 'https://scikit-learn.org/stable/modules/generated/sklearn.cluster.MiniBatchKMeans.html',
  },
  {
    id: 'sklearn-silhouette',
    kind: 'Escolha de K',
    authors: 'scikit-learn',
    year: 'exemplo técnico',
    title: 'Selecting the number of clusters with silhouette analysis on KMeans clustering',
    url: 'https://scikit-learn.org/stable/auto_examples/cluster/plot_kmeans_silhouette_analysis.html',
  },
];
