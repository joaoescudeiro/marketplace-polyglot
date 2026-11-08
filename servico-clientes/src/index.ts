import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const PORT = Number(process.env.PORT ?? 3001);
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/clientes',
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ClienteRow {
  id: string;
  nome: string;
  email: string;
  criado_em: Date;
}

// Formato do contrato: { id, nome, email }
const toCliente = (r: ClienteRow) => ({
  id: r.id,
  nome: r.nome,
  email: r.email,
  criadoEm: r.criado_em,
});

// Express 4 não captura erros de funções async sozinho
const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

function validarCorpo(body: any): string | null {
  if (typeof body?.nome !== 'string' || body.nome.trim() === '') return 'Campo "nome" é obrigatório';
  if (typeof body?.email !== 'string' || !EMAIL_RE.test(body.email)) return 'Campo "email" inválido';
  return null;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get(
  '/health',
  ah(async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  }),
);

// Listar (com busca opcional por nome: /clientes?busca=maria)
app.get(
  '/clientes',
  ah(async (req, res) => {
    const busca = typeof req.query.busca === 'string' ? req.query.busca : '';
    const { rows } = await pool.query<ClienteRow>(
      'SELECT * FROM clientes WHERE nome ILIKE $1 ORDER BY criado_em DESC',
      [`%${busca}%`],
    );
    res.json(rows.map(toCliente));
  }),
);

// Buscar um
app.get(
  '/clientes/:id',
  ah(async (req, res) => {
    const id = String(req.params.id);
    if (!UUID_RE.test(id)) return res.status(404).json({ erro: 'Cliente não encontrado' });
    const { rows } = await pool.query<ClienteRow>('SELECT * FROM clientes WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json(toCliente(rows[0]));
  }),
);

// Criar
app.post(
  '/clientes',
  ah(async (req, res) => {
    const erro = validarCorpo(req.body);
    if (erro) return res.status(400).json({ erro });
    const { rows } = await pool.query<ClienteRow>(
      'INSERT INTO clientes (nome, email) VALUES ($1, $2) RETURNING *',
      [req.body.nome.trim(), req.body.email.trim().toLowerCase()],
    );
    res.status(201).json(toCliente(rows[0]));
  }),
);

// Atualizar
app.put(
  '/clientes/:id',
  ah(async (req, res) => {
    const id = String(req.params.id);
    if (!UUID_RE.test(id)) return res.status(404).json({ erro: 'Cliente não encontrado' });
    const erro = validarCorpo(req.body);
    if (erro) return res.status(400).json({ erro });
    const { rows } = await pool.query<ClienteRow>(
      'UPDATE clientes SET nome = $1, email = $2 WHERE id = $3 RETURNING *',
      [req.body.nome.trim(), req.body.email.trim().toLowerCase(), id],
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json(toCliente(rows[0]));
  }),
);

// Remover
app.delete(
  '/clientes/:id',
  ah(async (req, res) => {
    const id = String(req.params.id);
    if (!UUID_RE.test(id)) return res.status(404).json({ erro: 'Cliente não encontrado' });
    const result = await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.status(204).send();
  }),
);

// Tratamento de erros
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.code === '23505') return res.status(409).json({ erro: 'Já existe um cliente com esse e-mail' });
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

app.listen(PORT, () => console.log(`servico-clientes rodando na porta ${PORT}`));
