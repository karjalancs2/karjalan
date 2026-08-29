import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "../contexts/TranslationContext";
import { api } from "../lib/api";
import { Tournament, Match, Team } from "../types";
import { Trophy, Users, Calendar, Info, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fi } from "date-fns/locale";

export default function TournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const { language } = useTranslation();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "bracket" | "matches" | "teams"
  >("overview");

  useEffect(() => {
    async function loadData() {
      if (id) {
        setTournament((await api.getTournament(id)) || null);
        setMatches(await api.getMatchesByTournament(id));
        setTeams(await api.getTeams());
      }
    }
    loadData();
  }, [id]);

  if (!tournament)
    return (
      <div className="p-12 text-center text-neutral-500 font-bold">
        {language === "fi" ? "Ladataan..." : "Loading..."}
      </div>
    );

  const getTeam = (teamId: string) => teams.find((t) => t.id === teamId);

  return (
    <div className="w-full">
      {/* Tournament Header */}
      <div className="w-full bg-neutral-900 border-b border-neutral-800 pt-16 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-neutral-950 border border-neutral-700 rounded-lg flex items-center justify-center">
              <Trophy className="w-10 h-10 text-neutral-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {tournament.name}
                </h1>
                {tournament.status === "live" && (
                  <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>{" "}
                    Live
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm font-medium text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />{" "}
                  {tournament?.date
                    ? format(parseISO(tournament.date), "dd.MM.yyyy", {
                        locale: fi,
                      })
                    : "-"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-yellow-500" />{" "}
                  <span className="text-white">€{tournament.prizePool}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />{" "}
                  {tournament.registeredTeamsCount}/{tournament.teamCapacity}{" "}
                  {language === "fi" ? "joukkuetta" : "teams"}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto">
            <button className="w-full md:w-auto bg-white text-black font-bold px-8 py-3 rounded-sm hover:bg-neutral-200 transition-colors">
              {tournament.status === "registration"
                ? "ILMOITTAUDU"
                : "Turnaus on käynnissä"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full border-b border-neutral-800 bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
          {[
            {
              id: "overview",
              label: language === "fi" ? "Yleiskatsaus" : "Overview",
            },
            { id: "teams", label: language === "fi" ? "Joukkueet" : "Teams" },
            { id: "bracket", label: language === "fi" ? "Kaavio" : "Bracket" },
            { id: "matches", label: language === "fi" ? "Ottelut" : "Matches" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 font-bold text-sm tracking-wide border-b-2 transition-colors ${activeTab === tab.id ? "border-white text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
            >
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-8">
              <section className="bg-neutral-900 border border-neutral-800 rounded-lg p-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Info className="w-5 h-5 text-neutral-500" />
                  {language === "fi"
                    ? "Turnauksen tiedot"
                    : "Tournament details"}
                </h2>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                  <div>
                    <span className="block text-neutral-500 mb-1 font-medium">
                      {language === "fi" ? "Formaatti" : "Format"}
                    </span>
                    <span className="font-bold">{tournament.format}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-500 mb-1 font-medium">
                      {language === "fi" ? "Osallistumismaksu" : "Entry fee"}
                    </span>
                    <span className="font-bold">
                      {tournament.entryFee > 0
                        ? `€${tournament.entryFee}`
                        : language === "fi"
                          ? "Ilmainen"
                          : "Free"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-neutral-500 mb-1 font-medium">
                      {language === "fi"
                        ? "Ilmoittautuminen päättyy"
                        : "Registration closes"}
                    </span>
                    <span className="font-bold">
                      {tournament?.registrationDeadline
                        ? format(
                            parseISO(tournament.registrationDeadline),
                            "dd.MM. yyyy HH:mm",
                            { locale: fi },
                          )
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-neutral-500 mb-1 font-medium">
                      {language === "fi" ? "Järjestäjä" : "Organizer"}
                    </span>
                    <span className="font-bold">Karjalan</span>
                  </div>
                </div>
              </section>
            </div>
            <div className="flex flex-col gap-8">
              <section className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                <h2 className="font-bold mb-4">
                  {language === "fi" ? "Palkintopotti" : "Prize pool"}: €
                  {tournament.prizePool}
                </h2>
                <ul className="space-y-3 text-sm font-medium">
                  <li className="flex justify-between items-center">
                    <span className="text-yellow-500">
                      {language === "fi" ? "1. Sija" : "1st place"}
                    </span>{" "}
                    <span>€{tournament.prizePool}</span>
                  </li>
                </ul>
              </section>
              <section className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                <h2 className="font-bold mb-4">
                  {language === "fi" ? "FACEIT-joukkue" : "FACEIT team"}
                </h2>
                <p className="text-sm text-neutral-400 mb-4">
                  {language === "fi"
                    ? "Linkitä joukkueesi FACEIT URL, jotta tiimi voidaan yhdistää turnaukseen."
                    : "Link your team’s FACEIT URL so it can be connected to the tournament."}
                </p>
                <a
                  href={`/tournaments/${tournament.id}/link-faceit-team`}
                  className="inline-flex items-center justify-center w-full bg-white text-black font-bold px-4 py-3 rounded-sm hover:bg-neutral-200 transition-colors"
                >
                  {language === "fi"
                    ? "Linkitä FACEIT-joukkue"
                    : "Link FACEIT team"}
                </a>
              </section>
            </div>
          </div>
        )}

        {activeTab === "teams" && (
          <div className="space-y-4">
            {teams.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-neutral-400">
                {language === "fi"
                  ? "Ei rekisteröityjä joukkueita vielä."
                  : "No registered teams yet."}
              </div>
            ) : (
              teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-lg">{team.name}</div>
                    <div className="text-sm text-neutral-400">
                      {team.country} • {team.playerIds.length} pelaajaa
                    </div>
                  </div>
                  <div className="text-right text-sm text-neutral-400">
                    <div>Pisteet: {team.rankingPoints}</div>
                    <div>Voitot: {team.wins}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "bracket" && (
          <div className="w-full overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
            {matches?.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-neutral-400">
                No bracket data available for this event yet.
              </div>
            ) : (
            <div className="min-w-[800px] flex gap-16">
              {/* Visual Bracket Implementation */}
              <div className="flex flex-col gap-4 justify-center">
                <h3 className="text-xs font-bold text-neutral-500 uppercase mb-4 text-center">
                  Puolivälierät
                </h3>
                {matches?.map((m) => {
                  const t1 = getTeam(m?.team1Id);
                  const t2 = getTeam(m?.team2Id);
                  return (
                    <div
                      key={m?.id}
                      className="bg-neutral-900 border border-neutral-700 rounded w-64 text-sm font-medium overflow-hidden relative"
                    >
                      <div className="absolute -right-8 top-1/2 w-8 h-px bg-neutral-700"></div>
                      <div className="flex justify-between items-center px-4 py-2 border-b border-neutral-800">
                        <span>{t1?.name || "TBA"}</span>
                        <span
                          className={
                            (m?.team1Score ?? 0) > (m?.team2Score ?? 0)
                              ? "text-white"
                              : "text-neutral-500"
                          }
                        >
                          {m?.team1Score ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-2 bg-neutral-950">
                        <span>{t2?.name || "TBA"}</span>
                        <span
                          className={
                            (m?.team2Score ?? 0) > (m?.team1Score ?? 0)
                              ? "text-white"
                              : "text-neutral-500"
                          }
                        >
                          {m?.team2Score ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-4 justify-center relative">
                <h3 className="text-xs font-bold text-neutral-500 uppercase mb-4 text-center">
                  Välierät
                </h3>
                <div className="absolute -left-8 top-1/2 w-8 h-px bg-neutral-700"></div>
                <div className="bg-neutral-900/50 border border-neutral-800 border-dashed rounded w-64 text-sm font-medium overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 border-b border-neutral-800 text-neutral-600">
                    <span>TBA</span>
                    <span>-</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 bg-neutral-950/50 text-neutral-600">
                    <span>TBA</span>
                    <span>-</span>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {activeTab === "matches" && (
          <div className="flex flex-col gap-4">
            {matches?.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-neutral-400">
                No match data available for this event yet.
              </div>
            ) : matches?.map((match) => {
              const team1 = getTeam(match?.team1Id);
              const team2 = getTeam(match?.team2Id);
              return (
                <div
                  key={match?.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex items-center justify-between hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-8 w-full max-w-2xl mx-auto">
                    <div className="flex-1 text-right font-bold text-lg">
                      {team1?.name}
                    </div>
                    <div className="flex flex-col items-center justify-center min-w-[100px]">
                      <div className="text-xs font-medium text-neutral-500 mb-1">
                        {match?.map || "-"}
                      </div>
                      <div className="text-3xl font-extrabold tracking-tighter bg-neutral-950 px-4 py-2 rounded border border-neutral-800">
                        {match?.team1Score ?? 0}{" "}
                        <span className="text-neutral-700">-</span>{" "}
                        {match?.team2Score ?? 0}
                      </div>
                    </div>
                    <div className="flex-1 text-left font-bold text-lg">
                      {team2?.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
