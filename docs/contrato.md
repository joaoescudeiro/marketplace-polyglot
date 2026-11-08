# Contrato entre os serviços

Todos os IDs trafegam como **string**. Todos os serviços respondem `GET /health` e têm CORS liberado.
Erros são devolvidos como `{ "erro": "mensagem" }`.

| Serviço            | Banco                      | Porta |
|--------------------|----------------------------|-------|
| servico-clientes   | PostgreSQL                 | 3001  |
| servico-produtos   | MongoDB (replica set, 3 nós) | 3002  |
| servico-pedidos    | Cassandra                  | 3003  |
| frontend           | -                          | 5173  |

## Clientes (porta 3001)
- `GET /clientes?busca=texto` — lista
- `GET /clientes/:id`
- `POST /clientes` — corpo `{ "nome": "...", "email": "..." }`
- `PUT /clientes/:id` — mesmo corpo do POST
- `DELETE /clientes/:id`

Resposta: `{ "id": "uuid", "nome": "...", "email": "...", "criadoEm": "..." }`

## Produtos (porta 3002)
- `GET /produtos?busca=texto&categoria=Áudio` — lista (filtros opcionais)
- `GET /produtos/:id`
- `POST /produtos` — corpo `{ "nome", "categoria", "preco", "estoque", "imagem"?, "atributos"? }`
- `PUT /produtos/:id` — mesmo corpo do POST
- `PATCH /produtos/:id/estoque` — corpo `{ "delta": -2 }`. Baixa (delta negativo) ou devolve (positivo) estoque de forma atômica. Responde 409 se não houver estoque suficiente.
- `DELETE /produtos/:id`

Resposta: `{ "id": "string", "nome": "...", "preco": 1899.9, "estoque": 10, "categoria": "...", "imagem": "/imagens/x.png", "atributos": { "marca": "..." } }`

O campo é `id` (string), nunca `_id`/ObjectId. `atributos` é um objeto livre que varia por categoria.

## Pedidos (porta 3003)
- `POST /pedidos` — corpo `{ "clienteId": "uuid", "itens": [{ "produtoId": "string", "quantidade": 1 }] }`
  - Valida o cliente em `CLIENTES_URL`, valida produto/estoque em `PRODUTOS_URL` (usa `nome` e `preco` de lá) e baixa o estoque. Se algo falhar, o estoque já baixado é devolvido.
  - Se `PRODUTOS_URL` estiver vazia, cada item deve trazer também `nome` e `precoUnitario` e o estoque não é alterado.
- `GET /pedidos/:id`
- `GET /clientes/:clienteId/pedidos?limite=50` — histórico, mais recentes primeiro
- `PUT /pedidos/:id` — corpo `{ "status": "CRIADO|PAGO|ENVIADO|CANCELADO" }`. Cancelar devolve os itens ao estoque.
- `DELETE /pedidos/:id`

Resposta: `{ "id", "clienteId", "status", "total", "criadoEm", "itens": [{ "produtoId", "nome", "quantidade", "precoUnitario" }] }`
