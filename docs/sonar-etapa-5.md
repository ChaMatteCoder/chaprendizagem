# Sonar ou Azar? + SonarLab — checkpoint da Etapa 05

Etapa 05 implementada em 30/09/2026: menu, missão de cinco encontros, comparação com a MLP oficial, revelação, placar e explicação integrada. A Etapa 06 (revisão final e material de apresentação) permanece como próxima entrega, após validação do usuário.

## Rotas e fluxo

- `/sonar`: menu baseado na referência, com Iniciar missão, Abrir SonarLab, Sobre e controle opcional de ping.
- `/sonar/missao`: perfil real dos 60 atributos, escolha única, previsão oficial, revelação, pontuação e próximo encontro. Ao final, resumo dos cinco exemplos, reinício, menu e cálculo de cada encontro.
- `/sonar/lab`: laboratório existente, acrescido da seção **Eco da missão** quando aberto pelo encontro ou pelo resumo. Voltar à missão preserva seu progresso. A exploração livre continua nos 166 exemplos de desenvolvimento.
- Home: card Sonar ou Azar? na seção Jogos, com tags 5 encontros, Sonar real e MLP. `ProjectCard` aceita tags por props, preservando os padrões do IAdivinha. O card acadêmico SonarLab continua disponível.

O menu e os encontros usam textos, botões, gráficos e dados reais. As imagens geradas compõem somente a ambientação e os ícones.

## Sorteio e modelo

Cada missão usa um Fisher–Yates parcial sobre os **42 IDs do teste persistido**. A aleatoriedade padrão vem de `crypto.getRandomValues`. São cinco IDs distintos, sem consulta a classes, probabilidades ou acertos para escolher exemplos. Pode haver repetição entre missões.

Os loaders existentes verificam a base e os artefatos oficiais antes de iniciar. Missão indisponível bloqueia o fluxo e oferece recarregamento. Não há classificação simulada, resultado aleatório ou troca para experimento do laboratório.

Modelo mantido: `sonar-mlp-16-8a825d3f32f9`, arquitetura **60 → 16 → 2**, 1.010 parâmetros, classes R/M. Pesos SHA-256 `8a825d3f32f99a12c7bb377c0b13eac393f4042edb1a584a6d079589ad444b73`. Dados, partições, código registrado do núcleo, treinamento, pesos e avaliação científica permanecem os da Etapa 03.

As missões são **demonstrações com exemplos de teste já avaliados**. Executam inferência dos encontros com os pesos congelados; não treinam, não recalculam o registro científico e não selecionam outro modelo. As métricas oficiais continuam 32/42 acertos, acurácia 76,19% e macro-F1 75,69%. O placar de cinco encontros não estima essas métricas.

## Rótulo, previsão e pontuação

Estados explícitos: `idle → loading → guessing → predicting → comparing → revealed → guessing/finished`; falhas usam `blocked` ou `prediction-error`.

O controlador mantém as amostras completas fora do estado público. Antes da revelação, expõe somente ID e uma cópia dos 60 atributos. O contato usa o mesmo círculo com “?” para as duas classes. Nenhum nome de classe verdadeira, ícone específico do contato, alt, tooltip ou estilo condicionado à verdade aparece nessa fase. Os botões Rocha/Metal são alternativas disponíveis para qualquer amostra.

`guess` registra a escolha uma única vez. A chamada ao predictor recebe exclusivamente um vetor copiado de 60 números e solicita o trace real. Somente após a inferência bem-sucedida aparecem argmax e as duas probabilidades. `reveal` acrescenta o rótulo ao encontro e ao histórico e soma exatamente um ponto por acerto para cada participante. `next` exige revelação, e o quinto encontro encerra a partida.

Cliques repetidos de palpite, revelação e avanço não repetem pontos. Falha de inferência mantém amostra e escolha, não pontua e permite tentar novamente. Identificadores de operação e abortos impedem respostas antigas após reinício, pausa ou saída. Sair para o menu limpa a missão; sair da família Sonar libera os recursos. Recarregar a página começa uma nova sessão, sem persistência do placar.

A ocultação organiza a sequência da interface. Dados e código locais continuam inspecionáveis; não se promete proteção competitiva.

## Explicação no SonarLab

**Como a rede decidiu?** compartilha o próprio resultado e trace do encontro, com o mesmo ID oficial. Não executa outra previsão para explicar e não permite escolher um modelo experimental nesse contexto. No placar, cada linha abre o trace daquele encontro, inclusive quando a IA errou.

Antes da revelação, a última etapa matemática informa que perda/rótulo só estarão disponíveis depois de revelar na missão; não há botão para antecipá-los. Depois da revelação, são liberados o vetor one-hot, a cross-entropy estável calculada dos logits e o gradiente p − y. Nenhum número arredondado da tela entra nesses cálculos. A exploração livre e o treinamento experimental do laboratório continuam com suas regras anteriores.

## Artes, som e acessibilidade

Três artes PNG foram criadas com **image_gen integrado**: cenário oceânico, submarino transparente com piloto robô e sprite transparente de rocha/cilindro. Menu, missão e SonarLab compartilham submarino e ícones. Arquivos, referências e prompts finais: [registro das artes](sonar/etapa-5-artes.md). Lilita One reutiliza a fonte local e sua [licença OFL](../public/fonts/iadivinha/LilitaOne-OFL.txt).

O contato permanece neutro até revelar; o cenário é decorativo, sem posição/distância inferida dos dados. As entradas de tela duram 250 ms; pulsos de sonar e leve flutuação são CSS. `prefers-reduced-motion` remove animações e transições. O ping começa desligado e usa Web Audio após o gesto de ativação, sem música ou arquivos fictícios. Ele é um efeito sintetizado, não uma reconstrução do eco.

Há link para pular ao conteúdo, foco de teclado visível, progresso com etapa atual, escolhas com `aria-pressed`, avisos de estado/erro, probabilidades acessíveis e tabelas alternativas aos gráficos. Em celular, os painéis se empilham e as tabelas extensas têm rolagem própria.

## Verificações

- `npm test`: **109/109** aprovados, incluindo os 11 testes novos da missão.
- `npm run lint`: sem erros ou avisos.
- `npm run check:sonar`: base e partições confirmadas, 208 × 60, sem duplicatas.
- `npm run verify:sonar`: 12 arquivos verificados, 498 registros de CV, 42 registros de teste lidos, 166 inferências de desenvolvimento com erro máximo zero e sem vazamento de tensores; nenhuma nova predição de teste nesse verificador.
- `npm run build`: build de produção concluído.
- Navegador: menu, encontro, palpite, revelação, cinco encontros, placar, contexto antes/depois de revelar, contexto histórico, reinício e retorno ao menu. Uma missão observada teve cinco IDs distintos, um erro da IA e placar coerente de 3/5 para o usuário e 4/5 para a rede; são resultados dessa demonstração.
- Bloqueio de `weights.bin` no navegador: mensagem Missão indisponível, sem alternativas falsas; após restaurar o acesso, Tentar carregar novamente iniciou o primeiro encontro com placar zero.
- Desktop 1440 px e celulares 390/320 px: sem rolagem horizontal da página; foco de teclado confirmado e animações desativadas pela preferência de movimento reduzido. Build servido localmente também conferido.

Os testes cobrem sorteio sem repetição, guardas de sequência, extremos de pontuação, escolha única durante resposta pendente, isolamento de snapshots, inferência sem rótulo, falha/retry, modelos inválidos, resposta antiga após saída/reinício/pausa, liberação de carregamento tardio e inferência real com os pesos oficiais. O teste real confirma o mesmo trace no contexto e libera a perda somente após revelar.

Evidências: [menu desktop](sonar/etapa-5-menu.jpg), [missão desktop](sonar/etapa-5-missao.jpg), [missão celular](sonar/etapa-5-mobile.jpg) e [placar](sonar/etapa-5-placar.jpg).

## Como verificar

```bash
npm run dev -- --port 5174
# http://127.0.0.1:5174/sonar
npm test
npm run lint
npm run check:sonar
npm run verify:sonar
npm run build
npm run preview -- --port 4174
# http://127.0.0.1:4174/sonar
```

Inicie uma missão: antes do palpite, o contato deve ser “?” e não deve haver probabilidades. Escolha uma classe e abra o cálculo no laboratório: o rótulo/perda devem continuar bloqueados. Volte, revele e confira o placar; abra novamente a explicação e consulte a cross-entropy. Complete cinco encontros, revise uma linha do resumo e reinicie para conferir a limpeza do estado.

Implementação: [rotas e contexto](../src/features/sonar/pages/SonarApp.jsx), [menu](../src/features/sonar/pages/SonarMenuPage.jsx), [missão](../src/features/sonar/pages/SonarMissionPage.jsx), [controlador](../src/features/sonar/lib/mission/sonarMission.js), [contexto matemático](../src/features/sonar/components/MissionContextPanel.jsx), [som](../src/features/sonar/hooks/useSonarSound.js), [estilos](../src/features/sonar/styles/sonar.css) e [testes](../tests/sonar-mission.test.js).

**Etapa 05 concluída.** Falta a Etapa 06: revisão final conjunta das três referências, auditoria científica/acessível do conjunto e material técnico para apresentação. Sem publicação do site nesta entrega.
