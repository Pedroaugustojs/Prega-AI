
export interface SermonParams {
  tema?: string;
  textoBiblico?: string;
  publico: string;
  tempo: number;
}

export interface SermonTopic {
  titulo: string;
  conteudo: string;
}

export interface SermonOutline {
  titulo: string;
  temaCentral: string;
  textoBase: string;
  textoBaseEscolhidoPelaIA: boolean;
  introducao: string;
  topicos: SermonTopic[];
  aplicacaoPratica: string;
  conclusao: string;
  versiculoChave: string;
}

export interface SavedSermon {
  id: string;
  date: string;
  params: SermonParams;
  outline: SermonOutline;
}

export interface VerseSuggestion {
  referencia: string;
  texto: string;
}

export enum PublicoAlvo {
  GERAL = "Igreja Geral",
  JOVENS = "Jovens",
  CONVERTIDOS = "Novos Convertidos",
  LIDERES = "Liderança",
  CRIANCAS = "Crianças",
  CASAIS = "Casais"
}
