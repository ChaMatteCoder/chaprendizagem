# Chaprendizagem de Máquina

Base inicial de um laboratório acadêmico para registrar estudos, experimentos e resultados da disciplina de Aprendizagem de Máquina.

O primeiro módulo implementado é **Perceptron - Reconhecimento de Dígitos**, usando matrizes 5x4 com valores `1` e `-1`.

## Stack escolhida

- **React + Vite**: simples de rodar, rápido para desenvolver e fácil de expandir.
- **React Router**: organização das páginas do laboratório.
- **Lucide React**: ícones leves e consistentes.
- **Recharts**: gráficos para acompanhar treinamento e resultados.

Não foram usadas bibliotecas de aprendizado de máquina. A lógica real do Perceptron permanece manual e pode ser integrada aos poucos.

## Como rodar

```bash
npm install
npm run dev
```

Acesse:

```text
http://127.0.0.1:5173/
```

Para gerar a versão de produção:

```bash
npm run build
```

Para servir o build localmente:

```bash
npm run serve:dist
```

## Páginas

- `/` - Página inicial do laboratório.
- `/perceptron/teoria` - Base teórica do Perceptron.
- `/perceptron/modelo` - Modelo funcional com matriz interativa.
- `/perceptron/resultados` - Treinamento e resultados.

## Dados e integração

- Os dígitos 0 a 9 estão em `src/data/digits.js`, convertidos a partir da base Python existente.
- A previsão da interface está isolada em `src/lib/perceptronSimulator.js`.
- Os dados do painel de resultados estão mockados em `src/data/mockResults.js` e devem ser substituídos pelos resultados reais do treino quando a integração estiver pronta.

Os arquivos Python originais (`dados.py`, `perceptron.py`, `rede_perceptron.py`, `main.py`) foram preservados.
