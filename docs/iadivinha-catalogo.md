# IAdivinha! no catálogo de jogos

Entrega de 11/09/2026, com commit e push para `main` autorizados pelo usuário.

- Capa original gerada para o jogo e incluída em `src/assets/iadivinha-cover.png`: gato, pato e sapato, título legível e paleta de papel claro, coral, amarelo e turquesa.
- Nova seção **Jogos** (`/#jogos`) na Home, separada do carrossel dos projetos acadêmicos e dos módulos.
- Card com tags **Desenho**, **10 segundos** e **IA**, descrição da partida e link **Jogar agora** para `/iadivinha`.
- `ProjectCard` conserva o conteúdo acadêmico dos demais cards e oferece uma variante de jogo. Capa completa, sem recorte; organização horizontal no desktop e vertical no celular.
- 43 testes, lint (incluindo o componente compartilhado) e build passaram.
- Validação no navegador em desktop e 390 pixels: capa carregada, um link do jogo na seção Jogos, nenhum no carrossel de projetos; botão abriu o jogo e o modelo ficou pronto.

Capturas: [desktop](iadivinha/catalogo/desktop.png) e [mobile](iadivinha/catalogo/mobile.png).

O commit reúne a feature IAdivinha desenvolvida nas entregas anteriores: jogo, oito classes treinadas, normalização dos traços, Turma do ÃO, trilha, assets, testes e documentação. Datasets brutos, ambientes virtuais, runs locais e build ficam ignorados.
