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
  const matchesByRound = matchList.reduce(
    (rounds: Map<number, any[]>, match: any) => {
      const parsedRound = Number(match?.round || match?.roundNumber);
      const round = Number.isFinite(parsedRound) ? parsedRound : 0;
      const matches = rounds.get(round) || [];
      matches.push(match);
      rounds.set(round, matches);
      return rounds;
    },
    new Map<number, any[]>(),
  );
  const roundNumbers = [...matchesByRound.keys()].sort((a, b) => a - b);
  const highestRound = roundNumbers[roundNumbers.length - 1] ?? 0;
  const getMatchSides = (match: any): string[] =>
    [
      match?.team1Id,
      match?.team2Id,
      match?.team1Name,
      match?.team2Name,
      match?.faction1?.teamId,
      match?.faction2?.teamId,
      match?.faction1?.name,
      match?.faction2?.name,
    ]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
  const tracedRounds = new Map<number, any[]>();
  let nextRoundMatches = [...(matchesByRound.get(highestRound) || [])];
  tracedRounds.set(highestRound, nextRoundMatches);

  for (let round = highestRound - 1; round >= 0; round -= 1) {
    const availableMatches = [...(matchesByRound.get(round) || [])];
    const usedMatches = new Set<any>();
    const tracedMatches: any[] = [];
    for (const nextMatch of nextRoundMatches) {
      for (const side of getMatchSides(nextMatch).slice(0, 2)) {
        const feeder = availableMatches.find(
          (match) =>
            !usedMatches.has(match) && getMatchSides(match).includes(side),
        );
        tracedMatches.push(feeder || null);
        if (feeder) usedMatches.add(feeder);
      }
    }
    const remainingMatches = availableMatches.filter(
      (match) => !usedMatches.has(match),
    );
    tracedRounds.set(round, tracedMatches.concat(remainingMatches));
    nextRoundMatches = tracedMatches;
  }

  const roundsWithSlots = roundNumbers.map((round) => {
    const matches = tracedRounds.get(round) || [];
    const roundIndex = roundNumbers.indexOf(round);
    const expectedSlotCount = Math.max(
      matches.length,
      Math.ceil(
        (tracedRounds.get(roundNumbers[0])?.length || 1) / 2 ** roundIndex,
      ),
    );
    return {
      round,
      matches,
      slots: Array.from(
        { length: expectedSlotCount },
        (_, index) => matches[index] || null,
      ),
    };
  });
  const normalizedStatus = String(
    tournament?.status ?? "unknown",
  ).toLowerCase();
  const isRegistrationOpen = ["join", "registration"].includes(
    normalizedStatus,
  );
  const tournamentStatusLabel =
    normalizedStatus === "finished" || normalizedStatus === "cancelled"
      ? "PÄÄTTYNYT"
      : normalizedStatus === "started"
        ? "KÄYNNISSÄ"
        : isRegistrationOpen
          ? "ILMOITTAUTUMINEN AUKI"
          : "TILA TUNTEMATON";
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
                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded uppercase">
                  {tournamentStatusLabel}
                </span>
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

          {isRegistrationOpen && (
            <div className="w-full md:w-auto">
              <button className="w-full md:w-auto bg-white text-black font-bold px-8 py-3 rounded-sm hover:bg-neutral-200 transition-colors">
                ILMOITTAUDU
              </button>
            </div>
          )}
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
              {isRegistrationOpen && (
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
              )}
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
          <div className="bracket-container w-full overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
            {matchList.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-neutral-400">
                No bracket data available for this event yet.
              </div>
            ) : (
              <div className="min-w-[1200px] w-max min-h-[1000px] flex flex-row items-stretch gap-8 overflow-x-auto overflow-y-auto pb-4">
                {roundsWithSlots.map((group: any, roundIndex: number) =>
                  (() => {
                    const slotHeight = Math.pow(2, roundIndex) * 90;
                    return (
                      <div
                        key={group.round}
                        className="flex h-full min-h-[1000px] min-w-[240px] flex-1 flex-col"
                      >
                        <div className="mb-4 min-w-[220px] border-b border-neutral-800 pb-3 text-center">
                          <h3 className="whitespace-nowrap text-xs font-bold uppercase tracking-widest text-neutral-300">
                            {group.matches.length === 4
                              ? "Quarter-finals"
                              : group.matches.length === 2
                                ? "Semi-finals"
                                : group.matches.length === 1
                                  ? "Grand finals"
                                  : group.round > 0
                                    ? `Round ${group.round}`
                                    : "Unassigned"}
                          </h3>
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-600">
                            {group.matches.length} matches - Best of 1
                          </p>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col">
                          {Array.from(
                            { length: Math.ceil(group.slots.length / 2) },
                            (_, pairIndex) => {
                              const pair = group.slots.slice(
                                pairIndex * 2,
                                pairIndex * 2 + 2,
                              );
                              return (
                                <div
                                  key={`pair-${group.round}-${pairIndex}`}
                                  className="flex min-h-0 flex-1 flex-col justify-around"
                                >
                                  {pair.map(
                                    (m: any, pairMatchIndex: number) => {
                                      const matchIndex =
                                        pairIndex * 2 + pairMatchIndex;
                                      const t1 = m
                                        ? getTeam(m?.team1Id) || {
                                            name:
                                              safeString(m?.team1Name, "TBD") ||
                                              "TBD",
                                          }
                                        : null;
                                      const isBye =
                                        !m?.team2Id ||
                                        String(
                                          m?.team2Name || "",
                                        ).toLowerCase() === "bye";
                                      const t2 = !m
                                        ? null
                                        : isBye
                                          ? null
                                          : getTeam(m?.team2Id) || {
                                              name:
                                                safeString(
                                                  m?.team2Name,
                                                  "TBD",
                                                ) || "TBD",
                                            };
                                      const team1Won =
                                        isBye ||
                                        (m?.team1Score ?? 0) >
                                          (m?.team2Score ?? 0);
                                      const team2Won =
                                        !isBye &&
                                        (m?.team2Score ?? 0) >
                                          (m?.team1Score ?? 0);
                                      return (
                                        <div
                                          key={
                                            m?.id ||
                                            `empty-${group.round}-${matchIndex}`
                                          }
                                          style={{ height: `${slotHeight}px` }}
                                          className="relative flex flex-col justify-center px-4"
                                        >
                                          {roundIndex > 0 && (
                                            <div className="absolute top-1/2 -translate-y-1/2 -left-4 z-0 w-4 border-b-2 border-amber-600" />
                                          )}
                                          {roundIndex <
                                            roundsWithSlots.length - 1 && (
                                            <div className="absolute top-1/2 -translate-y-1/2 -right-4 z-0 w-4 border-b-2 border-amber-600" />
                                          )}
                                          {roundIndex <
                                            roundsWithSlots.length - 1 &&
                                            matchIndex % 2 === 0 && (
                                              <div
                                                className="absolute z-0 w-0 border-r-2 border-amber-600"
                                                style={{
                                                  top: "50%",
                                                  right: "-16px",
                                                  height: "100%",
                                                }}
                                              />
                                            )}
                                          {!m ? (
                                            <div
                                              className="h-16 opacity-0"
                                              aria-hidden="true"
                                            />
                                          ) : (
                                            <>
                                              <span className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                                                MATCH{" "}
                                                {roundsWithSlots
                                                  .slice(0, roundIndex)
                                                  .reduce(
                                                    (total, round) =>
                                                      total +
                                                      round.matches.length,
                                                    0,
                                                  ) +
                                                  matchIndex +
                                                  1}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setSelectedMatch(m)
                                                }
                                                className="bracket-card relative z-10 h-auto w-full rounded border border-neutral-800 bg-[#121212] text-sm font-medium overflow-hidden"
                                              >
                                                <div
                                                  className={`flex justify-between items-center border-l-4 border-b border-b-neutral-800 px-4 py-1 ${team1Won ? "border-green-500 bg-[#1a1a1a] text-white" : "border-transparent bg-[#121212] text-gray-400"}`}
                                                >
                                                  <span className="flex items-center gap-2">
                                                    <TeamLogo
                                                      team={t1}
                                                      size="w-5 h-5"
                                                    />
                                                    {safeString(
                                                      t1?.name,
                                                      "TBD",
                                                    ) || "TBD"}
                                                  </span>
                                                  <span
                                                    className={
                                                      team1Won
                                                        ? "text-white"
                                                        : "text-gray-400"
                                                    }
                                                  >
                                                    {isBye
                                                      ? "W"
                                                      : (m?.team1Score ?? 0)}
                                                  </span>
                                                </div>
                                                <div
                                                  className={`flex justify-between items-center border-l-4 bg-[#121212] px-4 py-1 ${team2Won ? "border-green-500 bg-[#1a1a1a] text-white" : "border-transparent text-gray-400"}`}
                                                >
                                                  <span className="flex items-center gap-2">
                                                    {!isBye && (
                                                      <TeamLogo
                                                        team={t2}
                                                        size="w-5 h-5"
                                                      />
                                                    )}
                                                    <span
                                                      className={
                                                        isBye
                                                          ? "text-neutral-500"
                                                          : ""
                                                      }
                                                    >
                                                      {isBye
                                                        ? "BYE"
                                                        : safeString(
                                                            t2?.name,
                                                            "TBD",
                                                          ) || "TBD"}
                                                    </span>
                                                  </span>
                                                  <span
                                                    className={
                                                      team2Won
                                                        ? "text-white"
                                                        : "text-gray-400"
                                                    }
                                                  >
                                                    {isBye
                                                      ? "-"
                                                      : (m?.team2Score ?? 0)}
                                                  </span>
                                                </div>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    );
                  })(),
                )}
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
                    className={`text-sm px-2 py-1 rounded ${faceitTierClass(player.skillLevel)}`}
                  >
                    Level {player.skillLevel ?? "?"}
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
