import React, { useState, useEffect } from 'react';
import api from '../api';
import { Calendar, Clock, Trophy, MapPin, Activity } from 'lucide-react';

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

export default function PublicFeed() {
  const [jogos, setJogos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJogos = async () => {
    try {
      const resp = await api.get('/public/jogos');
      setJogos(resp.data);
    } catch (e) {
      console.error("Erro ao obters jogos", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJogos();
    const interval = setInterval(fetchJogos, 5000); // Polling 5s
    return () => clearInterval(interval);
  }, []);

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
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 font-sans animate-fade-in">
      <header className="mb-4 pt-4 pb-4 border-b border-slate-800 animate-fade-in" style={{ animationDelay: '100ms' }}>
         <h1 className="text-3xl font-black uppercase tracking-wider bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Torneio Zé Augusto</h1>
         <div className="flex items-center gap-2 text-slate-400 mt-2 text-sm">
             <MapPin size={16} /> Quadra José Augusto, SP
         </div>
      </header>
      
      {/* Banner de Download do App sugerido na Web */}
      <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 hover:opacity-100 transition-opacity animate-fade-in" style={{ animationDelay: '150ms' }}>
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

      <div className="space-y-6">
        {jogosOrdenados.map((jogo, index) => (
          <div 
            key={jogo.id} 
            className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 shadow-xl backdrop-blur-sm animate-fade-in"
            style={{ animationDelay: `${200 + index * 100}ms` }}
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
                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center shadow-inner mb-3">
                        <span className="text-2xl font-black text-slate-400">{jogo.time_a_sigla}</span>
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
                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center shadow-inner mb-3">
                        <span className="text-2xl font-black text-slate-400">{jogo.time_b_sigla}</span>
                    </div>
                    <span className="font-semibold text-center text-sm">{jogo.time_b_nome}</span>
                </div>
             </div>

             {/* Footer do Card */}
             <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-center gap-4 text-xs text-slate-500 font-medium">
                 <div className="flex items-center gap-1.5"><Calendar size={14} /> Hoje</div>
                 <div className="flex items-center gap-1.5"><Clock size={14} /> 15:00</div>
                 <div className="flex items-center gap-1.5"><Trophy size={14} /> Oficial</div>
             </div>
          </div>
        ))}

        {jogos.length === 0 && (
            <div className="text-center text-slate-500 py-10 animate-fade-in">
                Nenhum jogo cadastrado ainda.
            </div>
        )}
      </div>
    </div>
  );
}
