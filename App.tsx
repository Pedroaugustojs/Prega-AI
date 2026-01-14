
import React, { useState, useEffect, useRef } from 'react';
import { SermonParams, SermonOutline, PublicoAlvo, SavedSermon, VerseSuggestion } from './types';
import { generateSermon, suggestVerses } from './services/geminiService';
import BackgroundEffects from './components/BackgroundEffects';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sermon, setSermon] = useState<SermonOutline | null>(null);
  const [history, setHistory] = useState<SavedSermon[]>([]);
  const [activeSermonId, setActiveSermonId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [verseSuggestions, setVerseSuggestions] = useState<VerseSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [form, setForm] = useState<SermonParams>({
    tema: '',
    textoBiblico: '',
    publico: PublicoAlvo.GERAL,
    tempo: 30
  });

  // Refs for auto-resizing textareas
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // Function to resize all textareas
  const resizeAllTextareas = () => {
    textareaRefs.current.forEach((el) => {
      if (el) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
      }
    });
  };

  // Resize when sermon changes or window resizes
  useEffect(() => {
    if (sermon) {
      // Small timeout to ensure DOM is updated
      const timer = setTimeout(resizeAllTextareas, 50);
      window.addEventListener('resize', resizeAllTextareas);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', resizeAllTextareas);
      };
    }
  }, [sermon]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('prega-ai-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Verse Suggestion Logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (form.tema && form.tema.length > 3) {
        setLoadingSuggestions(true);
        try {
          const suggestions = await suggestVerses(form.tema);
          setVerseSuggestions(suggestions);
        } catch (e) {
          console.error("Failed to suggest verses", e);
        } finally {
          setLoadingSuggestions(false);
        }
      } else {
        setVerseSuggestions([]);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [form.tema]);

  const saveToHistory = (newHistory: SavedSermon[]) => {
    setHistory(newHistory);
    localStorage.setItem('prega-ai-history', JSON.stringify(newHistory));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await generateSermon(form);
      const newSaved: SavedSermon = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        params: { ...form },
        outline: result
      };
      
      setSermon(result);
      setActiveSermonId(newSaved.id);
      saveToHistory([newSaved, ...history]);

      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError('Ocorreu um erro ao gerar sua pregação. Verifique sua conexão e tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSermon = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(s => s.id !== id);
    saveToHistory(updated);
    if (activeSermonId === id) {
      setSermon(null);
      setActiveSermonId(null);
    }
  };

  const viewSermon = (saved: SavedSermon) => {
    setSermon(saved.outline);
    setForm(saved.params);
    setActiveSermonId(saved.id);
    document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEditOutline = (field: keyof SermonOutline, value: any) => {
    if (!sermon || !activeSermonId) return;
    const updatedOutline = { ...sermon, [field]: value };
    setSermon(updatedOutline);
    
    const updatedHistory = history.map(s => 
      s.id === activeSermonId ? { ...s, outline: updatedOutline } : s
    );
    saveToHistory(updatedHistory);
  };

  const handleEditTopic = (index: number, field: 'titulo' | 'conteudo', value: string) => {
    if (!sermon || !activeSermonId) return;
    const newTopicos = [...sermon.topicos];
    newTopicos[index] = { ...newTopicos[index], [field]: value };
    const updatedOutline = { ...sermon, topicos: newTopicos };
    setSermon(updatedOutline);

    const updatedHistory = history.map(s => 
      s.id === activeSermonId ? { ...s, outline: updatedOutline } : s
    );
    saveToHistory(updatedHistory);
  };

  const selectVerse = (ref: string) => {
    setForm(prev => ({ ...prev, textoBiblico: ref }));
    setVerseSuggestions([]);
  };

  const copyToClipboard = () => {
    if (!sermon) return;
    
    const text = `
ROTEIRO DE PREGAÇÃO: ${sermon.titulo}
TEMA CENTRAL: ${sermon.temaCentral}
TEXTO BÍBLICO BASE: ${sermon.textoBase}

--- INTRODUÇÃO ---
${sermon.introducao}

--- TÓPICOS PRINCIPAIS ---
${sermon.topicos.map((t, i) => `${i + 1}. ${t.titulo}\n${t.conteudo}`).join('\n\n')}

--- APLICAÇÃO PRÁTICA ---
${sermon.aplicacaoPratica}

--- CONCLUSÃO COM REFLEXÃO ---
${sermon.conclusao}

--- VERSÍCULO-CHAVE FINAL ---
"${sermon.versiculoChave}"

Gerado por PregaAI.
`.trim();

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const registerRef = (key: string, el: HTMLTextAreaElement | null) => {
    if (el) textareaRefs.current.set(key, el);
    else textareaRefs.current.delete(key);
  };

  const scrollToHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen selection:bg-blue-500/30 pb-20">
      <BackgroundEffects />
      
      {/* Header - Optimized with only History link */}
      <nav className="p-4 md:p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-xl md:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">PregaAI</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <button 
            onClick={scrollToHistory}
            className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 cursor-pointer"
          >
            Histórico
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-8 md:pt-12">
        <div className="text-center mb-10 md:mb-16">
          <h1 className="text-3xl md:text-6xl font-serif mb-4 md:mb-6 leading-tight px-2">
            Prepare Mensagens <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient">
              Inspiradas pela Palavra
            </span>
          </h1>
          <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto leading-relaxed px-4">
            Estruture esboços poderosos em segundos. O auxílio ideal para o seu estudo bíblico e preparo de mensagens.
          </p>
        </div>

        {/* Form Container */}
        <div className="glass rounded-2xl md:rounded-3xl p-6 md:p-12 shadow-2xl border-white/5 relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-slate-300 ml-1">Tema da Pregação</label>
                <input
                  type="text"
                  placeholder="Ex: A Graça de Deus, Perseverança..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-sm md:text-base"
                  value={form.tema}
                  onChange={(e) => setForm({ ...form, tema: e.target.value })}
                />
                
                {/* Verse Suggestions Dropdown */}
                {(loadingSuggestions || verseSuggestions.length > 0) && (
                  <div className="absolute z-20 mt-1 w-full glass rounded-xl shadow-2xl p-2 border-blue-500/20 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-blue-400 tracking-widest mb-2 flex justify-between items-center">
                      Sugestões Bíblicas
                      {loadingSuggestions && <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    </div>
                    {verseSuggestions.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectVerse(v.referencia)}
                        className="w-full text-left p-3 rounded-lg hover:bg-blue-500/10 transition-colors group"
                      >
                        <p className="text-sm font-bold text-white group-hover:text-blue-400">{v.referencia}</p>
                        <p className="text-xs text-slate-400 line-clamp-1">{v.texto}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Texto Bíblico</label>
                <input
                  type="text"
                  placeholder="Ex: João 3:16, Salmos 23..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-sm md:text-base"
                  value={form.textoBiblico}
                  onChange={(e) => setForm({ ...form, textoBiblico: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Público-Alvo</label>
                <select
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none appearance-none text-slate-200 text-sm md:text-base"
                  value={form.publico}
                  onChange={(e) => setForm({ ...form, publico: e.target.value })}
                >
                  {Object.values(PublicoAlvo).map(p => (
                    <option key={p} value={p} className="bg-slate-900">{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Duração (minutos)</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-sm md:text-base"
                  value={form.tempo}
                  onChange={(e) => setForm({ ...form, tempo: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-base md:text-lg transition-all transform active:scale-[0.98] ${
                loading 
                ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                : 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:shadow-xl hover:shadow-blue-500/20 text-white animate-gradient shadow-lg'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Inspirando o esboço...
                </span>
              ) : 'Gerar minha pregação'}
            </button>

            <p className="text-[10px] md:text-xs text-center text-slate-500 italic mt-4 px-2">
              * O conteúdo gerado é um auxílio para o preparo e não substitui o pregador nem o estudo bíblico pessoal.
            </p>
          </form>
        </div>

        {error && (
          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm">
            {error}
          </div>
        )}

        {/* Results Section */}
        {sermon && (
          <div id="result-section" className="mt-12 md:mt-16 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <div className="inline-block px-3 md:px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                  Roteiro de Pregação Completo
                </div>
                {activeSermonId && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest animate-in fade-in duration-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    Salvo
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button 
                  onClick={copyToClipboard}
                  className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-full font-medium transition-all text-xs flex items-center justify-center gap-2 border ${copied ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/5'}`}
                >
                  {copied ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Copiado!</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>Copiar</>
                  )}
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 md:flex-none px-4 md:px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full font-medium transition-all text-xs flex items-center justify-center gap-2 border border-white/5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Imprimir
                </button>
              </div>
            </div>

            <div className="glass rounded-2xl md:rounded-[2rem] p-6 md:p-16 shadow-3xl border-white/5 space-y-8 md:space-y-12 overflow-visible">
              <div className="border-b border-white/10 pb-6 md:pb-8 space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-blue-400 tracking-[0.2em] opacity-80">Título da Pregação</p>
                  <textarea 
                    ref={(el) => registerRef('titulo', el)}
                    className="text-2xl md:text-5xl font-serif text-white bg-transparent border-none w-full focus:ring-0 outline-none p-0 resize-none overflow-hidden leading-tight"
                    value={sermon.titulo}
                    onChange={(e) => handleEditOutline('titulo', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold text-purple-400 tracking-[0.2em] opacity-80">Tema Central</p>
                    <textarea 
                      ref={(el) => registerRef('temaCentral', el)}
                      className="text-base md:text-lg font-medium text-slate-200 bg-transparent border-none w-full focus:ring-0 outline-none p-0 resize-none overflow-hidden"
                      value={sermon.temaCentral}
                      onChange={(e) => handleEditOutline('temaCentral', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold text-pink-400 tracking-[0.2em] opacity-80">Texto Bíblico Base</p>
                    <div className="flex flex-col gap-1">
                      <textarea 
                        ref={(el) => registerRef('textoBase', el)}
                        className="text-base md:text-lg font-serif text-slate-200 bg-transparent border-none w-full focus:ring-0 outline-none p-0 resize-none overflow-hidden"
                        value={sermon.textoBase}
                        onChange={(e) => handleEditOutline('textoBase', e.target.value)}
                      />
                      {sermon.textoBaseEscolhidoPelaIA && (
                        <div className="w-fit text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-white/5">Sugerido pela IA</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <section className="space-y-4">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                  Introdução
                </h3>
                <textarea 
                  ref={(el) => registerRef('introducao', el)}
                  className="w-full bg-transparent border-none text-slate-300 text-base md:text-lg leading-relaxed focus:ring-0 outline-none resize-none overflow-hidden h-auto min-h-[60px]"
                  value={sermon.introducao}
                  onChange={(e) => handleEditOutline('introducao', e.target.value)}
                />
              </section>

              <section className="space-y-8 md:space-y-10">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                  Tópicos Principais
                </h3>
                
                <div className="space-y-10 md:space-y-12 pl-6 md:pl-8 border-l border-white/5">
                  {sermon.topicos.map((topico, idx) => (
                    <div key={idx} className="space-y-4 relative">
                      <div className="absolute -left-[2.75rem] md:-left-[3.25rem] top-0 w-8 h-8 bg-slate-900 border border-white/10 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-400 shadow-lg">
                        {idx + 1}
                      </div>
                      <textarea 
                        ref={(el) => registerRef(`topic_title_${idx}`, el)}
                        className="text-xl md:text-2xl font-bold text-white bg-transparent border-none w-full focus:ring-0 outline-none p-0 resize-none overflow-hidden"
                        value={topico.titulo}
                        onChange={(e) => handleEditTopic(idx, 'titulo', e.target.value)}
                      />
                      <textarea 
                        ref={(el) => registerRef(`topic_content_${idx}`, el)}
                        className="w-full bg-transparent border-none text-slate-300 text-base md:text-lg leading-relaxed focus:ring-0 outline-none resize-none overflow-hidden h-auto min-h-[40px]"
                        value={topico.conteudo}
                        onChange={(e) => handleEditTopic(idx, 'conteudo', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-pink-500 rounded-full"></span>
                  Aplicação Prática
                </h3>
                <textarea 
                  ref={(el) => registerRef('aplicacaoPratica', el)}
                  className="w-full bg-transparent border-none text-slate-300 text-base md:text-lg leading-relaxed focus:ring-0 outline-none resize-none overflow-hidden h-auto min-h-[60px]"
                  value={sermon.aplicacaoPratica}
                  onChange={(e) => handleEditOutline('aplicacaoPratica', e.target.value)}
                />
              </section>

              <section className="space-y-4">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  Conclusão com Reflexão
                </h3>
                <textarea 
                  ref={(el) => registerRef('conclusao', el)}
                  className="w-full bg-transparent border-none text-slate-300 text-base md:text-lg leading-relaxed focus:ring-0 outline-none resize-none overflow-hidden h-auto min-h-[60px]"
                  value={sermon.conclusao}
                  onChange={(e) => handleEditOutline('conclusao', e.target.value)}
                />
              </section>

              <section className="pt-8 border-t border-white/5">
                <div className="bg-slate-900/40 p-6 md:p-8 rounded-2xl md:rounded-[1.5rem] border border-white/5 text-center space-y-4">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">Versículo-Chave Final</p>
                  <textarea 
                    ref={(el) => registerRef('versiculoChave', el)}
                    className="italic text-xl md:text-3xl font-serif text-slate-200 bg-transparent border-none w-full focus:ring-0 outline-none resize-none text-center h-auto leading-relaxed overflow-hidden"
                    value={sermon.versiculoChave}
                    onChange={(e) => handleEditOutline('versiculoChave', e.target.value)}
                  />
                </div>
              </section>
            </div>
          </div>
        )}

        {/* History Section */}
        <div id="history" className="mt-16 md:mt-24 pt-8 md:pt-12 border-t border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h2 className="text-xl md:text-2xl font-serif text-white">Suas Pregações Salvas</h2>
            <span className="text-xs text-slate-500 font-medium bg-slate-800 px-3 py-1 rounded-full w-fit">{history.length} mensagens salvas</span>
          </div>
          
          {history.length === 0 ? (
            <div className="glass p-8 md:p-12 text-center rounded-2xl border-dashed border-white/10">
              <p className="text-sm text-slate-500">Nenhuma pregação salva ainda. Comece gerando sua primeira mensagem!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => viewSermon(item)}
                  className={`glass p-5 md:p-6 rounded-2xl cursor-pointer hover:border-blue-500/30 transition-all group relative border ${activeSermonId === item.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="max-w-[85%]">
                      <h4 className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors text-sm md:text-base leading-snug break-words">
                        {item.outline.titulo}
                      </h4>
                      <p className="text-[9px] md:text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                        {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => deleteSermon(item.id, e)}
                      className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[9px] md:text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-white/5">{item.params.publico}</span>
                    <span className="text-[9px] md:text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-white/5">{item.params.tempo} min</span>
                    {item.params.textoBiblico && <span className="text-[9px] md:text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/10 max-w-full truncate">{item.params.textoBiblico}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 text-center">
        <p className="text-slate-600 text-[10px] md:text-sm">
          © {new Date().getFullYear()} PregaAI. Desenvolvido para servir ao Corpo de Cristo.
        </p>
      </footer>
    </div>
  );
};

export default App;
