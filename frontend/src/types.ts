export interface Cliente {
  id: string
  nome: string
  email: string
}

export interface Produto {
  id: string
  nome: string
  preco: number
  estoque: number
  categoria: string
  imagem?: string
  atributos?: Record<string, unknown>
}

export interface ItemPedido {
  produtoId: string
  nome: string
  quantidade: number
  precoUnitario: number
}

export interface Pedido {
  id: string
  clienteId: string
  status: string
  total: number
  criadoEm: string
  itens: ItemPedido[]
}

export interface ItemCarrinho {
  produto: Produto
  quantidade: number
}
