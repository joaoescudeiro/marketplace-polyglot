-- Executado automaticamente pelo Postgres na primeira vez que o container sobe
CREATE TABLE IF NOT EXISTS clientes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       VARCHAR(120) NOT NULL,
  email      VARCHAR(160) NOT NULL UNIQUE,
  criado_em  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Índice por nome para buscas (ponto de tuning para a apresentação)
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);

-- Dados de exemplo
INSERT INTO clientes (nome, email) VALUES
  ('Maria Silva', 'maria@exemplo.com'),
  ('João Souza',  'joao@exemplo.com')
ON CONFLICT (email) DO NOTHING;
