import { useState } from 'react'
import { api } from '../api'
import { brl, mensagemDeErro } from '../format'
import { useCarregar } from '../useCarregar'
import type { Pedido } from '../types'

const STATUS = ['CRIADO', 'PAGO', 'ENVIADO', 'CANCELADO']

interface Props {
  versao: number
  onEstoqueAlterado: () => void
}

export default function Pedidos({ versao, onEstoqueAlterado }: Props) {
  const { dados: clientes } = useCarregar(() => api.clientes.listar(), 0)
  const [clienteId, setClienteId] = useState('')
  const [erro, setErro] = useState('')
  const {
    dados: pedidos,
    erro: erroLista,
    recarregar,
  } = useCarregar(
    () => (clienteId ? api.pedidos.historico(clienteId) : Promise.resolve([] as Pedido[])),
    `${clienteId}-${versao}`,
  )

  async function mudarStatus(p: Pedido, status: string) {
    setErro('')
    try {
      await api.pedidos.atualizarStatus(p.id, status)
      recarregar()
      if (status === 'CANCELADO') onEstoqueAlterado()
    } catch (err) {
      setErro(mensagemDeErro(err))
    }
  }

  async function excluir(p: Pedido) {
    if (!confirm('Excluir este pedido?')) return
    setErro('')
    try {
      await api.pedidos.remover(p.id)
      recarregar()
    } catch (err) {
      setErro(mensagemDeErro(err))
    }
  }

  return (
    <main className="pagina">
      <h2>Histórico de pedidos (Cassandra)</h2>
      <div className="painel">
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
      </div>
      {(erro || erroLista) && <p className="erro">{erro || erroLista}</p>}
      {clienteId && pedidos && pedidos.length === 0 && <p>Esse cliente ainda não tem pedidos.</p>}

      {(pedidos ?? []).map((p) => (
        <article className="painel pedido" key={p.id}>
          <div className="pedido-topo">
            <strong>Pedido {p.id.slice(0, 8)}</strong>
            <span>{new Date(p.criadoEm).toLocaleString('pt-BR')}</span>
            <select value={p.status} onChange={(e) => mudarStatus(p, e.target.value)}>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="botao-perigo" onClick={() => excluir(p)}>
              Excluir
            </button>
          </div>
          <ul>
            {p.itens.map((i) => (
              <li key={i.produtoId}>
                {i.quantidade}x {i.nome} — {brl(i.precoUnitario)}
              </li>
            ))}
          </ul>
          <p className="total">Total: {brl(p.total)}</p>
        </article>
      ))}
    </main>
  )
}
