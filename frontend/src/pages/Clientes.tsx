import { useState, type ChangeEvent, type FormEvent } from 'react'
import { api } from '../api'
import { mensagemDeErro } from '../format'
import { useCarregar } from '../useCarregar'
import type { Cliente } from '../types'

const vazio = { nome: '', email: '' }

export default function Clientes() {
  const { dados: clientes, erro: erroLista, recarregar } = useCarregar(() => api.clientes.listar(), 0)
  const [form, setForm] = useState(vazio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const campo = (nome: keyof typeof vazio) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [nome]: e.target.value })

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    try {
      if (editandoId) await api.clientes.atualizar(editandoId, form)
      else await api.clientes.criar(form)
      cancelar()
      recarregar()
    } catch (err) {
      setErro(mensagemDeErro(err))
    }
  }

  function editar(c: Cliente) {
    setEditandoId(c.id)
    setForm({ nome: c.nome, email: c.email })
  }

  function cancelar() {
    setEditandoId(null)
    setForm(vazio)
  }

  async function excluir(c: Cliente) {
    if (!confirm(`Excluir o cliente "${c.nome}"?`)) return
    try {
      await api.clientes.remover(c.id)
      recarregar()
    } catch (err) {
      setErro(mensagemDeErro(err))
    }
  }

  return (
    <main className="pagina">
      <h2>Clientes (PostgreSQL)</h2>
      <form className="painel form-linha" onSubmit={salvar}>
        <input placeholder="Nome" value={form.nome} onChange={campo('nome')} required />
        <input placeholder="E-mail" type="email" value={form.email} onChange={campo('email')} required />
        <button className="botao-comprar" type="submit">
          {editandoId ? 'Salvar alterações' : 'Adicionar cliente'}
        </button>
        {editandoId && (
          <button type="button" className="botao-secundario" onClick={cancelar}>
            Cancelar
          </button>
        )}
      </form>
      {(erro || erroLista) && <p className="erro">{erro || erroLista}</p>}

      <div className="tabela-wrap">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(clientes ?? []).map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{c.email}</td>
                <td className="acoes">
                  <button className="botao-secundario" onClick={() => editar(c)}>
                    Editar
                  </button>
                  <button className="botao-perigo" onClick={() => excluir(c)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
