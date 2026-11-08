import { Client, types } from 'cassandra-driver';

const contactPoints = (process.env.CASSANDRA_HOSTS ?? 'localhost').split(',');
const localDataCenter = process.env.CASSANDRA_DC ?? 'datacenter1';
const keyspace = process.env.CASSANDRA_KEYSPACE ?? 'marketplace';
const replicationFactor = Number(process.env.CASSANDRA_RF ?? 1);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Nível de consistência configurável por variável de ambiente (padrão: QUORUM)
export const consistency: number =
  (types.consistencies as unknown as Record<string, number>)[
    (process.env.CASSANDRA_CONSISTENCY ?? 'quorum').toLowerCase()
  ] ?? types.consistencies.quorum;

export let client: Client;

export async function initCassandra(): Promise<void> {
  // 1) Espera o Cassandra aceitar conexões e cria o keyspace
  const maxTentativas = 30;
  for (let tentativa = 1; ; tentativa++) {
    const admin = new Client({ contactPoints, localDataCenter });
    try {
      await admin.connect();
      await admin.execute(
        `CREATE KEYSPACE IF NOT EXISTS ${keyspace}
         WITH replication = {'class': 'SimpleStrategy', 'replication_factor': ${replicationFactor}}`,
      );
      await admin.shutdown();
      break;
    } catch (err) {
      await admin.shutdown().catch(() => undefined);
      if (tentativa >= maxTentativas) throw err;
      console.log(`Cassandra indisponível (tentativa ${tentativa}/${maxTentativas}), aguardando...`);
      await sleep(5000);
    }
  }

  // 2) Conecta já no keyspace e cria tipos/tabelas
  client = new Client({ contactPoints, localDataCenter, keyspace });
  await client.connect();

  await client.execute(`
    CREATE TYPE IF NOT EXISTS item_pedido (
      produto_id text,
      nome text,
      quantidade int,
      preco_centavos int
    )`);

  // Tabela para a consulta "histórico de pedidos de um cliente" (mais recentes primeiro)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS pedidos_por_cliente (
      cliente_id uuid,
      criado_em timestamp,
      pedido_id uuid,
      status text,
      total_centavos int,
      itens list<frozen<item_pedido>>,
      PRIMARY KEY ((cliente_id), criado_em, pedido_id)
    ) WITH CLUSTERING ORDER BY (criado_em DESC, pedido_id ASC)`);

  // Tabela para a consulta "buscar um pedido pelo id"
  await client.execute(`
    CREATE TABLE IF NOT EXISTS pedidos_por_id (
      pedido_id uuid PRIMARY KEY,
      cliente_id uuid,
      criado_em timestamp,
      status text,
      total_centavos int,
      itens list<frozen<item_pedido>>
    )`);

  console.log('Cassandra pronto (keyspace e tabelas criados)');
}
