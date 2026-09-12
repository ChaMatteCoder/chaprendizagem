# IAdivinha! — revisão de produto e exportação

Data: 12/09/2026.

## Entrega

- Página inicial e resultados com linguagem de jogo. Removidas a descrição técnica da sequência, a regra antiga de 100 pontos fixos e a latência de inferência na tela de resultado.
- Sobre ilustrado com o caminho do desenho ao palpite e os oito personagens, incluindo a Turma do “ÃO”. Explicação de como a IA aprendeu e de onde o desenho é processado.
- Regras organizadas em três passos, com pontuação por confiança apenas nos acertos e zero para palpite diferente ou folha em branco.
- Diálogos com ações separadas por 16 px no PC e empilhadas com 12 px no celular. Cabeçalho e ações permanecem acessíveis durante a rolagem do conteúdo; telas de pouca altura usam rolagem do diálogo inteiro.
- Área de conteúdo acessível por teclado; Escape fecha o diálogo e devolve o foco ao controle que o abriu.
- Desempenho explica acurácia, F1 macro e leitura da matriz. Detalhes da avaliação ficam em uma seção expansível.
- Download da matriz em PNG de 1600 × 1660 px, com fundo branco, oito classes nos dois eixos, 64 contagens, legenda, modelo, conjunto de teste e métricas. A imagem independe da área visível da tabela. JSON continua disponível.

## Áudio no celular

A página tenta iniciar com som habilitado. Quando o navegador exige interação, a trilha é retomada diretamente nos eventos de toque/clique/teclado, antes de a navegação do jogo trocar a tela. Uma tentativa de autoplay ainda pendente não impede o primeiro toque. O controle de música não dispara uma ativação concorrente.

O aviso de primeiro toque não desloca o botão Jogar agora quando desaparece. Mute continua válido durante a visita. Menu e partida continuam em loop; a faixa final continua tocando apenas uma vez.

Não é possível garantir som antes de qualquer interação em todos os navegadores. Referências: [política do Chrome](https://developer.chrome.com/blog/autoplay) e [política do Safari/iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/).

## Validação

- `npm test`: 53 testes aprovados. Novos casos verificam a matriz publicada e a alternativa MLP, rejeição de dados inconsistentes, contagens/eixos/zeros/resolução do PNG, retomada com autoplay pendente e eventos de toque.
- `npm run lint`: aprovado, sem avisos.
- `npm run build`: aprovado.
- PC, 1280 × 800: Sobre, navegação entre diálogos, botões com 16 px de distância e PNG completo.
- Chrome com viewport 390 × 844 e eventos de toque: autoplay inicialmente bloqueado; um único toque em Jogar agora iniciou a preparação e o áudio `gameplay.mp3`, desmutado e com tempo avançando. Mute permaneceu ativo ao abrir Sobre e desempenho.
- Mobile: largura do documento de 390 px, sem transbordamento; rolagem horizontal restrita à matriz. Download real salvo em `Downloads/iadivinha-matriz-confusao-cnn.png` e imagem inspecionada.
- Paisagem, 844 × 390: conteúdo completo acessível por rolagem e Entendi funcional. Escape e restauração de foco verificados.
- Não houve teste em iPhone físico; a compatibilidade de desbloqueio por `touchend` segue a política documentada do Safari.

Modelo, pesos, dados de teste e cálculo de pontos não foram alterados neste patch. A matriz exportada corresponde ao CNN selecionado, com 8.000 desenhos e acurácia de 93,6%.

## Evidências

- [Matriz em PNG para o relatório](matriz-confusao-cnn.png)
- [Sobre no PC](sobre-desktop.png)
- [Sobre no celular](sobre-mobile.png)
- [Download no celular](desempenho-mobile.png)
