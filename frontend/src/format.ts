export const brl = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const mensagemDeErro = (e: unknown) => (e instanceof Error ? e.message : 'Erro inesperado')
