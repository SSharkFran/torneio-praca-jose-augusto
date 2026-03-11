import React, { useState, useEffect } from 'react';
import api from '../api';
import { Trophy, Plus, Minus, Play, Pause, Square, Zap, AlertTriangle, FileText, X, ChevronDown, ChevronUp, Users, RefreshCw, CheckCircle } from 'lucide-react';

const TIPO_ICONS = {
  cartao_amarelo: '🟨',
  cartao_vermelho: '🟥',
  falta: '⚠️',
  substituicao: '🔄',
  observacao: '📝'
};

const TIPO_LABELS = {
  cartao_amarelo: 'Cartão Amarelo',
  cartao_vermelho: 'Cartão Vermelho',
  falta: 'Falta',
  substituicao: 'Substituição',
  observacao: 'Observação'
};

export default function ManageGames() {
  const [jogos, setJogos] = useState([]);
  const [torneios, setTorneios] = useState([]);
  const [times, setTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / State
  const [showAnnotation, setShowAnnotation] = useState(null); // jogo_id
  const [annotForm, setAnnotForm] = useState({ tipo: 'cartao_amarelo', jogador: '', minuto: '', descricao: '', time_id: '' });
  const [expandedAnnots, setExpandedAnnots] = useState({});
  const [showTeamSelect, setShowTeamSelect] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState([]);

  const fetchData = async () => {
    try {
      const [jResp, tResp, tmResp] = await Promise.all([
        api.get('/admin/jogos'),
        api.get('/admin/torneios'),
        api.get('/admin/times')
      ]);
      setJogos(jResp.data);
      setTorneios(tResp.data);
      setTimes(tmResp.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const torneioAtivo = torneios.find(t => t.status === 'agendado' || t.status === 'andamento');

  // --- JOGOS ACTIONS ---
  const updatePlacar = async (jogoId, field, delta) => {
    const jogo = jogos.find(j => j.id === jogoId);
    if (!jogo) return;
    const newVal = Math.max(0, (jogo[field] || 0) + delta);
    try {
      await api.put(`/admin/jogos/${jogoId}/placar`, { [field]: newVal });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (jogoId, status) => {
    try {
      await api.put(`/admin/jogos/${jogoId}/placar`, { status });
      fetchData();
    } catch (e) { console.error(e); }
  };

  // --- BRACKET ACTIONS ---
  const generateBracket = async () => {
    if (!torneioAtivo) return alert('Nenhum torneio ativo.');
    if (!confirm('Isso irá recriar o chaveamento. Todos os jogos atuais serão apagados. Continuar?')) return;
    try {
      const resp = await api.post('/admin/bracket/generate', { torneio_id: torneioAtivo.id });
      alert(resp.data.message);
      fetchData();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao gerar chaveamento');
    }
  };

  const advancePhase = async () => {
    if (!torneioAtivo) return alert('Nenhum torneio ativo.');
    try {
      const resp = await api.post('/admin/bracket/advance', { torneio_id: torneioAtivo.id });
      alert(resp.data.message);
      fetchData();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao avançar fase');
    }
  };

  // --- TORNEIO ACTIONS ---
  const finalizarTorneio = async () => {
    if (!torneioAtivo) return;
    if (!confirm('Tem certeza que deseja FINALIZAR e ARQUIVAR este torneio?')) return;
    try {
      await api.post(`/admin/torneios/${torneioAtivo.id}/finalizar`);
      alert('Torneio arquivado com sucesso!');
      fetchData();
    } catch (e) { console.error(e); }
  };

  const resetarTorneio = async () => {
    if (!torneioAtivo) return;
    if (!confirm('ATENÇÃO: Todos os jogos e anotações deste torneio serão apagados para recomeçar. Continuar?')) return;
    try {
      await api.post(`/admin/torneios/${torneioAtivo.id}/resetar`);
      alert('Torneio resetado!');
      fetchData();
    } catch (e) { console.error(e); }
  };

  const updateTorneioTeams = async () => {
    if (!torneioAtivo) return;
    try {
      await api.put(`/admin/torneios/${torneioAtivo.id}/times`, { time_ids: selectedTeams });
      alert('Times atualizados!');
      setShowTeamSelect(false);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const openTeamSelection = () => {
    if (torneioAtivo) {
      setSelectedTeams(torneioAtivo.times_participantes.map(t => t.id));
    }
    setShowTeamSelect(true);
  };

  const toggleTeamSelection = (id) => {
    setSelectedTeams(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- ANNOTATIONS ACTIONS ---
  const submitAnnotation = async (jogoId) => {
    try {
      await api.post(`/admin/jogos/${jogoId}/anotacoes`, annotForm);
      setShowAnnotation(null);
      setAnnotForm({ tipo: 'cartao_amarelo', jogador: '', minuto: '', descricao: '', time_id: '' });
      fetchData();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao registrar anotação');
    }
  };

  const deleteAnnotation = async (annotId) => {
    if (!confirm('Remover esta anotação?')) return;
    try {
      await api.delete(`/admin/anotacoes/${annotId}`);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const toggleAnnots = (jogoId) => {
    setExpandedAnnots(prev => ({ ...prev, [jogoId]: !prev[jogoId] }));
  };

  // Group by fase
  const fases = {};
  jogos.forEach(j => {
    const f = j.fase || 'Sem Fase';
    if (!fases[f]) fases[f] = [];
    fases[f].push(j);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin text-blue-500"><Trophy size={32} /></div></div>;
  }

  return (
    <div className="p-8 animate-fade-in relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Jogos</h1>
          <p className="text-gray-500 mt-1">Atualize placares, status e anotações em tempo real.</p>
        </div>
      </div>

      {/* PAINEL DO TORNEIO ATUAL */}
      {torneioAtivo && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                 <Trophy size={20} />
               </div>
               <div>
                  <h2 className="text-lg font-bold text-gray-900">Torneio Ativo: {torneioAtivo.nome}</h2>
                  <p className="text-sm text-gray-500">
                    {torneioAtivo.times_participantes.length} times participantes • {jogos.length} jogos cadastrados
                  </p>
               </div>
             </div>
             <div className="flex gap-2">
                <button onClick={openTeamSelection} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2">
                  <Users size={16} /> Selecionar Times
                </button>
                <button onClick={resetarTorneio} className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors flex items-center gap-2">
                  <RefreshCw size={16} /> Resetar Torneio
                </button>
                <button onClick={finalizarTorneio} className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors flex items-center gap-2">
                  <CheckCircle size={16} /> Finalizar & Arquivar
                </button>
             </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button onClick={advancePhase} className="px-4 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center gap-2 text-sm">
              <Zap size={16} /> Avançar Fase do Chaveamento
            </button>
            <button onClick={generateBracket} className="px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm">
              <Zap size={16} /> Criar Novo Chaveamento (Sorteio)
            </button>
          </div>
        </div>
      )}

      {!torneioAtivo && (
         <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center mb-8">
            <Trophy size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">Nenhum torneio ativo</h2>
            <p className="text-gray-500 mb-6">Você precisa criar um torneio ativo antes de gerenciar jogos.</p>
         </div>
      )}

      {/* TEAM SELECTION MODAL */}
      {showTeamSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTeamSelect(false)}></div>
          <div className="bg-white p-6 rounded-2xl w-[500px] max-w-[90%] z-10 animate-slide-up">
            <h2 className="text-xl font-bold mb-4">Selecionar Equipes Participantes</h2>
            <p className="text-sm text-gray-500 mb-4">Esses times entrarão no sorteio de Chaveamento.</p>
            <div className="max-h-[300px] overflow-y-auto space-y-2 mb-6 p-2 bg-gray-50 rounded-lg">
               {times.map(t => (
                 <label key={t.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-indigo-400">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-indigo-600 rounded" 
                      checked={selectedTeams.includes(t.id)}
                      onChange={() => toggleTeamSelection(t.id)} 
                    />
                    {t.escudo ? (
                      <img src={t.escudo} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xs">{t.sigla}</div>
                    )}
                    <span className="font-medium">{t.nome}</span>
                 </label>
               ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowTeamSelect(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button onClick={updateTorneioTeams} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Salvar Participantes ({selectedTeams.length})</button>
            </div>
          </div>
        </div>
      )}


      {/* GAMES LIST */}
      {Object.entries(fases).map(([fase, jogosDoFase]) => (
        <div key={fase} className="mb-10 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <Trophy size={20} className="text-blue-500" />
            <h2 className="text-xl font-bold text-gray-800">{fase}</h2>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-medium">{jogosDoFase.length} jogos</span>
          </div>

          <div className="space-y-5">
            {jogosDoFase.map(jogo => (
              <div key={jogo.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider p-1">{jogo.fase} - Id: {jogo.id}</span>
                  <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border ${
                    jogo.status === 'andamento' ? 'bg-green-50 text-green-600 border-green-200' :
                    jogo.status === 'intervalo' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                    jogo.status === 'finalizado' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    {jogo.status === 'andamento' ? '🟢 AO VIVO' :
                     jogo.status === 'intervalo' ? '⏸ INTERVALO' :
                     jogo.status === 'finalizado' ? '✅ ENCERRADO' : '🕐 AGENDADO'}
                  </span>
                </div>

                {/* Placar */}
                <div className="flex justify-between items-center gap-4 mb-4">
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {jogo.time_a_escudo ? (
                        <img src={jogo.time_a_escudo} className="w-10 h-10 rounded-full object-cover" alt="" />
                      ) : null}
                      <p className="font-bold text-gray-900">{jogo.time_a_nome}</p>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => updatePlacar(jogo.id, 'placar_a', -1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"><Minus size={14} /></button>
                      <span className="text-4xl font-black text-gray-900 w-14 text-center">{jogo.placar_a}</span>
                      <button onClick={() => updatePlacar(jogo.id, 'placar_a', 1)} className="w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-600 transition-colors"><Plus size={14} /></button>
                    </div>
                  </div>
                  <span className="text-gray-300 text-2xl font-light">×</span>
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <p className="font-bold text-gray-900">{jogo.time_b_nome}</p>
                      {jogo.time_b_escudo ? (
                        <img src={jogo.time_b_escudo} className="w-10 h-10 rounded-full object-cover" alt="" />
                      ) : null}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => updatePlacar(jogo.id, 'placar_b', -1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"><Minus size={14} /></button>
                      <span className="text-4xl font-black text-gray-900 w-14 text-center">{jogo.placar_b}</span>
                      <button onClick={() => updatePlacar(jogo.id, 'placar_b', 1)} className="w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-600 transition-colors"><Plus size={14} /></button>
                    </div>
                  </div>
                </div>

                {/* Status Controls */}
                <div className="flex justify-center gap-3 mb-4">
                  <button onClick={() => updateStatus(jogo.id, 'andamento')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${jogo.status === 'andamento' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}><Play size={14} /> Iniciar / Retomar</button>
                  <button onClick={() => updateStatus(jogo.id, 'intervalo')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${jogo.status === 'intervalo' ? 'bg-yellow-600 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}><Pause size={14} /> Intervalo</button>
                  <button onClick={() => updateStatus(jogo.id, 'finalizado')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${jogo.status === 'finalizado' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}><Square size={14} /> Encerrar Jogo</button>
                </div>

                {/* Annotations Section */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => toggleAnnots(jogo.id)} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                      <FileText size={14} />
                      Anotações ({jogo.anotacoes?.length || 0})
                      {expandedAnnots[jogo.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => { setShowAnnotation(showAnnotation === jogo.id ? null : jogo.id); setAnnotForm({ ...annotForm, time_id: '' }); }}
                      className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium flex items-center gap-1"
                    >
                      <Plus size={12} /> Nova Anotação
                    </button>
                  </div>

                  {/* New Annotation Form */}
                  {showAnnotation === jogo.id && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-200 animate-slide-down">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <select
                          value={annotForm.tipo}
                          onChange={e => setAnnotForm({ ...annotForm, tipo: e.target.value })}
                          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          {Object.entries(TIPO_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{TIPO_ICONS[key]} {label}</option>
                          ))}
                        </select>
                        <select
                          value={annotForm.time_id}
                          onChange={e => setAnnotForm({ ...annotForm, time_id: e.target.value })}
                          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Selecionar Time</option>
                          {jogo.time_a_id && <option value={jogo.time_a_id}>{jogo.time_a_nome}</option>}
                          {jogo.time_b_id && <option value={jogo.time_b_id}>{jogo.time_b_nome}</option>}
                        </select>
                        <input
                          placeholder="Jogador"
                          value={annotForm.jogador}
                          onChange={e => setAnnotForm({ ...annotForm, jogador: e.target.value })}
                          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <input
                          placeholder="Minuto (ex: 32')"
                          value={annotForm.minuto}
                          onChange={e => setAnnotForm({ ...annotForm, minuto: e.target.value })}
                          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-3">
                        <input
                          placeholder="Descrição (opcional)"
                          value={annotForm.descricao}
                          onChange={e => setAnnotForm({ ...annotForm, descricao: e.target.value })}
                          className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => submitAnnotation(jogo.id)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                          Registrar
                        </button>
                        <button
                          onClick={() => setShowAnnotation(null)}
                          className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Annotations List */}
                  {expandedAnnots[jogo.id] && jogo.anotacoes && jogo.anotacoes.length > 0 && (
                    <div className="space-y-2 animate-slide-down">
                      {jogo.anotacoes.map(a => (
                        <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm border border-gray-100">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{TIPO_ICONS[a.tipo] || '📋'}</span>
                            <span className="font-medium text-gray-800">{a.minuto && `${a.minuto} - `}{a.jogador || ''}</span>
                            <span className="text-gray-500">{a.time_nome ? `(${a.time_nome})` : ''}</span>
                            {a.descricao && <span className="text-gray-400 italic">· {a.descricao}</span>}
                          </div>
                          <button onClick={() => deleteAnnotation(a.id)} className="text-red-400 hover:text-red-600 transition-colors"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {jogos.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Trophy size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nenhum jogo cadastrado. Gere o chaveamento para começar!</p>
        </div>
      )}
    </div>
  );
}

