# Etapa 01 — contratos de dados v1

Especificação formal: [schema.v1.json](contracts/schema.v1.json). Exemplos: [examples.v1.json](contracts/examples.v1.json). Validação complementar: [validate.py](validate.py).

## Convenções comuns

Todos os registros têm `schemaVersion: 1`, `kind` e `dataMode`. O modo é `fixture` para exemplos de desenvolvimento e `recorded` para dados efetivamente produzidos/registrados. Um conjunto de registros não mistura os dois modos.

O schema usa JSON Schema Draft 2020-12 e referências internas em `$defs`, permitindo validação sem buscar schemas do projeto na rede. Os objetos rejeitam campos desconhecidos. [Especificação do JSON Schema](https://json-schema.org/draft/2020-12).

Identificadores têm até 96 caracteres, em minúsculas, números, pontos, sublinhados ou hífens. Caminhos são relativos à raiz de artefatos selecionada pelo carregador; não aceitam caminhos absolutos ou segmentos `.`/`..`. Hashes SHA-256 são 64 caracteres hexadecimais. Objetos de arquivo incluem caminho, hash e quantidade de bytes.

Imagens científicas deste contrato são PNG, 28 × 28, um canal. A exibição mantém os pixels, com interpolação por vizinho mais próximo. Cor da interface, papel, sombra e personagens não alteram os pixels que entram no Discriminador.

Vetores latentes registram valores, dimensão, distribuição, identificador do gerador de números e seed. O comprimento do vetor precisa coincidir com sua dimensão e com o manifesto. Os valores são números finitos. Registrar somente a seed não identifica uma criação de forma suficiente.

## Os doze registros

| kind | Campos centrais | Invariante |
| --- | --- | --- |
| model-manifest | id, runId, redes, formatos, domínio da imagem, dimensão latente, hashes, ambiente e activeCheckpointId | O checkpoint ativo e os pesos publicados precisam coincidir |
| dataset-split | origem do Fashion-MNIST, hash, seed e listas de IDs por partição | Treino, desenvolvimento, arena e teste não se sobrepõem |
| sample | id, pixels referenciados e provenance | Origem explícita e rastreável ao dataset ou ao Gerador |
| latent-set | id, dimensão, distribuição, RNG e vetores fixos | Cada vetor tem o tamanho declarado |
| checkpoint | execução, época, passo, pesos e prévias com z fixo | A ordem das prévias corresponde à ordem do conjunto latente fixo |
| history | execução, unidade e pontos de perdas | Passos aumentam, épocas não retrocedem; perdas pertencem à execução |
| question | sessão, missão, amostra, índice e imagem | Sem origem, gabarito, palpite, seed ou checkpoint expostos |
| round-reveal | escolha, origem, correção, pontos, procedência e leitura de D | Gabarito vem da procedência; D não altera o placar humano |
| session | fase, ordem das amostras, respostas, score, seed e erro | Cinco amostras distintas; placar é a soma das respostas |
| creation | execução, checkpoint, hash, vetor, miniatura e data | Reproduzir exige os mesmos pesos e o mesmo z |
| progress | missões concluídas, melhores resultados, sessões contabilizadas e conquistas | Um ID de sessão é contabilizado uma vez |
| preferences | som, movimento e modo de explicação | Padrão com som desligado e movimento seguindo o sistema |

Campos e obrigatoriedade completos estão no schema. O texto deste documento explica as relações que não são expressas apenas por tipos e limites locais.

## Modelos e execuções

O Gerador recebe `float32` em `N × dimensão × 1 × 1` e produz `N × 1 × 28 × 28`. O Discriminador recebe `N × 1 × 28 × 28` e produz `N × 1`, interpretado como logit. O manifesto declara layout NCHW, intervalo de imagem `[-1, 1]`, distribuição normal de média zero/desvio um e o identificador do RNG.

Esses formatos são o contrato de integração inicial. Uma mudança de arquitetura que altere a interface exige atualizar a versão do contrato, não corrigir silenciosamente a forma dos tensores na UI. A quantidade de parâmetros e a dimensão final serão preenchidas a partir do modelo implementado na etapa 03.

Configuração e partições são arquivos identificados por hash. O histórico v1 registra a família de perda BCE com logits; outras famílias exigem uma extensão versionada. Não se pressupõe queda contínua das perdas.

Cada checkpoint referencia o conjunto completo de vetores fixos e suas amostras, na mesma ordem. O Museu poderá usar as prévias registradas; baixar os pesos só é necessário para executar uma nova inferência naquele checkpoint.

## Procedência e visão antes da resposta

Uma amostra real contém dataset, partição e ID do registro original. Uma sintética contém execução, checkpoint, hash do Gerador e vetor z. A correção da rodada usa essa informação.

O componente de escolha recebe somente o registro `question`: identidade opaca, índice e imagem. `additionalProperties: false` rejeita a inclusão acidental de `correctOrigin`, `provenance`, `discriminator`, `seed` ou outros campos. Essa projeção deverá ser feita na camada de sessão, antes de renderizar a pergunta.

A interface de revelação recebe `round-reveal`. Ela mostra separadamente:

1. Escolha do jogador.
2. Origem registrada.
3. Acerto ou erro e pontos derivados dessa comparação.
4. Palpite da Lupa, quando disponível.
5. Procedência e informação técnica sob demanda.

Uma amostra de teste, treino ou desenvolvimento pode existir no laboratório, mas não pode compor a missão: a arena usa a partição própria `arena`. Os IDs de arquivos visíveis ao jogador não devem revelar o rótulo.

## Leitura do Discriminador

O estado de D é `pending`, `ready`, `unavailable` ou `error`. Apenas `ready` inclui logit, score, checkpoint e predição. O score é `sigmoid(logit)` e a predição é “real” quando `score >= 0,5`; caso contrário, “synthetic”. A igualdade é definida para não haver discrepância entre implementações.

O campo `meaning: uncalibrated-sigmoid` acompanha a leitura. O texto acessível explica que ela não é uma certeza universal. A tolerância de `1e-6` do validador verifica a conversão logit → sigmoid no próprio registro; **não é a tolerância de paridade entre PyTorch e ONNX**, que será estabelecida por experimento na etapa 04.

Erro ou demora de D não invalida a procedência, a escolha ou os pontos. Uma resposta tardia precisa corresponder ao mesmo contexto antes de ser aplicada.

## Sessão, resultado e progresso

`briefing` e `preparing` ainda não expõem amostras ou respostas. Depois da preparação, a sessão tem cinco IDs únicos. Em `investigating`, o total de respostas corresponde ao índice atual. Em `revealing`/`revealed`, a resposta da rodada atual já foi registrada. `summary` exige cinco respostas e índice final 4.

Cada resposta identifica sua amostra e índice. A ordem deve corresponder à seleção da sessão. A sessão calcula o score pela soma das respostas, entre zero e 500. O erro global só aparece na fase `error`; falha de D fica no próprio palpite.

Na conclusão, o progresso registra o ID da sessão em `completedSessionIds`. Reaplicar o mesmo resultado não incrementa conclusões nem conquistas. Os melhores resultados por missão satisfazem `bestScore = bestCorrect × 100`. A lista de missões concluídas é coerente com os registros individuais e seus pré-requisitos. Conquistas derivam da conclusão da primeira missão e das três missões.

A sessão em andamento não será persistida na primeira entrega. Preferências, conclusões e criações terão chaves diferentes, todas versionadas. As seeds antigas representam o exemplo procedural atual; sua eventual importação não deve prometer reprodução de imagens de um modelo treinado.

## Exemplos e proteção contra confusão de dados

O arquivo de exemplos contém um manifesto fictício, quatro partições mínimas, um conjunto fixo, um checkpoint, um histórico, cinco amostras, uma pergunta, uma revelação, uma sessão de 3/5 acertos, uma criação, progresso e preferências. Os registros têm `dataMode: fixture`.

**Nenhum arquivo indicado por `fixtures/` existe. Hashes nulos, dimensão 4, épocas e perdas são intencionalmente fictícios para exercitar o contrato.** Esses valores não definem a arquitetura de produção e não são publicados em `public/models` ou `public/data`.

O validador rejeita o conjunto quando é exigido `require_recorded=True`. Para dados recorded, hashes nulos e caminhos `fixtures/` também são inválidos. A implementação do carregador real deverá preservar essas regras e, adicionalmente, conferir bytes, hashes e saídas dos arquivos efetivamente carregados.

O script da etapa 01 verifica schema, relações entre registros, ordenação, pontuação, partições, vetores, modelos e pares de contraste. Ele não comprova que pesos executam, que a seed implementa o RNG ou que uma rede foi treinada. Essas verificações pertencem às etapas 03–04.

## Evolução e compatibilidade

Mudanças incompatíveis de campos, significados, formas de tensores ou regras de pontuação exigem uma nova versão.

**Nota da etapa 05:** o manifesto ONNX da etapa 04 aponta para o arquivo `.onnx`, enquanto o checkpoint registra o `.pt`. `validate_bundle` aceita, opcionalmente, `weight_links` (hash exportado → hash do `.pt`), que só podem vir de um `onnx-export.json` verificado. Sem esse argumento, a regra original de igualdade continua valendo. Nenhum campo do schema mudou. Como os objetos rejeitam campos desconhecidos, extensões também precisam de publicação coordenada e migração explícita. Dados de versão futura são preservados, mas não aplicados por um leitor v1.

Os arquivos desta pasta permanecem como fonte da especificação; não são importados pela aplicação atual. A etapa 02 consumirá tokens e decisões de navegação. As etapas 03–05 implementarão produtores e consumidores dos contratos, com testes de conformidade nos respectivos runtimes.
