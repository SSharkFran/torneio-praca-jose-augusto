import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Play, Pause, Square, Plus, Zap, ChevronRight, Trophy } from 'lucide-react';

const STATUS_COLORS = {
  agendado: 'bg-gray-100 text-gray-800',
  andamento: 'bg-green-100 text-green-800',
  intervalo: 'bg-yellow-100 text-yellow-800',
  finalizado: 'bg-blue-100 text-blue-800',
};

// ==========================
// GOAL CELEBRATION COMPONENT
// ==========================
function GoalCelebration({ teamName, onFinish }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  const confettiColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
  const confettiPieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: confettiColors[i % confettiColors.length],
    delay: `${Math.random() * 0.8}s`,
    size: `${6 + Math.random() * 10}px`,
  }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-goal-overlay pointer-events-none">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Confetti */}
      {confettiPieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            top: '-20px',
            backgroundColor: p.color,
            animationDelay: p.delay,
            width: p.size,
            height: p.size,
          }}
        />
      ))}

      {/* Goal Text */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="text-7xl animate-goal-ball">⚽</div>
        <h1
          className="text-7xl md:text-8xl font-black uppercase tracking-wider animate-goal-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-500 bg-clip-text text-transparent animate-shimmer"
          style={{ animationDelay: '0.2s' }}
        >
          GOOOOL!
        </h1>
        <p className="text-2xl md:text-3xl font-bold text-white animate-goal-text" style={{ animationDelay: '0.5s' }}>
          {teamName}
        </p>
      </div>
    </div>
  );
}

// ==========================
// MAIN COMPONENT
// ==========================
export default function ManageGames() {
  const [jogos, setJogos] = useState([]);
  const [times, setTimes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [gameData, setGameData] = useState({ fase: 'Fase de Grupos', time_a_id: '', time_b_id: '', data_hora: '', torneio_id: 1 });
  const [goalCelebration, setGoalCelebration] = useState(null); // { teamName }
  const [generating, setGenerating] = useState(false);

  const fetchJogos = async () => {
    try {
      const resp = await api.get('/admin/jogos');
      setJogos(resp.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTimes = async () => {
    try {
      const resp = await api.get('/admin/times');
      setTimes(resp.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchJogos();
    fetchTimes();
  }, []);

  const updatePlacar = async (jogoId, time, incremento) => {
    try {
      const jogo = jogos.find(j => j.id === jogoId);
      const novoPlacarA = time === 'a' ? Math.max(0, jogo.placar_a + incremento) : jogo.placar_a;
      const novoPlacarB = time === 'b' ? Math.max(0, jogo.placar_b + incremento) : jogo.placar_b;

      await api.put(`/admin/jogos/${jogoId}/placar`, {
        placar_a: novoPlacarA,
        placar_b: novoPlacarB
      });

      // Trigger goal celebration on increment
      if (incremento > 0) {
        const teamName = time === 'a' ? jogo.time_a_nome : jogo.time_b_nome;
        setGoalCelebration({ teamName });
      }

      fetchJogos();
    } catch (e) {
      alert('Erro ao atualizar placar');
    }
  };

  const updateStatus = async (jogoId, novoStatus) => {
    try {
      await api.put(`/admin/jogos/${jogoId}/placar`, { status: novoStatus });
      fetchJogos();
    } catch (e) {
      alert('Erro ao mudar status');
    }
  };

  const generateBracket = async () => {
    if (!window.confirm('Gerar chaveamento automático? Isso criará os jogos do torneio baseado nos times cadastrados.')) return;
    setGenerating(true);
    try {
      const resp = await api.post('/admin/bracket/generate', { torneio_id: 1 });
      alert(resp.data.message || 'Chaveamento gerado com sucesso!');
      fetchJogos();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao gerar chaveamento');
    } finally {
      setGenerating(false);
    }
  };

  const advancePhase = async () => {
    if (!window.confirm('Avançar fase? Os vencedores serão promovidos para a próxima rodada.')) return;
    try {
      const resp = await api.post('/admin/bracket/advance', { torneio_id: 1 });
      alert(resp.data.message || 'Fase avançada!');
      fetchJogos();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao avançar fase');
    }
  };

  // Group games by phase for display
  const phaseOrder = ['Fase de Grupos', 'Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final'];
  const jogosPorFase = {};
  jogos.forEach(j => {
    if (!jogosPorFase[j.fase]) jogosPorFase[j.fase] = [];
    jogosPorFase[j.fase].push(j);
  });

  return (
    <div className="p-8 animate-fade-in relative">
      {/* Goal Celebration Overlay */}
      {goalCelebration && (
        <GoalCelebration
          teamName={goalCelebration.teamName}
          onFinish={() => setGoalCelebration(null)}
        />
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Jogos</h1>
          <p className="text-gray-500 mt-2">Atualize placares e status em tempo real.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateBracket}
            disabled={generating}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            <Zap size={20} /> {generating ? 'Gerando...' : 'Gerar Chaveamento'}
          </button>
          {jogos.some(j => j.status === 'finalizado') && (
            <button
              onClick={advancePhase}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg shadow-green-500/20"
            >
              <ChevronRight size={20} /> Avançar Fase
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus size={20} /> Novo Jogo
          </button>
        </div>
      </div>

      {/* Games grouped by phase */}
      {phaseOrder.map(fase => {
        const fasJogos = jogosPorFase[fase];
        if (!fasJogos || fasJogos.length === 0) return null;
        return (
          <div key={fase} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Trophy size={20} className="text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">{fase}</h2>
              <span className="text-sm text-gray-400">({fasJogos.length} jogos)</span>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {fasJogos.map(jogo => (
                <div key={jogo.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-semibold text-gray-500 uppercase">{jogo.fase}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[jogo.status]}`}>
                      {jogo.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-8 mb-8">
                    {/* Time A */}
                    <div className="flex-1 flex flex-col items-center">
                      {jogo.time_a_escudo ? (
                        <img src={jogo.time_a_escudo} alt={jogo.time_a_nome} className="w-14 h-14 rounded-full object-cover mb-2 border-2 border-gray-100" />
                      ) : null}
                      <span className="text-xl font-bold mb-4">{jogo.time_a_nome || 'A definir'}</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updatePlacar(jogo.id, 'a', -1)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl hover:bg-gray-200 transition-colors">-</button>
                        <span className="text-5xl font-black w-16 text-center">{jogo.placar_a}</span>
                        <button onClick={() => updatePlacar(jogo.id, 'a', 1)} className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl hover:bg-blue-200 transition-colors"><Plus size={20}/></button>
                      </div>
                    </div>

                    <div className="text-gray-400 font-bold text-2xl">X</div>

                    {/* Time B */}
                    <div className="flex-1 flex flex-col items-center">
                      {jogo.time_b_escudo ? (
                        <img src={jogo.time_b_escudo} alt={jogo.time_b_nome} className="w-14 h-14 rounded-full object-cover mb-2 border-2 border-gray-100" />
                      ) : null}
                      <span className="text-xl font-bold mb-4">{jogo.time_b_nome || 'A definir'}</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updatePlacar(jogo.id, 'b', -1)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl hover:bg-gray-200 transition-colors">-</button>
                        <span className="text-5xl font-black w-16 text-center">{jogo.placar_b}</span>
                        <button onClick={() => updatePlacar(jogo.id, 'b', 1)} className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl hover:bg-blue-200 transition-colors"><Plus size={20}/></button>
                      </div>
                    </div>
                  </div>

                  {/* Status Controls */}
                  <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-100 justify-center">
                    <button
                      onClick={() => updateStatus(jogo.id, 'andamento')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${jogo.status === 'andamento' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                    >
                      <Play size={18} /> Iniciar / Retomar
                    </button>
                    <button
                      onClick={() => updateStatus(jogo.id, 'intervalo')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${jogo.status === 'intervalo' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}
                    >
                      <Pause size={18} /> Intervalo
                    </button>
                    <button
                      onClick={() => updateStatus(jogo.id, 'finalizado')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${jogo.status === 'finalizado' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      <Square size={18} /> Encerrar Jogo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Also show any games not in the predefined phases */}
      {jogos.filter(j => !phaseOrder.includes(j.fase)).length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Outros</h2>
          <div className="grid grid-cols-1 gap-6">
            {jogos.filter(j => !phaseOrder.includes(j.fase)).map(jogo => (
              <div key={jogo.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <span className="text-sm font-semibold text-gray-500">{jogo.fase} — {jogo.time_a_nome} vs {jogo.time_b_nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {jogos.length === 0 && (
        <div className="text-center p-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Trophy size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhum jogo cadastrado.</p>
          <p className="text-sm mt-2">Cadastre os times e use o botão <strong>"Gerar Chaveamento"</strong> para criar o torneio automaticamente.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Novo Jogo</h2>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const formattedDate = gameData.data_hora.replace('T', ' ');
                await api.post('/admin/jogos', { ...gameData, data_hora: formattedDate });
                setShowModal(false);
                fetchJogos();
              } catch (err) {
                alert('Erro ao criar jogo');
              }
            }} className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fase do Torneio</label>
                <select
                  value={gameData.fase}
                  onChange={e => setGameData({...gameData, fase: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option>Fase de Grupos</option>
                  <option>Oitavas de Final</option>
                  <option>Quartas de Final</option>
                  <option>Semifinal</option>
                  <option>Final</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time A</label>
                  <select
                    value={gameData.time_a_id}
                    onChange={e => setGameData({...gameData, time_a_id: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">Selecione...</option>
                    {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time B</label>
                  <select
                    value={gameData.time_b_id}
                    onChange={e => setGameData({...gameData, time_b_id: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">Selecione...</option>
                    {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora</label>
                <input
                  type="datetime-local"
                  value={gameData.data_hora}
                  onChange={e => setGameData({...gameData, data_hora: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
                  Salvar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
