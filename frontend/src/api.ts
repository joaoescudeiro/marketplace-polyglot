import type { Cliente, Pedido, Produto } from './types'

const CLIENTES = import.meta.env.VITE_API_CLIENTES ?? 'http://localhost:3001'
const PRODUTOS = import.meta.env.VITE_API_PRODUTOS ?? 'http://localhost:3002'
const PEDIDOS = import.meta.env.VITE_API_PEDIDOS ?? 'http://localhost:3003'

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor')
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.erro ?? `Erro ${res.status}`)
  return data as T
}

const enviar = (method: string, corpo: unknown): RequestInit => ({
  method,
  body: JSON.stringify(corpo),
})

export type NovoCliente = Omit<Cliente, 'id'>
export type NovoProduto = Omit<Produto, 'id'>

export const api = {
  clientes: {
    listar: () => req<Cliente[]>(`${CLIENTES}/clientes`),
    criar: (d: NovoCliente) => req<Cliente>(`${CLIENTES}/clientes`, enviar('POST', d)),
    atualizar: (id: string, d: NovoCliente) =>
      req<Cliente>(`${CLIENTES}/clientes/${id}`, enviar('PUT', d)),
    remover: (id: string) => req<void>(`${CLIENTES}/clientes/${id}`, { method: 'DELETE' }),
  },
  produtos: {
    listar: () => req<Produto[]>(`${PRODUTOS}/produtos`),
    criar: (d: NovoProduto) => req<Produto>(`${PRODUTOS}/produtos`, enviar('POST', d)),
    atualizar: (id: string, d: NovoProduto) =>
      req<Produto>(`${PRODUTOS}/produtos/${id}`, enviar('PUT', d)),
    remover: (id: string) => req<void>(`${PRODUTOS}/produtos/${id}`, { method: 'DELETE' }),
  },
  pedidos: {
    criar: (clienteId: string, itens: { produtoId: string; quantidade: number }[]) =>
      req<Pedido>(`${PEDIDOS}/pedidos`, enviar('POST', { clienteId, itens })),
    historico: (clienteId: string) => req<Pedido[]>(`${PEDIDOS}/clientes/${clienteId}/pedidos`),
    atualizarStatus: (id: string, status: string) =>
      req<Pedido>(`${PEDIDOS}/pedidos/${id}`, enviar('PUT', { status })),
    remover: (id: string) => req<void>(`${PEDIDOS}/pedidos/${id}`, { method: 'DELETE' }),
  },
}
