import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Calendar, Clock, Trophy, MapPin, Activity, Search, X, Filter, GitBranch, Heart, AlertTriangle } from 'lucide-react';

const STATUS_COLORS = {
  agendado: 'bg-gray-700 text-gray-300 border-gray-600',
  andamento: 'bg-green-900/40 text-green-400 border-green-500/30 animate-pulse',
  intervalo: 'bg-yellow-900/40 text-yellow-500 border-yellow-600/30',
  finalizado: 'bg-blue-900/30 text-blue-300 border-blue-800/50',
};

const STATUS_TEXT = {
  agendado: 'Aguardando Início',
  andamento: 'AO VIVO',
  intervalo: 'Intervalo',
  finalizado: 'Encerrado',
};

const TIPO_ICONS = {
  cartao_amarelo: '🟨',
  cartao_vermelho: '🟥',
  falta: '⚠️',
  substituicao: '🔄',
  observacao: '📝'
};

// ================================
// GOAL CELEBRATION (Public)
// ================================
function GoalCelebrationPublic({ teamName, onFinish }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 3500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  const confettiColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: confettiColors[i % confettiColors.length],
    delay: `${Math.random() * 0.8}s`,
    size: `${6 + Math.random() * 10}px`,
  }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
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
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="text-8xl animate-goal-ball">⚽</div>
        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-wider animate-goal-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
          GOOOOL!
        </h1>
        <p className="text-2xl md:text-3xl font-bold text-white animate-goal-text" style={{ animationDelay: '0.5s' }}>
          {teamName}
        </p>
      </div>
    </div>
  );
}

// ================================
// FORMAT DATE/TIME
// ================================
function formatDataHora(isoString) {
  if (!isoString) return { date: '—', time: '—' };
  try {
    const dt = new Date(isoString);
    const now = new Date();
    const isToday = dt.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = dt.toDateString() === tomorrow.toDateString();

    let dateStr;
    if (isToday) dateStr = 'Hoje';
    else if (isTomorrow) dateStr = 'Amanhã';
    else dateStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return { date: dateStr, time: timeStr };
  } catch {
    return { date: '—', time: '—' };
  }
}

// ================================
// MAIN COMPONENT
// ================================
export default function PublicFeed() {
  const [jogos, setJogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalCelebration, setGoalCelebration] = useState(null);
  const prevJogosRef = useRef({});

  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  const fetchJogos = async () => {
    try {
      let url = '/public/jogos';
      const params = new URLSearchParams();
      if (dateFilter) params.append('data', dateFilter);
      if (teamFilter) params.append('time', teamFilter);
      if (params.toString()) url += '?' + params.toString();

      const resp = await api.get(url);
      const newJogos = resp.data;

      // Detect goals
      const prevMap = prevJogosRef.current;
      for (const jogo of newJogos) {
        const prev = prevMap[jogo.id];
        if (prev && jogo.status === 'andamento') {
          if (jogo.placar_a > prev.placar_a) {
            setGoalCelebration({ teamName: jogo.time_a_nome });
          } else if (jogo.placar_b > prev.placar_b) {
            setGoalCelebration({ teamName: jogo.time_b_nome });
          }
        }
      }

      const newMap = {};
      newJogos.forEach(j => { newMap[j.id] = { placar_a: j.placar_a, placar_b: j.placar_b }; });
      prevJogosRef.current = newMap;

      setJogos(newJogos);
    } catch (e) {
      console.error("Erro ao obter jogos", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJogos();
    const interval = setInterval(fetchJogos, 5000);
    return () => clearInterval(interval);
  }, [dateFilter, teamFilter]);

  const clearFilters = () => {
    setDateFilter('');
    setTeamFilter('');
  };

  const hasActiveFilters = dateFilter || teamFilter;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <Activity className="text-blue-500 animate-spin" size={40} />
      </div>
    );
  }

  const jogosOrdenados = [...jogos].sort((a, b) => {
    if (a.status === 'andamento') return -1;
    if (b.status === 'andamento') return 1;
    if (a.status === 'intervalo') return -1;
    if (b.status === 'intervalo') return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 font-sans animate-fade-in">
      {goalCelebration && (
        <GoalCelebrationPublic
          teamName={goalCelebration.teamName}
          onFinish={() => setGoalCelebration(null)}
        />
      )}

      <header className="mb-4 pt-4 pb-4 border-b border-slate-800 animate-fade-in" style={{ animationDelay: '100ms' }}>
         <h1 className="text-3xl font-black uppercase tracking-wider bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Torneio Zé Augusto</h1>
         <div className="flex items-center gap-2 text-slate-400 mt-2 text-sm">
             <MapPin size={16} /> Quadra José Augusto, SP
         </div>
      </header>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-4 animate-fade-in" style={{ animationDelay: '120ms' }}>
        <a href="/bracket" className="flex-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-xl p-3 flex items-center gap-3 hover:border-blue-400/50 transition-all">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <GitBranch size={20} className="text-blue-400" />
          </div>
          <div>
            <span className="font-bold text-sm text-white">Ver Chaveamento</span>
            <p className="text-blue-300/60 text-xs">Bracket completo</p>
          </div>
        </a>
        <a href="/baixar-app" className="flex-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-3 flex items-center gap-3 hover:border-purple-400/50 transition-all">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <span className="text-lg">📱</span>
          </div>
          <div>
            <span className="font-bold text-sm text-white">Baixe o App</span>
            <p className="text-purple-300/60 text-xs">Placares ao vivo</p>
          </div>
        </a>
      </div>

      {/* PIX Donation Banner */}
      <div className="mb-4 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 rounded-xl p-4 animate-fade-in" style={{ animationDelay: '140ms' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-full">
            <Heart size={18} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-300">Apoie este projeto gratuito! 💚</p>
            <p className="text-xs text-emerald-400/60 mt-0.5">Faça um Pix de qualquer valor para ajudar a manter o torneio vivo.</p>
          </div>
          <a href="/baixar-app" className="px-3 py-1.5 bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-600/50 transition-colors border border-emerald-500/30">
            Doar via Pix
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            showFilters || hasActiveFilters
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
          }`}
        >
          <Filter size={16} />
          Filtrar Jogos
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>}
        </button>

        {showFilters && (
          <div className="mt-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 animate-slide-down space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">📅 Filtrar por Data</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">🔍 Buscar por Time</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={teamFilter}
                    onChange={e => setTeamFilter(e.target.value)}
                    placeholder="Nome do time..."
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none"
                  />
                </div>
              </div>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                <X size={14} /> Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Games */}
      <div className="space-y-6">
        {jogosOrdenados.map((jogo, index) => {
          const { date, time } = formatDataHora(jogo.data_hora);
          const annotations = jogo.anotacoes || [];
          const hasCards = annotations.some(a => a.tipo === 'cartao_amarelo' || a.tipo === 'cartao_vermelho');

          return (
            <div
              key={jogo.id}
              className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 shadow-xl backdrop-blur-sm animate-fade-in"
              style={{ animationDelay: `${250 + index * 100}ms` }}
            >
               {/* Header */}
               <div className="flex justify-between items-center mb-6">
                   <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{jogo.fase}</span>
                   <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border ${STATUS_COLORS[jogo.status]} flex items-center gap-1`}>
                      {jogo.status === 'andamento' && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>}
                      {STATUS_TEXT[jogo.status]}
                   </span>
               </div>

               {/* Placar */}
               <div className="flex justify-between items-center gap-4">
                  <div className="flex-1 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center shadow-inner mb-3 overflow-hidden">
                          {jogo.time_a_escudo ? (
                            <img src={jogo.time_a_escudo} alt={jogo.time_a_nome} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-black text-slate-400">{jogo.time_a_sigla}</span>
                          )}
                      </div>
                      <span className="font-semibold text-center text-sm">{jogo.time_a_nome}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center px-2">
                      <div className="flex items-center gap-3 text-4xl font-black">
                          <span className={jogo.status === 'andamento' ? 'text-white' : 'text-slate-300'}>{jogo.placar_a}</span>
                          <span className="text-slate-600 text-2xl font-normal">×</span>
                          <span className={jogo.status === 'andamento' ? 'text-white' : 'text-slate-300'}>{jogo.placar_b}</span>
                      </div>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center shadow-inner mb-3 overflow-hidden">
                          {jogo.time_b_escudo ? (
                            <img src={jogo.time_b_escudo} alt={jogo.time_b_nome} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-black text-slate-400">{jogo.time_b_sigla}</span>
                          )}
                      </div>
                      <span className="font-semibold text-center text-sm">{jogo.time_b_nome}</span>
                  </div>
               </div>

               {/* Annotations (Cards, Fouls, etc) */}
               {annotations.length > 0 && (
                 <div className="mt-4 pt-4 border-t border-slate-700/30">
                   <div className="space-y-1.5">
                     {annotations.map(a => (
                       <div key={a.id} className="flex items-center gap-2 text-xs text-slate-400">
                         <span>{TIPO_ICONS[a.tipo] || '📋'}</span>
                         <span className="font-medium text-slate-300">{a.minuto && `${a.minuto}`}</span>
                         <span>{a.jogador}</span>
                         <span className="text-slate-500">({a.time_nome})</span>
                         {a.descricao && <span className="text-slate-500 italic">· {a.descricao}</span>}
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* Footer */}
               <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-center gap-4 text-xs text-slate-500 font-medium">
                   <div className="flex items-center gap-1.5"><Calendar size={14} /> {date}</div>
                   <div className="flex items-center gap-1.5"><Clock size={14} /> {time}</div>
                   {hasCards && <div className="flex items-center gap-1.5"><AlertTriangle size={14} className="text-yellow-500" /> Cartões</div>}
                   <div className="flex items-center gap-1.5"><Trophy size={14} /> Oficial</div>
               </div>
            </div>
          );
        })}

        {jogos.length === 0 && (
            <div className="text-center text-slate-500 py-10 animate-fade-in">
                {hasActiveFilters ? 'Nenhum jogo encontrado com esses filtros.' : 'Nenhum jogo cadastrado ainda.'}
            </div>
        )}
      </div>
    </div>
  );
}
