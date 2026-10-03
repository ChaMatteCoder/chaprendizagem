# Etapa 06 — revisão final e apresentação

Concluída em 30/09/2026. Escopo autorizado: auditoria final das etapas anteriores, ajustes pequenos, material técnico para o professor e verificação. As referências são direção visual; seus números ilustrativos não foram usados como resultados.

## Entregas desta etapa

- [Guia para o professor](sonar-guia-professor.md): dez tópicos técnicos, fórmulas/símbolos/fontes, parâmetros da arquitetura efetiva, protocolo, métricas medidas, exemplo real, limitações, roteiro oral de aproximadamente 90 segundos e sete perguntas/respostas.
- [Exemplo em JSON](sonar/etapa-6-exemplo.json), reproduzível por `npm run explain:sonar`: uma amostra de desenvolvimento, pesos oficiais, 60 entradas, kernels, biases, ativações, produtos de um neurônio oculto e das duas saídas, Softmax, perda e gradiente.
- Legibilidade do SonarLab em telas estreitas: navegação em duas colunas com fonte 13,12 px e alvos de pelo menos 48 px; ícones acima dos percentuais; fluxo da rede vertical até 480 px, permitindo ler também duas camadas ocultas.
- README, guia de reprodução e arquitetura atualizados para o produto concluído.

## Revisão visual e funcional

| Área | Evidência/resultado |
| --- | --- |
| Menu | Comparado com a referência `10_45_37-1.png`: fundo submarino, submarino amarelo, título, dois CTAs e três passos em painel creme. [Captura final](sonar/etapa-6-menu.jpg). |
| Missão | Comparada com `10_45_38-2.png`: cena/perfil à esquerda, escolha e comparação à direita, cards creme e cores consistentes. O contato mantém **?** até revelar; probabilidades vêm da inferência oficial. [Captura antes da revelação](sonar/etapa-6-missao.jpg). |
| Laboratório | Comparado com `10_45_40-3.png`: navegação marinha, dados/configuração/rede/curvas/inspeção em cards claros. Arquitetura do formulário e identidade do modelo inspecionado são distinguidas; resultados ilustrativos foram substituídos por estados vazios ou dados reais. [Desktop](sonar/etapa-6-desktop.jpg), [mobile 320 px](sonar/etapa-6-mobile.jpg). |
| Responsividade | Menu, missão e laboratório verificados em 1440, 1024, 768, 390 e 320 px. Nas larguras menores, `scrollWidth` da página igual à largura disponível: 1014/758/380/310 px, descontada a barra de rolagem. Cards de probabilidade sem conteúdo excedente. Tabelas largas têm rolagem interna própria. |
| Treinamento cooperativo | Treino real 60→16→8→2, 500 épocas solicitadas: foi possível abrir Dados e voltar a Treinamento durante a execução; cancelamento na época 31, mensagem explícita e pesos parciais descartados. Novo treino de oito épocas concluiu. |
| Experimento e matemática | Modelo experimental de oito épocas disponível separadamente; em `sonar-0001`, apresentou Metal 50,30%. Trace identificado como `experimental-sonar-run-2`; perda 0,69920423 somente após revelar R. A mesma configuração foi treinada no build de produção, com oito pontos reais e oficial ainda selecionável. |
| Missão completa | Build de produção: IDs distintos 0024, 0141, 0158, 0010 e 0009; palpites R/M/R/M/R. Placar final **usuário 3/5, IA 3/5**, com dois erros reais da IA. Linhas e pontos conferidos no [resumo](sonar/etapa-6-placar.jpg). Isso é demonstração, não nova estimativa científica. |
| Contexto da missão | `sonar-0024`, probabilidades R 95,49%/M 4,51%, mesmo modelo/trace no laboratório. Antes da revelação: rótulo oculto e nenhuma ação de revelação manual. Depois de revelar na missão: R e perda 0,04619325 disponíveis na revisão histórica. |
| Reinício | Nova missão retornou ao encontro 1, ambos os placares em 0, contato **?**, escolhas habilitadas. |
| Rotas anteriores | Build final abriu Home, Perceptron/modelo, Adaline, Aproximação funcional, Reconhecimento manuscrito, Iris, K-Means, K-Means++ e IAdivinha, com títulos correspondentes. Nenhum erro/aviso registrado no console nesta passagem. Trata-se de smoke de abertura, não de nova auditoria completa de cada laboratório. |
| Erros e recursos | Testes reais cobrem HTTP/artefatos inválidos, erros de previsão, aborto, concorrência, respostas antigas, navegação/descarte e limpeza de tensores/Adam. O teste visual de recurso bloqueado/retry da Etapa 05 permanece documentado; não foi apresentado como uma nova execução visual nesta etapa. |

## Acessibilidade verificada

Os controles têm nomes acessíveis, estados de seleção e avisos de status; gráficos possuem descrições e tabelas numéricas alternativas. Ao navegar por teclado de Dados para Treinamento, o botão recebeu outline sólido de **3 px**. As escolhas e probabilidades não dependem apenas da cor. O som permanece desligado inicialmente. Sob `prefers-reduced-motion: reduce`, submarino, ondas e entrada do menu apresentaram `animation-name: none`.

Contraste calculado para quatro pares efetivos de texto/fundo do laboratório, pela luminância relativa sRGB:

| Uso | Texto / fundo | Razão |
| --- | --- | ---: |
| Texto principal | #06263a / #faf7ef | 14,57:1 |
| Legenda | #416575 / #fffcf7 | 6,14:1 |
| Navegação ativa | #f1fdff / #087f8a | 4,59:1 |
| Botão amarelo | #06263a / #ffd34d | 10,90:1 |

Esta conferência é limitada aos pares listados e ao fluxo de teclado observado. Não constitui certificação WCAG completa; não houve execução com leitor de tela real.

## Auditoria científica e matemática

- Original UCI: 208×60, R=97/M=111, faixa [0,1], nenhuma duplicata/conflito. Fonte, licença, hash e semântica conferidos. Valores originais, sem transformação aprendida.
- Partições persistidas/disjuntas: desenvolvimento 166, teste 42, cinco folds e laboratório 133/33. Ordem fixa R/M; IDs/rótulos não entram nos tensores de inferência.
- Protocolo e oficial mantidos: seleção em CV de desenvolvimento, treino final 166×200 épocas, checkpoint fixo, avaliação final única já concluída. Modelo **60→16→2**, **1.010 parâmetros**. O sufixo `8a825…` da identidade é hash dos pesos, não uma segunda camada oculta.
- Teste científico congelado: **32/42**, acurácia **76,19%**, macro-F1 **75,69%**, cross-entropy **0,394608**, matriz `[[13,7],[3,19]]`, linhas verdadeiras/colunas previstas. Verificador recalculou contagens/métricas a partir de registros armazenados, sem novas previsões científicas de teste.
- Exemplo didático independente: `sonar-0001`, desenvolvimento, R 52,82%/M 47,18%, logits [0,56635129; 0,45333838], perda 0,63823637. Produtos e trace correspondem aos pesos oficiais. Guardas recusam todos os 42 IDs de teste no comando do exemplo.
- Estabilidade numérica: Softmax deslocada pelo máximo; perda didática por log-sum-exp; distinção do clipping float32 da perda média oficial. Pequenas diferenças de double/float32 são explicitadas, tolerância 10⁻⁵.
- Curvas são logs reais. Modelo experimental tem identidade própria. Probabilidade, placar e acurácia são distinguidos. Trace não recebe interpretação causal indevida, e não há promessa de desempenho em novos objetos.

Não houve novo experimento de seleção, retreinamento do oficial ou nova avaliação formal dos 42 exemplos. As cinco inferências da missão são demonstrações sobre o conjunto já avaliado. Os comandos de integridade e do guia usam apenas previsões de desenvolvimento.

## Comandos efetivamente executados

Ambiente: Windows, Node **24.21.0**, TensorFlow.js **4.22.0**, Vite **7.3.6**. Como npm não estava no PATH da sessão, os comandos npm foram chamados pelo `npm-cli.js` instalado com Node; são equivalentes aos comandos abaixo.

| Comando | Resultado |
| --- | --- |
| `npm test` | **111/111** passaram, zero falhas/cancelados/ignorados; duração registrada 4,62 s. Inclui 58 testes Sonar e 53 existentes. |
| `npm run lint` | Zero erros e avisos nos diretórios explicitamente definidos pelo script. Não é lint integral de todo o código legado. |
| `npm run check:sonar` | Original e partições válidos, contagens esperadas, nenhuma duplicata. |
| `npm run verify:sonar` | 12 arquivos do manifesto conferidos, 498 registros CV e 42 registros de teste armazenados; 166 previsões de desenvolvimento com erro máximo **0** no CPU; sem vazamento de tensores; novas previsões de teste **0** nesse comando. |
| `npm run explain:sonar -- --save` | Exemplo real gerado; nenhuma previsão de teste e sem vazamento de tensores. |
| `npm run build` | Sucesso, 3.797 módulos, **24,82 s** no ambiente local. |
| Comparação source/dist | 13 arquivos oficiais, incluindo manifesto, e três imagens copiados com bytes/hash idênticos. |
| Código congelado | Hashes dos 11 arquivos registrados do núcleo/protocolo idênticos ao registro original. |
| Links locais | 80 links locais conferidos nos documentos atualizados; nenhum destino inexistente. |
| `git diff --check` | Sem erros de whitespace. |

Os dois testes novos verificam paridade do exemplo com fixture de desenvolvimento, contas/perda numéricas, integridade de todos os artefatos oficiais e rejeição dos IDs reservados. Os testes de recursos medem tensores no Node/CPU; não se alega medição de memória do navegador.

## Performance e limites da verificação

Observado: treinamento com callbacks cooperativos permitiu navegar/cancelar, a feature usa rota lazy e o build produziu SonarApp JS **85,54 kB / 26,37 kB gzip**, CSS **33,26 kB / 7,84 kB gzip**. Existem chunks compartilhados grandes: kernels **932,27 kB / 244,70 kB gzip** e outro chunk **808,04 kB / 245,45 kB gzip**. As três imagens locais somam **4.201.189 bytes**. Esses são tamanhos de artefatos, não tempos de rede ou nota de performance.

Não foram medidos Lighthouse/Core Web Vitals, throttling de rede/CPU, tempo de carregamento em rede real ou aparelhos físicos. As larguras de celular/tablet são emulação de viewport no navegador local. Não houve revisão visual exaustiva de todos os módulos anteriores, apenas a abertura das rotas listadas e a suíte existente. Otimização de mídia, worker e calibração são possibilidades futuras, não pendências necessárias para completar esta entrega.

## Arquivos alterados nesta etapa

- `src/features/sonar/styles/sonarlab.css`: leitura em telas estreitas.
- `training/sonar/explain-example.mjs`, `tests/sonar-example.test.js`, `package.json`: comando didático reproduzível e testes.
- `docs/sonar-guia-professor.md`, este checkpoint, `docs/sonar/etapa-6-exemplo.json` e cinco capturas `etapa-6-*.jpg`: apresentação e evidências.
- `README.md`, `training/sonar/README.md`, `docs/architecture.md`: estado final e comandos.

Dados, partições, configuração científica, código congelado do treinamento, pesos e resultados oficiais não foram alterados. Os arquivos locais das etapas anteriores foram preservados. Nenhuma dependência foi adicionada; não houve publicação, push ou PR.

## Reprodução e revisão

Na raiz: `npm ci`, `npm test`, `npm run lint`, `npm run check:sonar`, `npm run verify:sonar`, `npm run explain:sonar`, `npm run build`. Para abrir o build: `npm run preview -- --port 4174`; menu `/sonar`, missão `/sonar/missao`, laboratório `/sonar/lab`. A reprodução completa da comparação, sem nova avaliação de teste, está no [guia de treinamento](../training/sonar/README.md).

Histórico: [Etapa 01](sonar-etapa-1.md), [02](sonar-etapa-2.md), [03](sonar-etapa-3.md), [04](sonar-etapa-4.md) e [05](sonar-etapa-5.md). Não há outra etapa de implementação pendente no roteiro solicitado.
