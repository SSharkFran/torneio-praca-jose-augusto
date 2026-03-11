import React, { useState, useEffect } from 'react';
import api from '../api';
import { DollarSign, Users, Trophy, Activity, Swords, CalendarClock } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_arrecadado: 0,
    acessos_liberados: 0,
    jogos_andamento: 0,
    total_times: 0,
    total_jogos: 0,
    jogos_finalizados: 0,
    proximo_jogo: null
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const resp = await api.get('/admin/stats');
        setStats(resp.data);
      } catch (err) {
        console.error('Erro ao buscar stats', err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-gray-500 mt-2">Acompanhe os números do torneio em tempo real.</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
           <div className="flex items-center gap-4 mb-4 text-green-600">
               <div className="p-3 bg-green-50 rounded-lg">
                  <DollarSign size={24} />
               </div>
               <span className="font-semibold text-gray-600">Arrecadação (Pix)</span>
           </div>
           <span className="text-4xl font-black text-gray-900">R$ {(stats.total_arrecadado || 0).toLocaleString('pt-BR')}</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
           <div className="flex items-center gap-4 mb-4 text-blue-600">
               <div className="p-3 bg-blue-50 rounded-lg">
                  <Users size={24} />
               </div>
               <span className="font-semibold text-gray-600">Acessos Liberados</span>
           </div>
           <span className="text-4xl font-black text-gray-900">{stats.acessos_liberados}</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
           <div className="flex items-center gap-4 mb-4 text-orange-600">
               <div className="p-3 bg-orange-50 rounded-lg">
                  <Activity size={24} />
               </div>
               <span className="font-semibold text-gray-600">Jogos Ao Vivo</span>
           </div>
           <span className="text-4xl font-black text-gray-900">{stats.jogos_andamento}</span>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6 flex flex-col">
           <div className="flex items-center gap-3 mb-3">
               <div className="p-2.5 bg-blue-100 rounded-lg">
                  <Users size={20} className="text-blue-600" />
               </div>
               <span className="font-semibold text-gray-600 text-sm">Times Cadastrados</span>
           </div>
           <span className="text-3xl font-black text-gray-900">{stats.total_times}</span>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 p-6 flex flex-col">
           <div className="flex items-center gap-3 mb-3">
               <div className="p-2.5 bg-purple-100 rounded-lg">
                  <Swords size={20} className="text-purple-600" />
               </div>
               <span className="font-semibold text-gray-600 text-sm">Total de Jogos</span>
           </div>
           <span className="text-3xl font-black text-gray-900">{stats.total_jogos}</span>
           <span className="text-xs text-gray-400 mt-1">{stats.jogos_finalizados} finalizados</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-6 flex flex-col">
           <div className="flex items-center gap-3 mb-3">
               <div className="p-2.5 bg-emerald-100 rounded-lg">
                  <Trophy size={20} className="text-emerald-600" />
               </div>
               <span className="font-semibold text-gray-600 text-sm">Jogos Finalizados</span>
           </div>
           <span className="text-3xl font-black text-gray-900">{stats.jogos_finalizados}</span>
        </div>
      </div>

      {/* Próximo Jogo */}
      {stats.proximo_jogo && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20">
          <div className="flex items-center gap-2 mb-3 opacity-80">
            <CalendarClock size={18} />
            <span className="text-sm font-medium uppercase tracking-wider">Próximo Jogo</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black">
                {stats.proximo_jogo.time_a} <span className="opacity-60 font-normal">vs</span> {stats.proximo_jogo.time_b}
              </p>
              <p className="text-indigo-200 text-sm mt-1">
                {stats.proximo_jogo.fase} · {formatDate(stats.proximo_jogo.data_hora)}
              </p>
            </div>
            <div className="text-5xl opacity-30">⚽</div>
          </div>
        </div>
      )}
    </div>
  );
}
