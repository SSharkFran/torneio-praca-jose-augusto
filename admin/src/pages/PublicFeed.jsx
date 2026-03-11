import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Calendar, Clock, Trophy, MapPin, Activity, Search, X, Filter } from 'lucide-react';

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

// ================================
// GOAL CELEBRATION (Public Version)
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-goal-overlay pointer-events-none">
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

  // Filters
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

      // Detect goals for celebration
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

      // Update previous scores map
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

  // Jogo em Andamento sempre primeiro
  const jogosOrdenados = [...jogos].sort((a, b) => {
    if (a.status === 'andamento') return -1;
    if (b.status === 'andamento') return 1;
    if (a.status === 'intervalo') return -1;
    if (b.status === 'intervalo') return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 font-sans animate-fade-in">
      {/* Goal Celebration */}
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

      {/* Banner de Download do App */}
      <div className="mb-4 p-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 hover:opacity-100 transition-opacity animate-fade-in" style={{ animationDelay: '150ms' }}>
        <a href="/baixar-app" className="bg-[#0f172a]/40 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between text-white">
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight">Baixe o App Oficial 📱</span>
            <span className="text-blue-100 text-sm mt-1">Placares ao vivo, notificações e mais</span>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </a>
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
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          )}
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
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
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
          return (
            <div
              key={jogo.id}
              className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 shadow-xl backdrop-blur-sm animate-fade-in"
              style={{ animationDelay: `${250 + index * 100}ms` }}
            >
               {/* Header do Card */}
               <div className="flex justify-between items-center mb-6">
                   <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{jogo.fase}</span>
                   <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border ${STATUS_COLORS[jogo.status]} flex items-center gap-1`}>
                      {jogo.status === 'andamento' && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>}
                      {STATUS_TEXT[jogo.status]}
                   </span>
               </div>

               {/* Placar e Times */}
               <div className="flex justify-between items-center gap-4">
                  {/* Time A */}
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

                  {/* Resultado Central */}
                  <div className="flex flex-col items-center justify-center px-2">
                      <div className="flex items-center gap-3 text-4xl font-black">
                          <span className={jogo.status === 'andamento' ? 'text-white' : 'text-slate-300'}>{jogo.placar_a}</span>
                          <span className="text-slate-600 text-2xl font-normal">×</span>
                          <span className={jogo.status === 'andamento' ? 'text-white' : 'text-slate-300'}>{jogo.placar_b}</span>
                      </div>
                  </div>

                  {/* Time B */}
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

               {/* Footer do Card */}
               <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-center gap-4 text-xs text-slate-500 font-medium">
                   <div className="flex items-center gap-1.5"><Calendar size={14} /> {date}</div>
                   <div className="flex items-center gap-1.5"><Clock size={14} /> {time}</div>
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
