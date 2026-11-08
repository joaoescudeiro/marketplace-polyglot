import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import cors from 'cors';
import { Filter, MongoClient, ObjectId, WithId } from 'mongodb';

const PORT = Number(process.env.PORT ?? 3002);
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/?replicaSet=rs0';
const DB_NAME = process.env.MONGO_DB ?? 'marketplace';

// O _id (ObjectId) é adicionado pelo MongoDB; por isso não aparece aqui
interface ProdutoDoc {
  nome: string;
  preco: number;
  estoque: number;
  categoria: string;
  imagem?: string;
  // Campos livres que variam por categoria (motivo de usar um banco de documentos)
  atributos?: Record<string, unknown>;
  criadoEm: Date;
}

// Leituras e escritas confirmadas pela maioria dos nós do replica set
const mongo = new MongoClient(MONGO_URI, {
  writeConcern: { w: 'majority' },
  readConcern: { level: 'majority' },
  readPreference: 'primaryPreferred',
  serverSelectionTimeoutMS: 10000,
});
const produtos = mongo.db(DB_NAME).collection<ProdutoDoc>('produtos');

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SEED = [
  { nome: 'Smartphone Samsung Galaxy', categoria: 'Celulares', preco: 1899.9, estoque: 15, imagem: '/imagens/smartphone.png', atributos: { marca: 'Samsung', armazenamento: '128 GB' } },
  { nome: 'Notebook Lenovo IdeaPad', categoria: 'Informática', preco: 3299.9, estoque: 8, imagem: '/imagens/notebook.png', atributos: { marca: 'Lenovo', memoria: '8 GB' } },
  { nome: 'Fone Bluetooth JBL', categoria: 'Áudio', preco: 249.9, estoque: 30, imagem: '/imagens/fone.png', atributos: { marca: 'JBL', conexao: 'Bluetooth' } },
  { nome: 'Smartwatch Xiaomi', categoria: 'Acessórios', preco: 399.9, estoque: 20, imagem: '/imagens/smartwatch.png', atributos: { marca: 'Xiaomi', resistenteAgua: true } },
];

// Espera o replica set eleger o primário, cria índices e popula dados de exemplo
async function prepararBanco() {
  for (let tentativa = 1; ; tentativa++) {
    try {
      await produtos.createIndex({ categoria: 1 });
      await produtos.createIndex({ nome: 1 });
      if ((await produtos.estimatedDocumentCount()) === 0) {
        await produtos.insertMany(SEED.map((p) => ({ ...p, criadoEm: new Date() })));
        console.log('Produtos de exemplo inseridos');
      }
      console.log('MongoDB pronto');
      return;
    } catch (err) {
      if (tentativa >= 30) throw err;
      console.log(`MongoDB indisponível (tentativa ${tentativa}/30), aguardando...`);
      await sleep(5000);
    }
  }
}

// ---------- Helpers ----------
const toProduto = (d: WithId<ProdutoDoc>) => ({
  id: d._id.toHexString(),
  nome: d.nome,
  preco: d.preco,
  estoque: d.estoque,
  categoria: d.categoria,
  imagem: d.imagem,
  atributos: d.atributos,
});

const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface DadosProduto {
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  imagem?: string;
  atributos?: Record<string, unknown>;
}

function lerProduto(body: any): { dados?: DadosProduto; erro?: string } {
  if (typeof body?.nome !== 'string' || body.nome.trim() === '') return { erro: 'Campo "nome" é obrigatório' };
  if (typeof body?.categoria !== 'string' || body.categoria.trim() === '') return { erro: 'Campo "categoria" é obrigatório' };
  if (typeof body?.preco !== 'number' || !(body.preco >= 0)) return { erro: 'Campo "preco" deve ser um número maior ou igual a zero' };
  if (!Number.isInteger(body?.estoque) || body.estoque < 0) return { erro: 'Campo "estoque" deve ser um inteiro maior ou igual a zero' };
  const dados: DadosProduto = {
    nome: body.nome.trim(),
    categoria: body.categoria.trim(),
    preco: body.preco,
    estoque: body.estoque,
  };
  if (typeof body.imagem === 'string' && body.imagem !== '') dados.imagem = body.imagem;
  if (body.atributos && typeof body.atributos === 'object' && !Array.isArray(body.atributos)) dados.atributos = body.atributos;
  return { dados };
}

const idInvalido = (id: string) => !OBJECT_ID_RE.test(id);

// ---------- App ----------
const app = express();
app.use(cors());
app.use(express.json());

app.get(
  '/health',
  ah(async (_req, res) => {
    await mongo.db(DB_NAME).command({ ping: 1 });
    res.json({ status: 'ok' });
  }),
);

// Listar (filtros opcionais: ?busca=texto&categoria=Áudio)
app.get(
  '/produtos',
  ah(async (req, res) => {
    const filtro: Filter<ProdutoDoc> = {};
    if (typeof req.query.busca === 'string' && req.query.busca !== '') {
      filtro.nome = { $regex: escapeRegex(req.query.busca), $options: 'i' };
    }
    if (typeof req.query.categoria === 'string' && req.query.categoria !== '') {
      filtro.categoria = req.query.categoria;
    }
    const docs = await produtos.find(filtro).sort({ nome: 1 }).toArray();
    res.json(docs.map(toProduto));
  }),
);

app.get(
  '/produtos/:id',
  ah(async (req, res) => {
    const id = String(req.params.id);
    if (idInvalido(id)) return res.status(404).json({ erro: 'Produto não encontrado' });
    const doc = await produtos.findOne({ _id: new ObjectId(id) });
    if (!doc) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(toProduto(doc));
  }),
);

app.post(
  '/produtos',
  ah(async (req, res) => {
    const { dados, erro } = lerProduto(req.body);
    if (erro || !dados) return res.status(400).json({ erro });
    const r = await produtos.insertOne({ ...dados, criadoEm: new Date() });
    const criado = await produtos.findOne({ _id: r.insertedId });
    if (!criado) return res.status(500).json({ erro: 'Erro ao criar o produto' });
    res.status(201).json(toProduto(criado));
  }),
);

app.put(
  '/produtos/:id',
  ah(async (req, res) => {
    const id = String(req.params.id);
    if (idInvalido(id)) return res.status(404).json({ erro: 'Produto não encontrado' });
    const { dados, erro } = lerProduto(req.body);
    if (erro || !dados) return res.status(400).json({ erro });
    const doc = await produtos.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: dados },
      { returnDocument: 'after' },
    );
    if (!doc) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(toProduto(doc));
  }),
);

// Ajuste atômico de estoque: { "delta": -2 } baixa 2 unidades, { "delta": 2 } devolve 2.
// A baixa só acontece se houver estoque suficiente (condição checada pelo próprio MongoDB).
app.patch(
  '/produtos/:id/estoque',
  ah(async (req, res) => {
    const id = String(req.params.id);
    if (idInvalido(id)) return res.status(404).json({ erro: 'Produto não encontrado' });
    const delta = req.body?.delta;
    if (!Number.isInteger(delta) || delta === 0) {
      return res.status(400).json({ erro: 'Campo "delta" deve ser um inteiro diferente de zero' });
    }
    const _id = new ObjectId(id);
    const filtro: Filter<ProdutoDoc> = delta < 0 ? { _id, estoque: { $gte: -delta } } : { _id };
    const doc = await produtos.findOneAndUpdate(filtro, { $inc: { estoque: delta } }, { returnDocument: 'after' });
    if (!doc) {
      const existe = await produtos.countDocuments({ _id });
      return existe
        ? res.status(409).json({ erro: 'Estoque insuficiente' })
        : res.status(404).json({ erro: 'Produto não encontrado' });
    }
    res.json(toProduto(doc));
  }),
);

app.delete(
  '/produtos/:id',
  ah(async (req, res) => {
    const id = String(req.params.id);
    if (idInvalido(id)) return res.status(404).json({ erro: 'Produto não encontrado' });
    const r = await produtos.deleteOne({ _id: new ObjectId(id) });
    if (r.deletedCount === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.status(204).send();
  }),
);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

mongo
  .connect()
  .then(prepararBanco)
  .then(() => app.listen(PORT, () => console.log(`servico-produtos rodando na porta ${PORT}`)))
  .catch((err) => {
    console.error('Falha ao iniciar o MongoDB:', err);
    process.exit(1);
  });
