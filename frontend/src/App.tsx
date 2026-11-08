import { useState } from 'react'
import './App.css'

const produtos = [
  {
    id: 1,
    nome: 'Smartphone Samsung Galaxy',
    categoria: 'Celulares',
    preco: 1899.90,
    imagem: '/imagens/smartphone.png',
  },
  {
    id: 2,
    nome: 'Notebook Lenovo IdeaPad',
    categoria: 'Informática',
    preco: 3299.90,
    imagem: '/imagens/notebook.png',
  },
  {
    id: 3,
    nome: 'Fone Bluetooth JBL',
    categoria: 'Áudio',
    preco: 249.90,
    imagem: '/imagens/fone.png',
  },
  {
    id: 4,
    nome: 'Smartwatch Xiaomi',
    categoria: 'Acessórios',
    preco: 399.90,
    imagem: '/imagens/smartwatch.png',
  },
]

type Produto = typeof produtos[number];

function App() {
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<Produto[]>([]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const produtosFiltrados = produtos.filter((produto) => produto.nome.toLowerCase().includes(busca.toLowerCase()));
  return (
    <div className="app">
      <header className="cabecalho">
        {carrinhoAberto && (
          <div className="painel-carrinho">
            <h2>Meu carrinho</h2>
            {carrinho.map((produto) => (
              <p key={produto.id}>{produto.nome}</p>
              ))}
          </div>
        )}
        <a className="logo" href="#">
          Electronicos
        </a>
        <div className="pesquisa">
          <input type="text" placeholder="O que você está procurando?" value={busca} onChange={(event) => setBusca(event.target.value)} />
          <button aria-label="Pesquisar">🔎</button>
        </div>
        <button className="botao-carrinho" onClick={() => setCarrinhoAberto(!carrinhoAberto)}> 🛒 Carrinho ({carrinho.length})</button>
      </header>
      <main>
        <section className="banner">
          <div>
            <span className="etiqueta">TECNOLOGIA PARA VOCÊ</span>
            <h1>O futuro está<br />na palma da sua mão.</h1>
            <p>Encontre os melhores eletrônicos em um só lugar.</p>
            <a href="#produtos" className="botao-banner"> Explorar produtos </a>
          </div>
          <div className="banner-emoji">🎮</div>
        </section>
        <section id="produtos" className="secao-produtos">
          <div className="titulo-secao">
            <div>
              <span className="subtitulo">NOSSA SELEÇÃO</span>
            </div>
            <span className="contador">
              {produtos.length} produtos
            </span>
          </div>
          <div className="grade-produtos">
            {produtosFiltrados.map((produto) => (
              <article className="card-produto" key={produto.id}>
                <div className="imagem-produto">
                  <img src={produto.imagem} alt={produto.nome} />
                </div>
                <div className="info-produto">
                  <span className="categoria">{produto.categoria}</span>
                  <h3>{produto.nome}</h3>
                  <p className="preco">
                    {produto.preco.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL',})}
                  </p>
                  <button
                    className="botao-comprar"
                  onClick={() => { setCarrinho((carrinhoAnterior) =>[...carrinhoAnterior, produto]); alert(`${produto.nome} adicionado ao carrinho!`); }}> Adicionar ao carrinho
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
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