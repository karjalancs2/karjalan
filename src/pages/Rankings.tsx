import { useEffect, useState } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { api } from '../lib/api';
import { RankingEntry, Team } from '../types';
import { Trophy, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Rankings() {
  const { t, language } = useTranslation();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');

  useEffect(() => {
    async function loadData() {
      setRankings(await api.getRankings());
      setTeams(await api.getTeams());
    }
    loadData();
  }, []);

  const getTeam = (id: string) => teams.find(t => t.id === id);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 flex items-center gap-4">
            <span className="text-3xl">🇫🇮</span> {language === 'fi' ? 'KARJALAN RANKINGIT' : 'KARJALAN RANKINGS'}
          </h1>
          <p className="text-neutral-400 max-w-2xl text-lg">
            {language === 'fi'
              ? 'Suomen virallinen CS2-ranking. Pisteet päivittyvät automaattisesti turnaustulosten perusteella.'
              : 'Finland’s official CS2 ranking. Points update automatically based on tournament results.'}
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 border-b border-neutral-800">
        <button 
          onClick={() => setActiveTab('teams')}
          className={`pb-2 font-bold px-1 whitespace-nowrap border-b-2 transition-colors ${activeTab === 'teams' ? 'border-white text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
        >
          {language === 'fi' ? 'Joukkueet' : 'Teams'}
        </button>
        <button 
          onClick={() => setActiveTab('players')}
          className={`pb-2 font-bold px-1 whitespace-nowrap border-b-2 transition-colors ${activeTab === 'players' ? 'border-white text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
        >
          {language === 'fi' ? 'Pelaajat' : 'Players'}
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-x-auto">
        <table className="w-full min-w-[640px] text-left border-collapse">
          <thead>
            <tr className="bg-neutral-950 border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
              <th className="px-6 py-4 font-bold w-20 text-center">{language === 'fi' ? 'Sija' : 'Rank'}</th>
              <th className="px-6 py-4 font-bold">{language === 'fi' ? 'Joukkue' : 'Team'}</th>
              <th className="px-6 py-4 font-bold text-right">{language === 'fi' ? 'Pisteet' : 'Points'}</th>
              <th className="px-6 py-4 font-bold text-center w-24">{language === 'fi' ? 'Muutos' : 'Change'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 text-sm font-medium">
            {rankings.map((ranking) => {
              const team = getTeam(ranking.teamId);
              return (
                <tr key={ranking.teamId} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 text-center">
                    <span className={`font-bold text-lg ${ranking.rank <= 3 ? 'text-white' : 'text-neutral-500'}`}>
                      {ranking.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center font-bold text-xs border border-neutral-700">
                        {team?.name.substring(0,2).toUpperCase()}
                      </div>
                      <span className="font-bold text-base">{team?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-lg tracking-tight">
                    {ranking.points}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {ranking.change > 0 ? (
                      <div className="flex items-center justify-center gap-1 text-green-500">
                        <ArrowUp className="w-4 h-4" />
                        <span>{ranking.change}</span>
                      </div>
                    ) : ranking.change < 0 ? (
                      <div className="flex items-center justify-center gap-1 text-red-500">
                        <ArrowDown className="w-4 h-4" />
                        <span>{Math.abs(ranking.change)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-neutral-600">
                        <Minus className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
