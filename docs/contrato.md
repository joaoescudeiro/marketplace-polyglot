# Contrato entre os serviços

Todos os IDs trafegam como **string**. Todos os serviços respondem `GET /health` e têm CORS liberado.

| Serviço            | Banco      | Porta |
|--------------------|------------|-------|
| servico-clientes   | PostgreSQL | 3001  |
| servico-produtos   | MongoDB    | 3002  |
| servico-pedidos    | Cassandra  | 3003  |
| frontend           | -          | 5173  |

## Clientes (porta 3001)
- `GET /clientes?busca=texto` — lista
- `GET /clientes/:id`
- `POST /clientes` — corpo `{ "nome": "...", "email": "..." }`
- `PUT /clientes/:id` — mesmo corpo do POST
- `DELETE /clientes/:id`

Resposta: `{ "id": "uuid", "nome": "...", "email": "...", "criadoEm": "..." }`

## Produtos (porta 3002) — responsabilidade da dupla
- `GET /produtos`, `GET /produtos/:id`, `POST /produtos`, `PUT /produtos/:id`, `DELETE /produtos/:id`

Resposta: `{ "id": "string", "nome": "...", "preco": 1899.9, "estoque": 10, "categoria": "...", "imagem": "/imagens/x.png" }`

O campo é `id` (string), nunca `_id`/ObjectId.

## Pedidos (porta 3003)
- `POST /pedidos` — corpo `{ "clienteId": "uuid", "itens": [{ "produtoId": "string", "quantidade": 1 }] }`
  - Valida o cliente em `CLIENTES_URL` e, se `PRODUTOS_URL` estiver definida, valida produto/estoque e usa `nome` e `preco` do serviço de produtos.
  - Sem `PRODUTOS_URL`, cada item deve trazer também `nome` e `precoUnitario`.
- `GET /pedidos/:id`
- `GET /clientes/:clienteId/pedidos?limite=50` — histórico, mais recentes primeiro
- `PUT /pedidos/:id` — corpo `{ "status": "CRIADO|PAGO|ENVIADO|CANCELADO" }`
- `DELETE /pedidos/:id`

Resposta: `{ "id", "clienteId", "status", "total", "criadoEm", "itens": [{ "produtoId", "nome", "quantidade", "precoUnitario" }] }`
