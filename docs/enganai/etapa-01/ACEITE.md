# Etapa 01 — critérios de aceite e passagem

Status: **concluída** para direção, fluxo e contratos. A etapa 02 está especificada e pronta para implementação.

| Critério | Evidência | Resultado |
| --- | --- | --- |
| Identidade e regras de cor definidas | DESIGN.md e tokens.v1.json | Concluído |
| Tipografia e licenças disponíveis | Caminhos verificados pelo validate.py | Concluído |
| Figurinos e expressões estáveis | Duas folhas, quatro poses por personagem, com alpha | Concluído |
| Componentes e estados visuais descritos | DESIGN.md | Concluído |
| Dez telas e rotas mapeadas | experience.v1.json e proposta-v2 | Concluído |
| Navegação e missão desenhadas | Diagramas e tabelas de FLUXOS.md | Concluído |
| Pontuação, progressão e persistência decididas | experience.v1.json e FLUXOS.md | Concluído |
| Dados científicos separados do placar e dos exemplos | CONTRATOS.md e dataMode nos schemas | Concluído |
| Contratos formais e exemplos coerentes | Doze tipos e dezesseis registros | Concluído |
| Casos inconsistentes detectados | Dezesseis casos negativos em validate.py | Concluído |
| Pares de texto/controle com contraste medido | Sete pares em VALIDACAO.json | Concluído |
| Produção de cena e integração futura delimitadas | assets.v1.json e plano de etapas | Concluído |

As folhas PNG usam transparência real e foram inspecionadas. O validador confere arquivos de referência e de fontes. O contraste é calculado para pares sólidos; não constitui uma auditoria de acessibilidade da futura interface.

## Resultado reproduzível

`python3 docs/enganai/etapa-01/validate.py` atualiza `VALIDACAO.json`. Os casos negativos abrangem gabarito incluído na pergunta, score incoerente, resposta duplicada, dimensão latente incompatível, sobreposição de partições, amostra de teste na arena, origem falsa, score de D incompatível com o logit, vetor fixo divergente, histórico fora de ordem, conclusão prematura, caminho inválido, mistura de dados, progresso incoerente, forma de tensor incompatível e publicação de fixture como resultado real.

## Escopo de passagem para a etapa 02

1. Preparar cenários e poses individuais a partir das referências, com tamanho/pivô adequados.
2. Aplicar tokens e tipografia em um enquadramento próprio de jogo.
3. Implementar entrada, mural e controles acessíveis; manter dados conceituais identificados.
4. Transferir o quiz atual para o aquecimento opcional e preparar o estado de experimento indisponível da arena.
5. Implementar preferências, navegação, foco e estados de carregamento.
6. Verificar as composições em 320, 390, 768 e 1440 px, zoom de texto e movimento reduzido.

As folhas de poses e os dez mockups são referências; ainda não representam cenas implementadas. Não há pesos, inferência, resultados científicos ou uma sessão de imagens real nesta etapa. A dimensão latente, as épocas, a seleção de checkpoints, os ajustes do otimizador e a tolerância de paridade ficam para os experimentos das etapas 03–04, conforme registrado em experience.v1.json.
