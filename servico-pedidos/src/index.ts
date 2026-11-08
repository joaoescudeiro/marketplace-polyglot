import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import cors from 'cors';
import { types } from 'cassandra-driver';
import { client, consistency, initCassandra } from './db';

const PORT = Number(process.env.PORT ?? 3003);
const CLIENTES_URL = process.env.CLIENTES_URL ?? 'http://localhost:3001';
// Se vazio, o serviço NÃO valida produtos (o item precisa trazer nome e precoUnitario)
const PRODUTOS_URL = process.env.PRODUTOS_URL ?? '';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_VALIDOS = ['CRIADO', 'PAGO', 'ENVIADO', 'CANCELADO'];

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

// ---------- Conversões ----------
const paraCentavos = (reais: number) => Math.round(reais * 100);

function toPedido(row: any) {
  const itens = (row['itens'] ?? []).map((i: any) => ({
    produtoId: i.produto_id,
    nome: i.nome,
    quantidade: i.quantidade,
    precoUnitario: i.preco_centavos / 100,
  }));
  return {
    id: row['pedido_id'].toString(),
    clienteId: row['cliente_id'].toString(),
    status: row['status'],
    total: row['total_centavos'] / 100,
    criadoEm: row['criado_em'],
    itens,
  };
}

// ---------- Chamadas aos outros serviços ----------
async function buscarCliente(clienteId: string) {
  let resp: globalThis.Response;
  try {
    resp = await fetch(`${CLIENTES_URL}/clientes/${clienteId}`);
  } catch {
    throw new HttpError(502, 'Serviço de clientes indisponível');
  }
  if (resp.status === 404) throw new HttpError(404, 'Cliente não encontrado');
  if (!resp.ok) throw new HttpError(502, 'Erro ao consultar o serviço de clientes');
}

interface ItemEntrada {
  produtoId: string;
  quantidade: number;
  nome?: string;
  precoUnitario?: number;
}

async function resolverItem(item: ItemEntrada) {
  if (PRODUTOS_URL) {
    let resp: globalThis.Response;
    try {
      resp = await fetch(`${PRODUTOS_URL}/produtos/${encodeURIComponent(item.produtoId)}`);
    } catch {
      throw new HttpError(502, 'Serviço de produtos indisponível');
    }
    if (resp.status === 404) throw new HttpError(404, `Produto ${item.produtoId} não encontrado`);
    if (!resp.ok) throw new HttpError(502, 'Erro ao consultar o serviço de produtos');
    const p: any = await resp.json();
    if (typeof p.estoque === 'number' && p.estoque < item.quantidade) {
      throw new HttpError(409, `Estoque insuficiente para "${p.nome}"`);
    }
    return {
      produto_id: item.produtoId,
      nome: String(p.nome),
      quantidade: item.quantidade,
      preco_centavos: paraCentavos(Number(p.preco)),
    };
  }
  // Modo sem serviço de produtos: usa os dados enviados no corpo
  if (typeof item.nome !== 'string' || typeof item.precoUnitario !== 'number') {
    throw new HttpError(400, 'Sem serviço de produtos, cada item precisa de "nome" e "precoUnitario"');
  }
  return {
    produto_id: item.produtoId,
    nome: item.nome,
    quantidade: item.quantidade,
    preco_centavos: paraCentavos(item.precoUnitario),
  };
}

// ---------- Queries ----------
const INSERT_POR_CLIENTE = `INSERT INTO pedidos_por_cliente
  (cliente_id, criado_em, pedido_id, status, total_centavos, itens) VALUES (?, ?, ?, ?, ?, ?)`;
const INSERT_POR_ID = `INSERT INTO pedidos_por_id
  (pedido_id, cliente_id, criado_em, status, total_centavos, itens) VALUES (?, ?, ?, ?, ?, ?)`;

async function buscarPedidoPorId(id: string) {
  if (!UUID_RE.test(id)) throw new HttpError(404, 'Pedido não encontrado');
  const rs = await client.execute('SELECT * FROM pedidos_por_id WHERE pedido_id = ?', [types.Uuid.fromString(id)], {
    prepare: true,
    consistency,
  });
  if (rs.rowLength === 0) throw new HttpError(404, 'Pedido não encontrado');
  return rs.first();
}

// ---------- App ----------
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: client ? 'ok' : 'iniciando' });
});

// Criar pedido (compra)
app.post(
  '/pedidos',
  ah(async (req, res) => {
    const { clienteId, itens } = req.body ?? {};
    if (typeof clienteId !== 'string' || !UUID_RE.test(clienteId)) {
      throw new HttpError(400, 'Campo "clienteId" inválido (esperado UUID)');
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new HttpError(400, 'Campo "itens" deve ser uma lista não vazia');
    }
    for (const it of itens) {
      if (typeof it?.produtoId !== 'string' || it.produtoId === '') {
        throw new HttpError(400, 'Cada item precisa de "produtoId"');
      }
      if (!Number.isInteger(it?.quantidade) || it.quantidade < 1) {
        throw new HttpError(400, 'Cada item precisa de "quantidade" inteira maior que zero');
      }
    }

    await buscarCliente(clienteId);
    const itensResolvidos = [];
    for (const it of itens) itensResolvidos.push(await resolverItem(it));

    const total = itensResolvidos.reduce((s, i) => s + i.preco_centavos * i.quantidade, 0);
    const pedidoId = types.Uuid.random();
    const cliente = types.Uuid.fromString(clienteId);
    const criadoEm = new Date();

    await client.batch(
      [
        { query: INSERT_POR_CLIENTE, params: [cliente, criadoEm, pedidoId, 'CRIADO', total, itensResolvidos] },
        { query: INSERT_POR_ID, params: [pedidoId, cliente, criadoEm, 'CRIADO', total, itensResolvidos] },
      ],
      { prepare: true, consistency },
    );

    const row = await buscarPedidoPorId(pedidoId.toString());
    res.status(201).json(toPedido(row));
  }),
);

// Buscar pedido por id
app.get(
  '/pedidos/:id',
  ah(async (req, res) => {
    res.json(toPedido(await buscarPedidoPorId(String(req.params.id))));
  }),
);

// Histórico de pedidos de um cliente (mais recentes primeiro)
app.get(
  '/clientes/:clienteId/pedidos',
  ah(async (req, res) => {
    const clienteId = String(req.params.clienteId);
    if (!UUID_RE.test(clienteId)) throw new HttpError(400, 'clienteId inválido (esperado UUID)');
    const limite = Math.min(Number(req.query.limite) || 50, 200);
    const rs = await client.execute(
      `SELECT * FROM pedidos_por_cliente WHERE cliente_id = ? LIMIT ${limite}`,
      [types.Uuid.fromString(clienteId)],
      { prepare: true, consistency },
    );
    res.json(rs.rows.map(toPedido));
  }),
);

// Atualizar status do pedido
app.put(
  '/pedidos/:id',
  ah(async (req, res) => {
    const status = req.body?.status;
    if (!STATUS_VALIDOS.includes(status)) {
      throw new HttpError(400, `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}`);
    }
    const row: any = await buscarPedidoPorId(String(req.params.id));
    await client.batch(
      [
        {
          query: 'UPDATE pedidos_por_cliente SET status = ? WHERE cliente_id = ? AND criado_em = ? AND pedido_id = ?',
          params: [status, row['cliente_id'], row['criado_em'], row['pedido_id']],
        },
        { query: 'UPDATE pedidos_por_id SET status = ? WHERE pedido_id = ?', params: [status, row['pedido_id']] },
      ],
      { prepare: true, consistency },
    );
    res.json(toPedido(await buscarPedidoPorId(String(req.params.id))));
  }),
);

// Remover pedido
app.delete(
  '/pedidos/:id',
  ah(async (req, res) => {
    const row: any = await buscarPedidoPorId(String(req.params.id));
    await client.batch(
      [
        {
          query: 'DELETE FROM pedidos_por_cliente WHERE cliente_id = ? AND criado_em = ? AND pedido_id = ?',
          params: [row['cliente_id'], row['criado_em'], row['pedido_id']],
        },
        { query: 'DELETE FROM pedidos_por_id WHERE pedido_id = ?', params: [row['pedido_id']] },
      ],
      { prepare: true, consistency },
    );
    res.status(204).send();
  }),
);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return res.status(err.status).json({ erro: err.message });
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

initCassandra()
  .then(() => app.listen(PORT, () => console.log(`servico-pedidos rodando na porta ${PORT}`)))
  .catch((err) => {
    console.error('Falha ao iniciar o Cassandra:', err);
    process.exit(1);
  });
