# Marketplace de Eletrônicos — Polyglot Persistence

Projeto da disciplina de Performance e Tunning de dados.

## 1. Tema
Um marketplace de produtos eletrônicos em que clientes se cadastram, consultam produtos e realizam compras.

## 2. Bancos usados e justificativa
| Dado | Banco | Por quê |
|------|-------|---------|
| Clientes | **PostgreSQL** (relacional) | Dados estruturados, com unicidade de e-mail, integridade e transações ACID. |
| Produtos | **MongoDB** (documentos) | Atributos variam por categoria (campo `atributos`), e o esquema flexível facilita isso. O replica set de 3 nós dá alta disponibilidade e o ajuste de estoque é atômico. |
| Pedidos | **Cassandra** (wide-column) | Muita escrita e consulta previsível ("histórico do cliente"), com modelagem orientada à consulta e escala horizontal. |

### Backend
Três serviços Node.js + TypeScript (Express), um por banco: `servico-clientes`, `servico-produtos` e `servico-pedidos`.
O serviço de pedidos consulta os outros dois: valida o cliente, valida os produtos, baixa o estoque e só então grava o pedido.
Contrato completo das rotas em [`docs/contrato.md`](docs/contrato.md).

### Frontend
React + TypeScript (Vite), com loja e carrinho, CRUD de produtos, CRUD de clientes e histórico de pedidos.

### Modelagem
- **PostgreSQL:** tabela `clientes` com índice por nome.
- **MongoDB:** coleção `produtos`, com índices em `categoria` e `nome`. `writeConcern: majority` e `readConcern: majority`.
- **Cassandra:** `pedidos_por_cliente` (partição por `cliente_id`, ordenada por `criado_em DESC`) e `pedidos_por_id` (consulta direta). Escritas nas duas tabelas via batch, com consistência configurável (padrão `QUORUM`).

## 3. Como executar
Pré-requisitos: Git e Docker Desktop (com pelo menos 4 GB de memória).

```bash
git clone https://github.com/joaoescudeiro/marketplace-polyglot.git
cd marketplace-polyglot
docker compose up --build
```
Na primeira vez, o download das imagens e a inicialização do Cassandra e do replica set do MongoDB levam alguns minutos.

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Clientes | http://localhost:3001 |
| Produtos | http://localhost:3002 |
| Pedidos | http://localhost:3003 |

Para apagar tudo e recomeçar do zero: `docker compose down -v`.

## 4. Fluxo de compra
1. O frontend envia `POST /pedidos` com `clienteId` e os itens.
2. `servico-pedidos` valida o cliente (PostgreSQL) e os produtos (MongoDB).
3. Baixa o estoque no MongoDB. Se falhar, devolve o que já baixou.
4. Grava o pedido no Cassandra.

## 5. Limitações conhecidas
- Excluir um cliente não remove os pedidos dele.
- Excluir um pedido não devolve estoque (só o cancelamento devolve).
- O Cassandra roda com 1 nó, então `QUORUM` equivale a `ONE`.
