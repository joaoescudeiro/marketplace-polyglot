import { useCallback, useEffect, useState } from 'react'

// Carrega dados de uma API. Recarrega quando "chave" muda ou quando recarregar() é chamado.
export function useCarregar<T>(buscar: () => Promise<T>, chave: unknown) {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState('')
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    buscar()
      .then((d) => {
        if (ativo) {
          setDados(d)
          setErro('')
        }
      })
      .catch((e: Error) => {
        if (ativo) setErro(e.message)
      })
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  return { dados, erro, recarregar }
}
