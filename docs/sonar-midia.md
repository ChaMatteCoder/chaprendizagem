# Sonar — capa, trilhas e organização

Atualização de 03/10/2026. A capa e as três faixas foram fornecidas pelo usuário na raiz de `C:\chaprendizagem`. Os arquivos foram movidos para os destinos abaixo e copiados para o worktree que contém a implementação. Nenhum arquivo foi recomprimido ou convertido; os hashes SHA-256 conferiram antes e depois da movimentação.

| Arquivo original | Destino no projeto | Uso |
| --- | --- | --- |
| `Sonar ou azar_ Missão submarina.png` | `public/images/sonar/cover.png` | Capa do card em Jogos |
| `Menu — “Maré de Curiosidade”.mp3` | `public/audio/sonar/menu.mp3` | Menu `/sonar` |
| `Durante o jogo — “Eco ou Engano”.mp3` | `public/audio/sonar/gameplay.mp3` | Missão `/sonar/missao`, incluindo resumo |
| `SonarLab — “Pensamentos Submersos”.mp3` | `public/audio/sonar/lab.mp3` | Laboratório `/sonar/lab` |

A raiz mantém os arquivos de configuração, entrada e documentação do projeto. A mídia fica agrupada por tipo e módulo. As regras de `.gitattributes` preservam PNG, MP3 e pesos como binários, e fixam LF no código e nos registros do protocolo Sonar para manter os hashes após checkout no Windows.

O card Sonar ou Azar? aparece uma única vez na Home, na categoria Jogos, antes do IAdivinha. No computador ficam lado a lado; abaixo de 680 px ficam empilhados. A capa inteira é preservada com `object-fit: contain`.

## Reprodução e controle

Um único elemento de áudio toca a faixa da tela atual em loop, a 30% de volume. O botão permite silenciar/ativar e informa o título da faixa. O mute permanece durante a navegação interna. Trocar de encontro ou seção do SonarLab não reinicia a música. Sair do módulo descarta a reprodução e os handlers; uma nova entrada começa uma nova sessão de áudio.

O navegador pode impedir autoplay. Nesse caso, a interface mostra “Toque para ouvir a música”; o botão ou a primeira interação tenta reproduzir dentro do gesto. Falhas de mídia mostram uma mensagem com tentativa explícita. Promessas de faixas anteriores são ignoradas, evitando que uma resposta atrasada altere o estado da faixa atual. O ping da missão acompanha o estado do som.

## Verificação

- `npm test`: 118 testes passaram, incluindo sete verificações novas de troca de faixa, mute, autoplay, concorrência, recuperação, descarte e integridade dos quatro arquivos.
- `npm run lint`: passou sem avisos.
- `npm run build`: passou. Os quatro arquivos em `dist/` têm os mesmos hashes dos arquivos organizados no projeto principal e no worktree.
- Navegador local: os três MP3s reproduziram, sem erro de mídia. Durações observadas: menu 169,9735 s, missão 108,0135 s, laboratório 232,0135 s.
- Mute acionado por Enter e preservado entre laboratório, menu e missão; o laboratório manteve a música ao trocar de seção. A Home não contém elemento de áudio após sair do Sonar.
- Catálogo conferido em 1440 px e 390 px, com capa carregada em 1672 × 941 e sem overflow horizontal. Sonar ausente da seção Projetos.
- Os hashes das 11 fontes do protocolo de treinamento continuam iguais ao registro oficial; nenhum novo treinamento ou avaliação foi realizado nesta atualização.

Evidência da categoria Jogos: [captura de tela](sonar/sonar-jogos-2026-10-03.png). Esta atualização altera mídia, navegação visual e áudio; os dados e o modelo oficial continuam congelados. As etapas anteriores documentam a versão de 30/09/2026.
