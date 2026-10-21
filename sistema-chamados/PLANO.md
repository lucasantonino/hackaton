# Sistema de chamados de suporte

## Objetivo e arquitetura

Aplicação web para cadastrar, listar, filtrar e atualizar chamados, persistidos em SQLite.

- Interface: HTML, CSS e JavaScript no navegador.
- Servidor: Node.js com API HTTP.
- Banco: arquivo SQLite na raiz do projeto, fora de `public/`.
- Comunicação: requisições `fetch()` entre navegador e servidor.

O navegador não abre diretamente o arquivo SQLite. O servidor validará os dados e usará consultas parametrizadas.

## Campos e status

- `id`: identificador automático.
- `titulo` e `solicitante`: obrigatórios.
- `descricao`: opcional.
- `status`: inicia como `Aberto`; valores permitidos: `Aberto`, `Em andamento` e `Concluído`.

## Decisão SQLite

Foi informada a versão Node.js 24.22.1. O projeto usará o módulo integrado `node:sqlite`, sem dependência adicional. A documentação classifica sua API como release candidate. O arquivo `database.js` define a tabela com restrições para os campos obrigatórios e os status.

## Estrutura atual

```text
sistema-chamados/
├── public/
│   ├── css/
│   └── js/
├── database.js
├── package.json
├── server.js
├── PLANO.md
└── chamados.db
```

O arquivo `chamados.db` é criado ao executar `database.js` e será mantido na raiz do projeto.

## Progresso e pendências

- [x] Planejar arquitetura, campos e status.
- [x] Criar o esquema SQLite e confirmar a inicialização do banco pelo usuário.
- [x] Preparar servidor e rotas da API para cadastro, listagem filtrada e atualização de status.
- [x] Criar a interface HTML e CSS responsiva.
- [x] Conectar cadastro, listagem, filtros e atualização de status à API.
- [x] Verificar sintaxe e rotas principais da API em uma cópia temporária.
- [ ] Confirmar a interação visual no WebStorm e concluir a validação requisito por requisito.
