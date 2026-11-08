import { useState, type ChangeEvent, type FormEvent } from 'react'
import { api } from '../api'
import { brl, mensagemDeErro } from '../format'
import { useCarregar } from '../useCarregar'
import type { Produto } from '../types'

const vazio = { nome: '', categoria: '', preco: '', estoque: '', imagem: '' }

export default function AdminProdutos() {
  const { dados: produtos, erro: erroLista, recarregar } = useCarregar(() => api.produtos.listar(), 0)
  const [form, setForm] = useState(vazio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const campo = (nome: keyof typeof vazio) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [nome]: e.target.value })

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const dados = {
      nome: form.nome,
      categoria: form.categoria,
      preco: Number(form.preco),
      estoque: Number(form.estoque),
      imagem: form.imagem || undefined,
    }
    try {
      if (editandoId) await api.produtos.atualizar(editandoId, dados)
      else await api.produtos.criar(dados)
      cancelar()
      recarregar()
    } catch (err) {
      setErro(mensagemDeErro(err))
    }
  }

  function editar(p: Produto) {
    setEditandoId(p.id)
    setForm({
      nome: p.nome,
      categoria: p.categoria,
      preco: String(p.preco),
      estoque: String(p.estoque),
      imagem: p.imagem ?? '',
    })
  }

  function cancelar() {
    setEditandoId(null)
    setForm(vazio)
  }

  async function excluir(p: Produto) {
    if (!confirm(`Excluir "${p.nome}"?`)) return
    try {
      await api.produtos.remover(p.id)
      recarregar()
    } catch (err) {
      setErro(mensagemDeErro(err))
    }
  }

  return (
    <main className="pagina">
      <h2>Produtos (MongoDB)</h2>
      <form className="painel form-linha" onSubmit={salvar}>
        <input placeholder="Nome" value={form.nome} onChange={campo('nome')} required />
        <input placeholder="Categoria" value={form.categoria} onChange={campo('categoria')} required />
        <input placeholder="Preço" type="number" min={0} step="0.01" value={form.preco} onChange={campo('preco')} required />
        <input placeholder="Estoque" type="number" min={0} step="1" value={form.estoque} onChange={campo('estoque')} required />
        <input placeholder="Imagem (ex: /imagens/fone.png)" value={form.imagem} onChange={campo('imagem')} />
        <button className="botao-comprar" type="submit">
          {editandoId ? 'Salvar alterações' : 'Adicionar produto'}
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
              <th>Categoria</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(produtos ?? []).map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.categoria}</td>
                <td>{brl(p.preco)}</td>
                <td>{p.estoque}</td>
                <td className="acoes">
                  <button className="botao-secundario" onClick={() => editar(p)}>
                    Editar
                  </button>
                  <button className="botao-perigo" onClick={() => excluir(p)}>
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
