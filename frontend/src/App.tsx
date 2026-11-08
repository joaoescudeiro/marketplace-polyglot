import { useState } from 'react'
import './App.css'
import './extra.css'
import Carrinho from './Carrinho'
import AdminProdutos from './pages/AdminProdutos'
import Clientes from './pages/Clientes'
import Loja from './pages/Loja'
import Pedidos from './pages/Pedidos'
import type { ItemCarrinho, Produto } from './types'

type Pagina = 'loja' | 'produtos' | 'clientes' | 'pedidos'

const MENU: { id: Pagina; titulo: string }[] = [
  { id: 'loja', titulo: 'Loja' },
  { id: 'produtos', titulo: 'Produtos' },
  { id: 'clientes', titulo: 'Clientes' },
  { id: 'pedidos', titulo: 'Pedidos' },
]

function App() {
  const [pagina, setPagina] = useState<Pagina>('loja')
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  // Muda quando o estoque pode ter mudado (compra/cancelamento), para recarregar a loja
  const [versaoEstoque, setVersaoEstoque] = useState(0)

  const totalItens = carrinho.reduce((soma, i) => soma + i.quantidade, 0)

  function adicionar(produto: Produto) {
    setCarrinho((atual) => {
      const existente = atual.find((i) => i.produto.id === produto.id)
      if (existente) {
        return atual.map((i) =>
          i.produto.id === produto.id
            ? { ...i, quantidade: Math.min(i.quantidade + 1, produto.estoque) }
            : i,
        )
      }
      return [...atual, { produto, quantidade: 1 }]
    })
    setCarrinhoAberto(true)
  }

  function alterarQuantidade(produtoId: string, quantidade: number) {
    if (!Number.isInteger(quantidade) || quantidade < 1) return
    setCarrinho((atual) =>
      atual.map((i) =>
        i.produto.id === produtoId
          ? { ...i, quantidade: Math.min(quantidade, i.produto.estoque) }
          : i,
      ),
    )
  }

  function remover(produtoId: string) {
    setCarrinho((atual) => atual.filter((i) => i.produto.id !== produtoId))
  }

  function compraFinalizada() {
    setCarrinho([])
    setVersaoEstoque((v) => v + 1)
  }

  return (
    <div className="app">
      <header className="cabecalho">
        <a className="logo" href="#" onClick={() => setPagina('loja')}>
          Electronicos
        </a>
        <nav className="menu">
          {MENU.map((item) => (
            <button
              key={item.id}
              className={pagina === item.id ? 'ativo' : ''}
              onClick={() => setPagina(item.id)}
            >
              {item.titulo}
            </button>
          ))}
        </nav>
        {pagina === 'loja' && (
          <div className="pesquisa">
            <input
              type="text"
              placeholder="O que você está procurando?"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <button aria-label="Pesquisar">🔎</button>
          </div>
        )}
        <button className="botao-carrinho" onClick={() => setCarrinhoAberto(!carrinhoAberto)}>
          🛒 Carrinho ({totalItens})
        </button>
        {carrinhoAberto && (
          <Carrinho
            itens={carrinho}
            onQuantidade={alterarQuantidade}
            onRemover={remover}
            onFinalizado={compraFinalizada}
          />
        )}
      </header>

      {pagina === 'loja' && <Loja busca={busca} versao={versaoEstoque} onAdicionar={adicionar} />}
      {pagina === 'produtos' && <AdminProdutos />}
      {pagina === 'clientes' && <Clientes />}
      {pagina === 'pedidos' && (
        <Pedidos versao={versaoEstoque} onEstoqueAlterado={() => setVersaoEstoque((v) => v + 1)} />
      )}

      <footer>
        <a className="logo" href="#">
          Electronicos
        </a>
        <p>Conectando você à tecnologia.</p>
        <small>Projeto acadêmico • 2026</small>
      </footer>
    </div>
  )
}

export default App
