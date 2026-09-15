import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "../contexts/TranslationContext";
import { api } from "../lib/api";
import { Tournament, Match, Team, Player } from "../types";
import { Trophy, Users, Calendar, Info, Clock, Shield, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fi } from "date-fns/locale";
import { faceitTierClass, safeString } from "../lib/utils";

export default function TournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const { language } = useTranslation();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "bracket" | "matches" | "teams"
  >("overview");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchStats, setMatchStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedMatch?.faceitId) return;
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(null);
    setMatchStats(null);
    api
      .getMatchStats(selectedMatch.faceitId)
      .then((data) => {
        if (!cancelled) setMatchStats(data);
      })
      .catch((error: any) => {
        if (!cancelled)
          setStatsError(error?.message || "Failed to load scoreboard");
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMatch]);

  if (!tournament)
    return (
      <div className="p-12 text-center text-neutral-500 font-bold">
        {language === "fi" ? "Ladataan..." : "Loading..."}
      </div>
    );

  const teamList = Array.isArray(teams) ? teams : [];
  const matchList = Array.isArray(matches) ? matches : [];
  const getTeam = (teamId: string) => teamList.find((t) => t.id === teamId);
  const logoFor = (team?: Partial<Team> | null) => team?.logo || undefined;
  const TeamLogo = ({
    team,
    size = "w-6 h-6",
  }: {
    team?: Partial<Team> | null;
    size?: string;
  }) => {
    const fallback = (
      <span
        className={`${size} inline-flex items-center justify-center rounded-full border border-yellow-500/60 bg-neutral-950 text-xs font-bold text-yellow-500`}
      >
        {String(team?.name || "?")
          .charAt(0)
          .toUpperCase()}
      </span>
    );
    if (!logoFor(team)) return fallback;
    return (
      <span
        className={`${size} relative inline-flex items-center justify-center`}
      >
        <img
          src={logoFor(team)}
          alt=""
          className={`${size} object-cover rounded`}
          onError={(event) => {
            event.currentTarget.hidden = true;
            event.currentTarget.nextElementSibling?.removeAttribute("hidden");
          }}
        />
        <span hidden className="absolute inset-0">
          {fallback}
        </span>
      </span>
    );
  };
  const scoreRows = (matchStats?.rounds || []).flatMap((round: any) =>
    (round?.teams || []).flatMap((team: any) =>
      (team?.players || []).map((player: any) => ({
        team: team?.team_id || "Team",
        nickname: player?.nickname || player?.player_id || "Player",
        avatar: player?.avatar,
        stats: player?.player_stats || {},
      })),
    ),
  );
  const scoreboardTeams = matchStats?.rounds?.[0]?.teams || [];
  const renderScoreTable = (team: any, index: number) => {
    const teamRows = scoreRows.filter((row: any) => row.team === team?.team_id);
    return (
      <section
        key={team?.team_id || index}
        className="border border-neutral-800 bg-neutral-900 rounded-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <h3 className="font-bold text-white">
            {getTeam(
              index === 0 ? selectedMatch?.team1Id : selectedMatch?.team2Id,
            )?.name ||
              team?.team_id ||
              `Team ${index + 1}`}
          </h3>
          <span className="text-xs uppercase tracking-widest text-yellow-500">
            Score{" "}
            {index === 0
              ? selectedMatch?.team1Score
              : selectedMatch?.team2Score}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-neutral-500 border-b border-neutral-800">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th>Kills</th>
                <th>Deaths</th>
                <th>Assists (K/D/A)</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map((row: any, rowIndex: number) => (
                <tr
                  key={`${row.nickname}-${rowIndex}`}
                  className="border-b border-neutral-800 last:border-0"
                >
                  <td className="py-3 px-4 flex items-center gap-2 font-bold">
                    {row.avatar && (
                      <img
                        src={row.avatar}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    )}
                    {row.nickname}
                  </td>
                  <td>{row.stats.Kills ?? row.stats.kills ?? "-"}</td>
                  <td>{row.stats.Deaths ?? row.stats.deaths ?? "-"}</td>
                  <td className="text-yellow-500">
                    {row.stats.Assists ?? row.stats.assists ?? "-"} (K/D{" "}
                    {row.stats["K/D Ratio"] ?? row.stats.kd_ratio ?? "-"})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };
  const groupedRounds = matchList
    .reduce((acc: any[], match: any) => {
      const roundKey = Number.isFinite(Number(match?.round))
        ? Number(match.round)
        : 0;
      const group = acc.find((entry) => entry.round === roundKey);
      if (group) {
        group.matches.push(match);
        return acc;
      }
      acc.push({ round: roundKey, matches: [match] });
      return acc;
    }, [])
    .sort((a, b) => a.round - b.round);
  const baseSlotHeight = 100;
  const normalizedStatus = String(
    tournament?.status ?? "upcoming",
  ).toLowerCase();
  const formattedTournamentDate = tournament?.date
    ? (() => {
        const parsed = parseISO(tournament.date);
        return Number.isNaN(parsed.getTime())
          ? "TBA"
          : format(parsed, "dd.MM.yyyy", { locale: fi });
      })()
    : "TBA";
  const formattedRegistrationDeadline = tournament?.registrationDeadline
    ? (() => {
        const parsed = parseISO(tournament.registrationDeadline);
        return Number.isNaN(parsed.getTime())
          ? "TBA"
          : format(parsed, "dd.MM. yyyy HH:mm", { locale: fi });
      })()
    : "TBA";
  const tournamentFormat = tournament?.format || "FACEIT";

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
                {normalizedStatus === "live" && (
                  <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>{" "}
                    Live
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm font-medium text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> {formattedTournamentDate}
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
              {normalizedStatus === "registration"
                ? "ILMOITTAUDU"
                : normalizedStatus === "live"
                  ? "Turnaus on käynnissä"
                  : "Katso tiedot"}
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
                    <span className="font-bold">{tournamentFormat}</span>
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
                      {formattedRegistrationDeadline}
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
            {(tournament.teams || []).length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-neutral-400">
                {language === "fi"
                  ? "Ei rekisteröityjä joukkueita vielä."
                  : "No registered teams yet."}
              </div>
            ) : (
              (tournament.teams || []).map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSelectedTeam(team)}
                  className="w-full text-left bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex items-center justify-between gap-4 hover:border-yellow-500/60 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded border border-neutral-700 bg-neutral-950 flex items-center justify-center overflow-hidden">
                      <TeamLogo team={team} size="w-full h-full" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">{team.name}</div>
                      <div className="text-sm text-neutral-400">
                        {team.country || "FACEIT"} • {team.players?.length || 0}{" "}
                        pelaajaa
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-neutral-400">
                    <div>Pisteet: {team.rankingPoints}</div>
                    <div>Voitot: {team.wins}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === "bracket" && (
          <div className="w-full overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
            {matchList.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-neutral-400">
                No bracket data available for this event yet.
              </div>
            ) : (
              <div className="min-w-[800px] min-h-[640px] flex flex-row items-stretch gap-8 overflow-x-auto pb-4">
                {groupedRounds.map((group: any, roundIndex: number) => (
                  <div
                    key={group.round}
                    className="flex h-full min-h-[640px] flex-col min-w-[220px]"
                  >
                    <h3 className="text-xs font-bold text-neutral-500 uppercase mb-2 text-center">
                      {group.round > 0 ? `Round ${group.round}` : "Unassigned"}
                    </h3>
                    {group.matches.map((m: any) => {
                      const t1 = getTeam(m?.team1Id) || {
                        name: safeString(m?.team1Name, "TBD") || "TBD",
                      };
                      const isBye =
                        !m?.team2Id ||
                        String(m?.team2Name || "").toLowerCase() === "bye";
                      const t2 = isBye
                        ? null
                        : getTeam(m?.team2Id) || {
                            name: safeString(m?.team2Name, "TBD") || "TBD",
                          };
                      return (
                        <div
                          key={m?.id}
                          className="flex flex-col justify-center"
                          style={{
                            minHeight: `${baseSlotHeight * Math.pow(2, roundIndex)}px`,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedMatch(m)}
                            className="bg-neutral-900 border border-neutral-700 rounded w-64 text-sm font-medium overflow-hidden relative"
                          >
                            <div className="absolute -right-8 top-1/2 w-8 h-px bg-neutral-700"></div>
                            <div className="flex justify-between items-center px-4 py-2 border-b border-neutral-800">
                              <span className="flex items-center gap-2">
                                <TeamLogo team={t1} size="w-5 h-5" />
                                {safeString(t1?.name, "TBD") || "TBD"}
                              </span>
                              <span
                                className={
                                  (m?.team1Score ?? 0) > (m?.team2Score ?? 0)
                                    ? "text-white"
                                    : "text-neutral-500"
                                }
                              >
                                {isBye ? "W" : (m?.team1Score ?? 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-2 bg-neutral-950">
                              <span className="flex items-center gap-2">
                                {!isBye && (
                                  <TeamLogo team={t2} size="w-5 h-5" />
                                )}
                                <span
                                  className={isBye ? "text-neutral-500" : ""}
                                >
                                  {isBye
                                    ? "BYE"
                                    : safeString(t2?.name, "TBD") || "TBD"}
                                </span>
                              </span>
                              <span
                                className={
                                  (m?.team2Score ?? 0) > (m?.team1Score ?? 0)
                                    ? "text-white"
                                    : "text-neutral-500"
                                }
                              >
                                {isBye ? "-" : (m?.team2Score ?? 0)}
                              </span>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "matches" && (
          <div className="flex flex-col gap-4">
            {matchList.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-neutral-400">
                No match data available for this event yet.
              </div>
            ) : (
              matchList.map((match) => {
                const team1 = getTeam(match?.team1Id);
                const team2 = getTeam(match?.team2Id);
                return (
                  <button
                    key={match?.id}
                    type="button"
                    onClick={() => setSelectedMatch(match)}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex items-center justify-between hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center gap-8 w-full max-w-2xl mx-auto">
                      <div className="flex-1 text-right font-bold text-lg">
                        <span className="inline-flex items-center gap-2">
                          <TeamLogo team={team1} />
                          {safeString(team1?.name, "TBD") || "TBD"}
                        </span>
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
                        <span className="inline-flex items-center gap-2">
                          <TeamLogo team={team2} />
                          {safeString(team2?.name, "TBD") || "TBD"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      {selectedTeam && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-neutral-950 border border-yellow-500/40 rounded-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield className="text-yellow-500" />
                <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                aria-label="Close roster"
                className="text-neutral-400 hover:text-white"
              >
                <X />
              </button>
            </div>
            <div className="grid gap-3">
              {(selectedTeam.players || []).map((player: Player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 border border-neutral-800 bg-neutral-900 px-4 py-3 rounded"
                >
                  {player.avatar ? (
                    <img
                      src={player.avatar}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <Shield className="w-10 h-10 p-2 text-yellow-500 bg-neutral-950 rounded-full" />
                  )}
                  <span className="font-bold flex-1">{player.nickname}</span>
                  <span
                    className={`text-sm px-2 py-1 rounded ${faceitTierClass(player.skillLevel, player.faceitElo)}`}
                  >
                    Lvl {player.skillLevel ?? "-"} | Elo{" "}
                    {player.faceitElo ?? "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {selectedMatch && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-neutral-950 border border-yellow-500/40 rounded-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-yellow-500">
                  Match scoreboard
                </p>
                <h2 className="text-2xl font-bold">
                  {getTeam(selectedMatch.team1Id)?.name ||
                    selectedMatch.team1Id}{" "}
                  <span className="text-neutral-600">vs</span>{" "}
                  {getTeam(selectedMatch.team2Id)?.name ||
                    selectedMatch.team2Id}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                aria-label="Close scoreboard"
                className="text-neutral-400 hover:text-white"
              >
                <X />
              </button>
            </div>
            {statsLoading && (
              <p className="text-neutral-400">Loading scoreboard...</p>
            )}
            {statsError && <p className="text-red-300">{statsError}</p>}
            {!statsLoading && !statsError && scoreRows.length === 0 && (
              <p className="text-neutral-400">
                No detailed scoreboard data is available yet.
              </p>
            )}
            {scoreRows.length > 0 && scoreboardTeams.length >= 2 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {scoreboardTeams.slice(0, 2).map(renderScoreTable)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
