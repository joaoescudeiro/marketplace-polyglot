import { useState } from 'react'
import { api } from './api'
import { brl, mensagemDeErro } from './format'
import { useCarregar } from './useCarregar'
import type { ItemCarrinho } from './types'

interface Props {
  itens: ItemCarrinho[]
  onQuantidade: (produtoId: string, quantidade: number) => void
  onRemover: (produtoId: string) => void
  onFinalizado: () => void
}

export default function Carrinho({ itens, onQuantidade, onRemover, onFinalizado }: Props) {
  const { dados: clientes, erro: erroClientes } = useCarregar(() => api.clientes.listar(), 0)
  const [clienteId, setClienteId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const total = itens.reduce((soma, i) => soma + i.produto.preco * i.quantidade, 0)

  async function finalizar() {
    setErro('')
    setMensagem('')
    if (!clienteId) {
      setErro('Escolha o cliente da compra')
      return
    }
    setEnviando(true)
    try {
      const pedido = await api.pedidos.criar(
        clienteId,
        itens.map((i) => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
      )
      setMensagem(`Pedido ${pedido.id.slice(0, 8)} criado! Total: ${brl(pedido.total)}`)
      onFinalizado()
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="painel-carrinho">
      <h2>Meu carrinho</h2>
      {itens.length === 0 && !mensagem && <p>Seu carrinho está vazio.</p>}
      {itens.map(({ produto, quantidade }) => (
        <div className="item-carrinho" key={produto.id}>
          <span className="item-nome">{produto.nome}</span>
          <input
            type="number"
            min={1}
            max={produto.estoque}
            value={quantidade}
            onChange={(e) => onQuantidade(produto.id, Number(e.target.value))}
          />
          <span>{brl(produto.preco * quantidade)}</span>
          <button className="botao-pequeno" onClick={() => onRemover(produto.id)}>
            ✕
          </button>
        </div>
      ))}

      {itens.length > 0 && (
        <>
          <p className="total">Total: {brl(total)}</p>
          <label>
            Cliente
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Selecione...</option>
              {(clientes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <button className="botao-comprar" disabled={enviando} onClick={finalizar}>
            {enviando ? 'Enviando...' : 'Finalizar compra'}
          </button>
        </>
      )}
      {erroClientes && <p className="erro">{erroClientes}</p>}
      {erro && <p className="erro">{erro}</p>}
      {mensagem && <p className="ok">{mensagem}</p>}
    </div>
  )
}
