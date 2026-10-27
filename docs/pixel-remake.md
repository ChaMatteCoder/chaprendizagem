# Remake do módulo Pixel

## Direção

O pedido atual é refazer a experiência e facilitar sua demonstração. O documento `modulo.md` foi usado como contexto do módulo existente. O modelo, os pesos, as partições e os resultados científicos já presentes continuam como fonte dos cálculos.

- Usar a identidade clara do ChAprendizagem: fundo de grade discreta, verde petróleo, cartões brancos, tipografia do projeto e marca compartilhada.
- Entrada com duas ações claras: jogar e explorar a CNN; regras curtas e roteiro de apresentação acessível.
- Jogo com preparação, comparação recebida/ajustada, controles em linguagem cotidiana, três testes explícitos, histórico de palpites e revelação separada.
- Distinguir a prévia não testada da última imagem avaliada; pontuar somente esta última.
- PixelLab organizado em perguntas e uma sequência de cinco passos, com contexto persistente da amostra e detalhes técnicos sob demanda.
- Conservar inferência real, limite de testes, proteção do rótulo, descarte de tensores e cálculos verificáveis.

## Implementação e validação previstas

1. Refazer navegação, entrada e estilos locais sem alterar a identidade dos outros módulos.
2. Refazer preparação, rodada, revelação e placar; corrigir transições e erros encontrados.
3. Reorganizar o laboratório, integrar a imagem da rodada e adicionar roteiro para apresentação.
4. Atualizar a verificação de navegador para o fluxo novo; executar testes, lint e build; revisar desktop e celular.

## Estado inicial

O checkout já continha modificações e arquivos não versionados do módulo Pixel. Foram preservados. Não há `AGENTS.md` aplicável nos diretórios ancestrais consultados.

## Implementação concluída

- Entrada, navegação, preparação do jogo, bancada, revelação e placar refeitos com a marca e os tokens visuais do projeto. A capa do catálogo também acompanha a nova identidade.
- Imagens decorativas da entrada derivadas diretamente dos bytes de seis amostras reais do pacote local CIFAR-10, sem novos exemplos de avaliação ou métricas ilustrativas.
- Controles do jogo em linguagem cotidiana, orçamento visual de testes, histórico de palpites e indicação explícita de prévia ainda não testada.
- Correção da rotina que pausava uma consulta ao mudar de estado: a pausa agora ocorre ao sair da tela. O foco não é deslocado após cada teste.
- Pintura do canvas sincronizada com a atualização da interface, para manter a imagem e sua legenda coerentes.
- Contexto do jogo atualizado no provider e importação dos pixels efetivamente testados no laboratório. O contexto não é reconstruído por parâmetros aproximados.
- Seleção de nova imagem limpa alterações anteriores; inferências atrasadas são descartadas e resultados de outra imagem ficam ocultos durante o recálculo.
- Laboratório com cinco perguntas, navegação anterior/próxima, links para cada etapa e modo apresentação. Arquitetura, fórmulas, parâmetros e contas por canal podem ser expandidos conforme a explicação.
- Guia de apresentação atualizado em `docs/pixel-guia-professor.md`.

## Verificação

- `npm test`: **149 testes aprovados**, incluindo os módulos anteriores, paridade Python/TF.js, cálculos da CNN e descarte de tensores.
- `npm run lint`: aprovado sem avisos.
- `npm run build`: aprovado.
- Verificação de navegador cobre uma partida completa em 1280 × 900 e outra em 390 × 844: instruções, três consultas reais, limite de testes, original oculto, revelação, imagem idêntica no PixelLab, cinco etapas, modo apresentação, exclusão de ajustes não testados do resultado, placar e reinício.
- Capturas e relatório de navegador ficam em `docs/pixel/remake/`; são evidência de execução da interface, não resultados científicos do modelo.

O checkpoint existente foi preservado. Não houve novo treinamento nem alteração das métricas publicadas neste remake.
