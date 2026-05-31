# Chaprendizagem de Máquina

Chaprendizagem é um laboratório digital sobre aprendizagem de máquina. O projeto combina explicações teóricas, visualizações interativas e pequenos experimentos de código para transformar conceitos de modelos em páginas navegáveis e fáceis de revisar.

Os módulos atuais são **Perceptron - Reconhecimento de Dígitos** e **Adaline**, com o Trabalho 05 de classificação na base B2 e o Trabalho 06 de regressão linear com Adaline.

## Stack

- **React + Vite** para uma base leve, rápida e simples de expandir.
- **React Router** para navegação entre páginas e módulos.
- **Lucide React** para ícones consistentes.
- **Recharts** para gráficos de treinamento e métricas.
- **Python** em `experiments/` para preservar implementações e estudos de apoio.

## Estrutura do projeto

```text
chaprendizagem/
|-- docs/                         # Documentação técnica e decisões de organização
|-- experiments/                  # Experimentos e protótipos fora da interface React
|   `-- perceptron-python/         # Implementação original do Perceptron em Python
|-- scripts/                      # Utilitários locais
|-- src/
|   |-- app/                      # Composição principal e rotas
|   |-- assets/                   # Recursos estáticos do app
|   |-- components/               # Componentes reutilizáveis entre módulos
|   |-- features/                 # Módulos de estudo organizados por assunto
|   |   |-- adaline/
|   |   `-- perceptron/
|   |       |-- components/
|   |       |-- data/
|   |       |-- lib/
|   |       `-- pages/
|   |-- pages/                    # Páginas globais, como a Home
|   `-- styles/                   # CSS global
|-- index.html
|-- package.json
`-- vite.config.js
```

## Como rodar

Instale as dependências:

```bash
npm install
```

Execute em modo desenvolvimento:

```bash
npm run dev
```

Acesse:

```text
http://127.0.0.1:5173/
```

Gere a versão de produção:

```bash
npm run build
```

Sirva o build localmente:

```bash
npm run serve:dist
```

## Rotas atuais

- `/` - Landing page do laboratório, com projetos em carrossel.
- `/sobre` - História, motivação e proposta do projeto.
- `/contato` - Sobre mim e links principais.
- `/adaline` - Trabalho 05 com teoria, simulação, erro quadrático e teste da rede.
- `/adaline/regressao` - Trabalho 06 com regressão linear usando Adaline, comparação com regressão clássica, Pearson e R².
- `/perceptron/teoria` - Base teórica do Perceptron.
- `/perceptron/modelo` - Modelo visual com matriz interativa.
- `/perceptron/resultados` - Painel de treinamento, métricas e resultados.

## Funcionalidades em destaque

- Abertura progressiva dos trabalhos, para apresentar primeiro a capa e revelar a experiência quando o usuário inicia o estudo.
- Card contextual de próximo trabalho no fim das páginas, com animações contínuas e indicação do próximo conteúdo da trilha.
- Botão global `ScrollToTop`, exibido após rolagem em páginas longas para voltar suavemente ao topo.
- Simuladores editáveis para testar dados, parâmetros e resultados diretamente na interface.
- Gráficos com modos **Simplificada** e **Acadêmica**, alternando entre leitura arredondada e maior precisão numérica.
- Download dos gráficos gerados em PNG, respeitando o estado atual da visualização, incluindo zoom, dados alterados e curvas ocultas.

## Organização dos módulos

Cada novo assunto deve entrar em `src/features/<nome-do-modulo>/`, separando:

- `pages/` para telas do módulo.
- `components/` para componentes específicos do módulo.
- `data/` para bases, mocks e constantes.
- `lib/` para regras de negócio, simulações e integrações.

Componentes compartilhados entre vários assuntos ficam em `src/components/`. Experimentos, scripts acadêmicos e protótipos que não fazem parte direta da interface ficam em `experiments/`.

## Dados e integração

- Os dígitos 0 a 9 estão em `src/features/perceptron/data/digits.js`, convertidos a partir da base Python.
- A previsão visual da interface está isolada em `src/features/perceptron/lib/perceptronSimulator.js`.
- Os dados do painel de resultados estão mockados em `src/features/perceptron/data/mockResults.js`.
- A implementação Python original foi preservada em `experiments/perceptron-python/`.
- A base B2 do Adaline está em `src/features/adaline/data/b2Dataset.js`, convertida a partir da planilha `Basedados_B2.xlsx`.
- O treinamento do Adaline roda em `src/features/adaline/lib/adalineTrainer.js`.
- A base do Trabalho 06 está em `src/features/adaline/data/observationsDataset.js`.
- As funções matemáticas da regressão com Adaline estão em `src/features/adaline/lib/regressionAdaline.js`.
- Os gráficos do Trabalho 06 estão em `src/features/adaline/components/RegressionCharts.jsx`.

## Trabalho 06 - Regressão Linear com Adaline

O Trabalho 06 fica dentro do módulo Adaline e mostra como um neurônio linear adaptativo pode ajustar uma reta a uma base de observações bidimensionais.

A página permite:

- treinar uma Adaline por regra delta;
- comparar a reta aprendida com a regressão linear clássica;
- calcular coeficientes angular e linear;
- calcular correlação de Pearson e coeficiente de determinação;
- editar, limpar, restaurar ou gerar dados aleatórios;
- acompanhar o erro quadrático total por época;
- alternar curvas no gráfico de comparação;
- aplicar zoom no gráfico comparativo;
- exportar os gráficos no estado atual da visualização.
