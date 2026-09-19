import { useEffect, useState } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import { api } from "../lib/api";
import { PlayerRanking, Team } from "../types";

export default function Rankings() {
  const { language } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<PlayerRanking[]>([]);
  const [activeTab, setActiveTab] = useState<"teams" | "players">("teams");

  useEffect(() => {
    async function loadRankings() {
      const [teamRankings, playerRankings] = await Promise.all([
        api.getRankingTeams(),
        api.getRankingPlayers(),
      ]);
      setTeams(teamRankings);
      setPlayers(playerRankings);
    }

    loadRankings();
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          {language === "fi" ? "KARJALAN RANKINGIT" : "KARJALAN RANKINGS"}
        </h1>
        <p className="text-neutral-400 max-w-2xl text-lg">
          {language === "fi"
            ? "Rankingit perustuvat päättyneiden turnausten tuloksiin."
            : "Rankings based on results from finished tournaments."}
        </p>
      </div>

      <div className="flex gap-6 mb-8 border-b border-neutral-800">
        {([
          ["teams", language === "fi" ? "Joukkueet" : "Teams"],
          ["players", language === "fi" ? "Pelaajat" : "Players"],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 font-bold border-b-2 transition-colors ${activeTab === tab ? "border-amber-400 text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-[#121212] border border-neutral-800 rounded-lg overflow-x-auto">
        <table className="w-full min-w-[520px] text-left border-collapse">
          <thead>
            <tr className="bg-neutral-950 border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
              <th className="px-6 py-4 font-bold w-20 text-center">
                {language === "fi" ? "Sija" : "Rank"}
              </th>
              <th className="px-6 py-4 font-bold">
                {activeTab === "teams"
                  ? language === "fi"
                    ? "Joukkue"
                    : "Team"
                  : language === "fi"
                    ? "Pelaaja"
                    : "Player"}
              </th>
              <th className="px-6 py-4 font-bold text-right">
                {activeTab === "teams" ? "Elo" : "K/D"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 text-sm font-medium">
            {activeTab === "teams"
              ? teams.map((team, index) => (
                  <tr
                    key={team.id}
                    className="hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-center text-lg font-bold text-amber-400">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {team.logo ? (
                          <img
                            src={team.logo}
                            alt=""
                            className="w-9 h-9 rounded object-cover border border-amber-500/30"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-neutral-800 rounded flex items-center justify-center font-bold text-xs text-amber-400 border border-neutral-700">
                            {team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-base">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-lg">
                      {team.rankingPoints}
                    </td>
                  </tr>
                ))
              : players.map((player, index) => (
                  <tr
                    key={player.id}
                    className="hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-center text-lg font-bold text-amber-400">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {player.avatar ? (
                          <img
                            src={player.avatar}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-amber-500/30"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-amber-400 border border-neutral-700">
                            {player.nickname.substring(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-base">
                          {player.nickname}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-lg text-amber-400">
                      {player.kd.toFixed(2)}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {((activeTab === "teams" && teams.length === 0) ||
          (activeTab === "players" && players.length === 0)) && (
          <div className="p-8 text-center text-neutral-500">
            {language === "fi"
              ? "Ei ranking-tuloksia päättyneistä turnauksista."
              : "No rankings from finished tournaments yet."}
          </div>
        )}
      </div>
    </div>
  );
}