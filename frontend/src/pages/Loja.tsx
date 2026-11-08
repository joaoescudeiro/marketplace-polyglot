import { api } from '../api'
import { brl } from '../format'
import { useCarregar } from '../useCarregar'
import type { Produto } from '../types'

interface Props {
  busca: string
  versao: number
  onAdicionar: (produto: Produto) => void
}

export default function Loja({ busca, versao, onAdicionar }: Props) {
  const { dados: produtos, erro } = useCarregar(() => api.produtos.listar(), versao)
  const filtrados = (produtos ?? []).filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <main>
      <section className="banner">
        <div>
          <span className="etiqueta">TECNOLOGIA PARA VOCÊ</span>
          <h1>
            O futuro está
            <br />
            na palma da sua mão.
          </h1>
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
          <span className="contador">{filtrados.length} produtos</span>
        </div>

        {erro && <p className="erro">{erro}</p>}
        {!produtos && !erro && <p>Carregando produtos...</p>}

        <div className="grade-produtos">
          {filtrados.map((produto) => (
            <article className="card-produto" key={produto.id}>
              <div className="imagem-produto">
                {produto.imagem ? <img src={produto.imagem} alt={produto.nome} /> : <span>📦</span>}
              </div>
              <div className="info-produto">
                <span className="categoria">{produto.categoria}</span>
                <h3>{produto.nome}</h3>
                <p className="preco">{brl(produto.preco)}</p>
                <small className="estoque">
                  {produto.estoque > 0 ? `${produto.estoque} em estoque` : 'Sem estoque'}
                </small>
                <button
                  className="botao-comprar"
                  disabled={produto.estoque < 1}
                  onClick={() => onAdicionar(produto)}
                >
                  {produto.estoque < 1 ? 'Esgotado' : 'Adicionar ao carrinho'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
