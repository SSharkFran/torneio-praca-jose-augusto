import React, { useState, useEffect } from 'react';
import api from '../api';
import { Trophy, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_BADGE = {
  agendado: 'bg-slate-700 text-slate-300',
  andamento: 'bg-green-900/50 text-green-400',
  intervalo: 'bg-yellow-900/50 text-yellow-400',
  finalizado: 'bg-blue-900/50 text-blue-300',
};

export default function BracketView() {
  const [bracket, setBracket] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBracket = async () => {
      try {
        const resp = await api.get('/public/bracket/1');
        setBracket(resp.data);
      } catch (e) {
        console.error('Erro ao buscar bracket', e);
      } finally {
        setLoading(false);
      }
    };
    fetchBracket();
    const interval = setInterval(fetchBracket, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-blue-500 animate-spin"><Trophy size={40} /></div>
      </div>
    );
  }

  const rounds = Object.keys(bracket).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-8 font-sans">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Chaveamento
          </h1>
          <p className="text-slate-500 text-sm mt-1">Torneio Praça José Augusto</p>
        </div>
        <Link to="/app" className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Voltar ao Feed
        </Link>
      </header>

      {rounds.length === 0 && (
        <div className="text-center text-slate-500 py-20">
          <Trophy size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nenhum chaveamento gerado ainda.</p>
        </div>
      )}

      {/* Bracket Display */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {rounds.map((rodada, roundIndex) => {
          const round = bracket[rodada];
          return (
            <div key={rodada} className="flex-shrink-0 min-w-[280px] animate-fade-in" style={{ animationDelay: `${roundIndex * 150}ms` }}>
              {/* Round header */}
              <div className="mb-4 text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rodada {rodada}</span>
                <h3 className="text-lg font-bold text-white mt-1">{round.fase}</h3>
              </div>

              {/* Matchups */}
              <div className="space-y-4" style={{ paddingTop: `${roundIndex * 40}px` }}>
                {round.jogos.map((jogo, idx) => {
                  const isFinished = jogo.status === 'finalizado';
                  const aWon = isFinished && jogo.placar_a > jogo.placar_b;
                  const bWon = isFinished && jogo.placar_b > jogo.placar_a;

                  return (
                    <div key={jogo.id} className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden shadow-lg">
                      {/* Status bar */}
                      <div className={`px-3 py-1 text-[10px] font-bold uppercase text-center ${STATUS_BADGE[jogo.status]}`}>
                        {jogo.status === 'andamento' ? '🔴 AO VIVO' :
                         jogo.status === 'intervalo' ? '⏸ Intervalo' :
                         jogo.status === 'finalizado' ? '✅ Encerrado' : '🕐 Aguardando'}
                      </div>

                      {/* Team A */}
                      <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-700/30 ${aWon ? 'bg-green-900/20' : ''}`}>
                        <div className="flex items-center gap-3">
                          {jogo.time_a_escudo ? (
                            <img src={jogo.time_a_escudo} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                              <span className="text-xs font-black text-slate-400">{jogo.time_a_sigla}</span>
                            </div>
                          )}
                          <span className={`font-semibold text-sm ${aWon ? 'text-green-400' : 'text-white'}`}>
                            {jogo.time_a_nome}
                          </span>
                        </div>
                        <span className={`text-xl font-black ${aWon ? 'text-green-400' : 'text-slate-400'}`}>
                          {jogo.placar_a}
                        </span>
                      </div>

                      {/* Team B */}
                      <div className={`flex items-center justify-between px-4 py-3 ${bWon ? 'bg-green-900/20' : ''}`}>
                        <div className="flex items-center gap-3">
                          {jogo.time_b_escudo ? (
                            <img src={jogo.time_b_escudo} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                              <span className="text-xs font-black text-slate-400">{jogo.time_b_sigla}</span>
                            </div>
                          )}
                          <span className={`font-semibold text-sm ${bWon ? 'text-green-400' : 'text-white'}`}>
                            {jogo.time_b_nome}
                          </span>
                        </div>
                        <span className={`text-xl font-black ${bWon ? 'text-green-400' : 'text-slate-400'}`}>
                          {jogo.placar_b}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
