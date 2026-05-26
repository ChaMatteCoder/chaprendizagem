# Arquitetura

O projeto usa uma estrutura por features para facilitar a expansão do laboratório sem misturar assuntos diferentes.

## Convenções

- `src/app/` concentra a composição do aplicativo e as rotas principais.
- `src/pages/` guarda páginas globais.
- `src/components/` guarda componentes reutilizáveis por mais de um módulo.
- `src/features/<modulo>/` guarda tudo que pertence a um assunto específico.
- `experiments/` guarda implementações de apoio, protótipos e códigos de estudo que não são importados diretamente pela interface.

## Navegação

A navegação global deve permanecer genérica:

- `Home` para a landing page e o catálogo de projetos.
- `Sobre` para contexto e motivação do site.
- `Contato` para apresentação pessoal e canais externos.

Projetos específicos devem ser acessados por cards, módulos ou links internos, não como abas fixas do cabeçalho.

## Checklist para novos módulos

1. Criar `src/features/<modulo>/pages`.
2. Criar `src/features/<modulo>/components` quando houver UI específica.
3. Criar `src/features/<modulo>/data` para bases, mocks ou constantes.
4. Criar `src/features/<modulo>/lib` para lógica isolada.
5. Registrar as novas rotas em `src/app/App.jsx`.
6. Atualizar a Home e o README quando o módulo estiver apresentável.
