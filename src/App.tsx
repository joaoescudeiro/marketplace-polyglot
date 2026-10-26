import './App.css'

const produtos = [
  {
    id: 1,
    nome: 'Smartphone Samsung Galaxy',
    categoria: 'Celulares',
    preco: 1899.90,
    emoji: '📱',
  },
  {
    id: 2,
    nome: 'Notebook Lenovo IdeaPad',
    categoria: 'Informática',
    preco: 3299.90,
    emoji: '💻',
  },
  {
    id: 3,
    nome: 'Fone Bluetooth JBL',
    categoria: 'Áudio',
    preco: 249.90,
    emoji: '🎧',
  },
  {
    id: 4,
    nome: 'Smartwatch Xiaomi',
    categoria: 'Acessórios',
    preco: 399.90,
    emoji: '⌚',
  },
]

function App() {
  return (
    <div className="app">
      <header className="cabecalho">
        <a className="logo" href="#">
          Electronicos
        </a>
        <div className="pesquisa">
          <input
            type="text"
            placeholder="O que você está procurando?"
            aria-label="Pesquisar produtos" />
          <button aria-label="Pesquisar">🔎</button>
        </div>
        <button className="botao-carrinho"> 🛒 Carrinho </button>
      </header>
      <main>
        <section className="banner">
          <div>
            <span className="etiqueta">TECNOLOGIA PARA VOCÊ</span>
            <h1>O futuro está<br />na palma da sua mão.</h1>
            <p>Encontre os melhores eletrônicos em um só lugar.</p>
            <a href="#produtos" className="botao-banner">
              Explorar produtos
            </a>
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
            {produtos.map((produto) => (
              <article className="card-produto" key={produto.id}>
                <div className="imagem-produto">
                  <span>{produto.emoji}</span>
                </div>
                <div className="info-produto">
                  <span className="categoria">{produto.categoria}</span>
                  <h3>{produto.nome}</h3>
                  <p className="preco">
                    {produto.preco.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL',})}
                  </p>
                  <button
                    className="botao-comprar"
                    onClick={() => alert(`${produto.nome} selecionado!`)}>
                    + Adicionar ao carrinho
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