import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from '../contexts/TranslationContext';
import { api } from '../lib/api';
import { User, Team } from '../types';
import { Shield, Crosshair, Award } from 'lucide-react';

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { language } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    async function loadData() {
      if (id) {
        const u = await api.getUser(id);
        setUser(u || null);
        if (u?.teamId) {
          setTeam(await api.getTeam(u.teamId) || null);
        }
      }
    }
    loadData();
  }, [id]);

  if (!user) return <div className="p-12 text-center text-neutral-500 font-bold">{language === 'fi' ? 'Ladataan...' : 'Loading...'}</div>;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-8">
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-900/10 blur-3xl rounded-full mix-blend-screen pointer-events-none"></div>
        
        <div className="w-32 h-32 bg-neutral-800 border-2 border-neutral-700 rounded-lg flex items-center justify-center text-4xl font-bold shadow-xl z-10">
          {user.username.substring(0, 2).toUpperCase()}
        </div>
        
        <div className="flex flex-col items-center md:items-start z-10 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-extrabold tracking-tight">{user.username}</h1>
            <span className="text-2xl">🇫🇮</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
             {user.faceitLevel && (
               <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 px-4 py-1.5 rounded flex items-center gap-2 font-bold">
                 <span>FACEIT Level {user.faceitLevel}</span>
               </div>
             )}
             {user.role && (
               <div className="bg-neutral-800 border border-neutral-700 text-white px-4 py-1.5 rounded flex items-center gap-2 font-medium">
                 <Crosshair className="w-4 h-4 text-neutral-400" />
                 {user.role}
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-1 flex flex-col gap-6">
            {team && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">{language === 'fi' ? 'Nykyinen Joukkue' : 'Current Team'}</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 rounded flex items-center justify-center font-bold">
                    {team.name.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold">{team.name}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">{language === 'fi' ? 'Suomen Ranking' : 'Finnish Ranking'} #{team.id === 't1' ? '1' : team.id === 't2' ? '2' : '3'}</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
               <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">{language === 'fi' ? 'Pelaajatilastot' : 'Player Stats'}</h3>
               <div className="flex flex-col gap-4">
                 <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                   <span className="text-neutral-400 font-medium">{language === 'fi' ? 'Ottelut pelattu' : 'Matches played'}</span>
                   <span className="font-bold text-white">45</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                   <span className="text-neutral-400 font-medium">{language === 'fi' ? 'Voittoprosentti' : 'Win rate'}</span>
                   <span className="font-bold text-green-400">62%</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-neutral-400 font-medium">{language === 'fi' ? 'K/D Suhde' : 'K/D ratio'}</span>
                   <span className="font-bold text-white">1.14</span>
                 </div>
               </div>
            </div>
         </div>
         
         <div className="lg:col-span-2">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
               <Award className="w-12 h-12 text-neutral-700 mb-4" />
               <h3 className="font-bold text-lg text-white mb-2">{language === 'fi' ? 'Ei vielä saavutuksia' : 'No achievements yet'}</h3>
               <p className="text-neutral-500 text-sm max-w-xs">{language === 'fi' ? 'Osallistu turnauksiin ansaitaksesi saavutuksia ja mitalitauluja profiiliisi.' : 'Compete in tournaments to earn achievements and medals for your profile.'}</p>
            </div>
         </div>
      </div>
    </div>
  );
}
