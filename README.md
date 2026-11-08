# Marketplace de Eletrônicos — Polyglot Persistence

Projeto da disciplina de tópicos avançados de bancos de dados.

## 1. Tema
Um marketplace de produtos eletrônicos em que clientes se cadastram, consultam produtos e realizam compras.

## 2. Bancos usados e justificativa
| Dado | Banco | Por quê |
|------|-------|---------|
| Clientes | **PostgreSQL** (relacional) | Dados estruturados, com unicidade de e-mail, integridade e transações ACID. |
| Produtos | **MongoDB** (documentos) | Atributos variam por categoria, e o esquema flexível facilita isso. |
| Pedidos | **Cassandra** (wide-column) | Muita escrita e consulta previsível ("histórico do cliente"), com modelagem orientada à consulta e escala horizontal. |

### Backend
Três serviços Node.js + TypeScript (Express), um por banco: `servico-clientes`, `servico-produtos` e `servico-pedidos`.
O serviço de pedidos consulta os outros dois para validar cliente e produtos antes de gravar o pedido.
Contrato completo das rotas em [`docs/contrato.md`](docs/contrato.md).

### Modelagem do Cassandra
- `pedidos_por_cliente`: partição por `cliente_id`, ordenada por `criado_em DESC` (histórico).
- `pedidos_por_id`: partição por `pedido_id` (consulta direta).
- Escritas nas duas tabelas via batch, com consistência configurável (padrão `QUORUM`).

## 3. Como executar
Pré-requisitos: Git e Docker Desktop.

```bash
git clone <URL-DO-REPOSITORIO>
cd marketplace-polyglot
docker compose up --build
```
O Cassandra leva cerca de 1 a 2 minutos para ficar pronto na primeira vez.

| Serviço | URL |
|---------|-----|
| Clientes | http://localhost:3001 |
| Produtos | http://localhost:3002 |
| Pedidos | http://localhost:3003 |
| Frontend | http://localhost:5173 |

Para apagar tudo e recomeçar do zero: `docker compose down -v`.

## 4. Testes rápidos (exemplos)
```bash
curl http://localhost:3001/clientes
curl -X POST http://localhost:3001/clientes -H "Content-Type: application/json" \
  -d '{"nome":"Ana","email":"ana@exemplo.com"}'
```
