import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../contexts/TranslationContext";
import { api } from "../lib/api";
import { Tournament, Match, Team } from "../types";
import {
  Trophy,
  Users,
  Calendar,
  ArrowRight,
  Play,
  Twitch,
  Medal,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { fi, enUS } from "date-fns/locale";
import { safeString } from "../lib/utils";

export default function Home() {
  const { t, language } = useTranslation();
  const [featuredTournament, setFeaturedTournament] =
    useState<Tournament | null>(null);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const active = await api.getActiveTournament();
      setFeaturedTournament(active?.tournament || null);
      const activeMatches = Array.isArray(active?.matches)
        ? active.matches
        : Array.isArray(active?.matches?.items)
          ? active.matches.items
          : [];
      setLiveMatches(
        activeMatches.filter(
          (match: Match | null | undefined) =>
            match?.status?.toLowerCase() === "live",
        ),
      );
      setUpcomingMatches(
        activeMatches.filter((match: Match | null | undefined) =>
          ["upcoming", "scheduled", "ready"].includes(
            match?.status?.toLowerCase() ?? "",
          ),
        ),
      );
      setTeams(await api.getTeams());
      const playerTotals = new Map<string, any>();
      setTopPlayers(await api.getTopPlayers());
    }
    loadData();
  }, []);

  const getTeam = (id: string) => teams.find((t) => t.id === id);
  const liveMatchList = Array.isArray(liveMatches) ? liveMatches : [];
  const upcomingMatchList = Array.isArray(upcomingMatches)
    ? upcomingMatches
    : [];
  const hasActiveMatches =
    liveMatchList.length > 0 || upcomingMatchList.length > 0;
  const featuredDate =
    featuredTournament?.date && typeof featuredTournament.date === "string"
      ? (() => {
          const parsed = parseISO(featuredTournament.date);
          return isValid(parsed)
            ? format(parsed, "EEEE HH:mm", {
                locale: language === "fi" ? fi : enUS,
              })
            : "TBA";
        })()
      : "TBA";
  const TeamMark = ({ team }: { team?: Team }) => {
    const name = safeString(team?.name, "?");
    if (!team?.logo) {
      return (
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-[#0d0d0d] text-lg font-black text-amber-400">
          {name.charAt(0).toUpperCase()}
        </span>
      );
    }
    return (
      <span className="relative flex h-14 w-14 items-center justify-center">
        <img
          src={team.logo}
          alt=""
          className="h-14 w-14 rounded-full object-cover border border-amber-500/30"
          onError={(event) => {
            event.currentTarget.hidden = true;
            event.currentTarget.nextElementSibling?.removeAttribute("hidden");
          }}
        />
        <span
          hidden
          className="absolute inset-0 flex items-center justify-center rounded-full border border-amber-500/30 bg-[#0d0d0d] text-lg font-black text-amber-400"
        >
          {name.charAt(0).toUpperCase()}
        </span>
      </span>
    );
  };
  const activeMatch = liveMatchList[0];
  const activeMatchTournamentId =
    activeMatch?.tournamentId || featuredTournament?.id;
  const tournamentStatus =
    featuredTournament?.status?.toLowerCase() ?? "unknown";
  const tournamentEndedByDate =
    Boolean(featuredTournament?.endDate) &&
    new Date(featuredTournament.endDate as string).getTime() < Date.now();
  const isRegistrationOpen = ["join", "registration"].includes(
    tournamentStatus,
  );
  const tournamentStatusLabel =
    tournamentStatus === "finished" ||
    tournamentStatus === "cancelled" ||
    tournamentEndedByDate
      ? "PÄÄTTYNYT"
      : tournamentStatus === "started"
        ? "KÄYNNISSÄ"
        : isRegistrationOpen
          ? "ILMOITTAUTUMINEN AUKI"
          : "TILA TUNTEMATON";

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full relative overflow-hidden bg-gradient-to-b from-neutral-900 to-neutral-950 py-24 sm:py-32 flex flex-col items-center justify-center text-center px-4">
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neutral-700 to-transparent"></div>

        <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tighter text-white mb-6 relative z-10">
          KARJALAN
        </h1>
        <h3 className="text-lg sm:text-2xl font-medium text-neutral-300 mb-4 max-w-2xl relative z-10">
          {t("hero.subtitle")}
        </h3>
        <p className="text-base sm:text-lg text-neutral-500 max-w-2xl mb-10 relative z-10">
          {t("hero.desc")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <Link
            to="/tournaments"
            className="bg-white text-black px-8 py-3.5 rounded-sm font-semibold hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
          >
            {t("hero.cta.primary")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/teamfinder"
            className="bg-neutral-800 border border-neutral-700 text-white px-8 py-3.5 rounded-sm font-semibold hover:bg-neutral-700 transition-colors flex items-center justify-center"
          >
            {t("hero.cta.secondary")}
          </Link>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col gap-16 sm:gap-24">
        {/* Live Matches */}
        {featuredTournament && (
          <section className="order-2 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold tracking-wide uppercase">
                Käynnissä olevat ottelut
              </h2>
            </div>
            {liveMatchList.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {liveMatchList.slice(0, 1).map((match) => {
                  const team1 = getTeam(match?.team1Id);
                  const team2 = getTeam(match?.team2Id);
                  return (
                    <Link
                      key={match.id}
                      to={`/tournaments/${match.tournamentId}?tab=kaavio&match=${match.id}`}
                      className="bg-[#121212]/95 border border-amber-500/20 rounded-lg overflow-hidden flex flex-col hover:border-amber-500/50 transition backdrop-blur"
                    >
                      <div className="px-4 py-2 bg-neutral-950 border-b border-neutral-800 flex justify-between items-center text-xs text-neutral-400 font-medium">
                        <span>
                          {match?.tournamentId === "tr1"
                            ? "Karjalan CS2 Cup #1"
                            : "Turnaus"}{" "}
                          — {match?.round || "Match"}
                        </span>
                        <span>{match?.map || "-"}</span>
                      </div>
                      <div className="p-4 sm:p-6 flex items-center justify-between gap-2">
                        {/* Team 1 */}
                        <div className="flex flex-col items-center gap-3 w-1/3">
                          <TeamMark team={team1} />
                          <span className="font-semibold text-center leading-tight">
                            {safeString(team1?.name, "TBD") || "TBD"}
                          </span>
                        </div>

                        {/* Score */}
                        <div className="flex flex-col items-center justify-center gap-2 w-1/3">
                          <div className="text-3xl sm:text-4xl font-bold tracking-tighter flex items-center gap-2 sm:gap-3">
                            <span
                              className={
                                (match?.team1Score ?? 0) >
                                (match?.team2Score ?? 0)
                                  ? "text-white"
                                  : "text-neutral-500"
                              }
                            >
                              {match?.team1Score ?? 0}
                            </span>
                            <span className="text-neutral-700 text-xl">-</span>
                            <span
                              className={
                                (match?.team2Score ?? 0) >
                                (match?.team1Score ?? 0)
                                  ? "text-white"
                                  : "text-neutral-500"
                              }
                            >
                              {match?.team2Score ?? 0}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>{" "}
                            LIVE
                          </span>
                        </div>

                        {/* Team 2 */}
                        <div className="flex flex-col items-center gap-3 w-1/3">
                          <TeamMark team={team2} />
                          <span className="font-semibold text-center leading-tight">
                            {safeString(team2?.name, "TBD") || "TBD"}
                          </span>
                        </div>
                      </div>
                      {safeString(match?.streamUrl) && (
                        <div className="px-6 py-3 bg-neutral-900 border-t border-neutral-800 flex justify-center">
                          <a
                            href={safeString(match?.streamUrl, "#")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-purple-400 flex items-center gap-2 hover:text-purple-300 transition-colors"
                          >
                            <Twitch className="w-4 h-4" />
                            {t("btn.watch_stream")}
                          </a>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-[#121212]/90 p-6 text-neutral-400 backdrop-blur">
                Tulevat ottelut näkyvät täällä, kun seuraava peli on
                vahvistettu.
              </div>
            )}
          </section>
        )}

        {/* Featured Tournament */}
        {featuredTournament && (
          <section className="order-1 flex flex-col gap-6">
            <h2 className="text-2xl font-bold tracking-wide uppercase">
              {language === "fi" ? "Suositeltu Turnaus" : "Featured Tournament"}
            </h2>
            <Link
              to={`/tournaments/${featuredTournament.id}`}
              className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center relative overflow-hidden hover:border-amber-500/50 transition-colors"
            >
              <div className="absolute -right-20 -top-20 opacity-5 pointer-events-none">
                <Trophy className="w-96 h-96" />
              </div>
              <div className="flex-1 flex flex-col items-start gap-4 z-10">
                <h3 className="text-2xl sm:text-3xl font-bold break-words">
                  {featuredTournament.name}
                </h3>

                <div className="flex flex-wrap gap-6 text-sm font-medium text-neutral-400 mt-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-neutral-500" />
                    <span>
                      {(() => {
                        const teamCount =
                          featuredTournament._count?.teams ||
                          featuredTournament.teams?.length ||
                          featuredTournament.teamsCount ||
                          0;
                        const isStartedOrFinished = [
                          "started",
                          "finished",
                          "cancelled",
                        ].includes(featuredTournament.status);
                        const bracketSlots =
                          teamCount > 0
                            ? Math.pow(2, Math.ceil(Math.log2(teamCount)))
                            : 0;
                        const regSlots =
                          featuredTournament.slots > teamCount
                            ? featuredTournament.slots
                            : teamCount;

                        return `${teamCount} / ${isStartedOrFinished ? bracketSlots : regSlots} ${t(
                          "team.slots",
                        )}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-white">
                      €{featuredTournament.prizePool} {t("prize.pool")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neutral-500" />
                    <span>{featuredDate}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <span className="text-xs font-bold bg-amber-500/10 text-amber-400 px-3 py-1 rounded">
                    {tournamentStatusLabel}
                  </span>
                </div>

                {isRegistrationOpen && (
                  <div className="mt-4">
                    <span className="bg-white text-black px-8 py-3 rounded-sm font-bold inline-block">
                      {t("btn.register")}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          </section>
        )}

        {featuredTournament && (
          <section className="order-3 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-wide uppercase">
                Parhaat Pelaajat
              </h2>
              <Medal className="h-6 w-6 text-amber-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPlayers.map((player: any, index: number) => {
                const team = getTeam(player.teamId);
                const rank = index + 1;
                return (
                  <article
                    key={`${player.id || player.nickname}-${index}`}
                    className={`rounded-lg border bg-[#121212] p-5 backdrop-blur ${rank === 1 ? "border-amber-500/40 shadow-lg shadow-amber-950/20" : "border-neutral-800"}`}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${rank === 1 ? "bg-amber-400 text-black" : rank === 2 ? "bg-slate-300 text-black" : "bg-amber-900 text-amber-100"}`}
                      >
                        #{rank}
                      </span>
                      <span className="text-xs uppercase tracking-widest text-neutral-500">
                        Top player
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {player.avatar ? (
                        <img
                          src={player.avatar}
                          alt=""
                          className="h-14 w-14 rounded-full object-cover border border-amber-500/30"
                        />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-black text-lg font-black text-amber-400">
                          {String(player.nickname || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold">
                          {player.nickname}
                        </h3>
                        <p className="truncate text-sm text-neutral-500">
                          {team?.name || "FACEIT player"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-800 pt-4 text-sm">
                      <div>
                        <span className="block text-neutral-500">K/D</span>
                        <strong className="text-white">
                          {Number(player.kd || 0).toFixed(2)}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-neutral-500">Kills</span>
                        <strong className="text-amber-400">
                          {player.kills || 0}
                        </strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {featuredTournament && (
          <section className="order-2 flex flex-col gap-6">
            <h2 className="text-2xl font-bold tracking-wide uppercase">
              {language === "fi" ? "Tulevat ottelut" : "Upcoming matches"}
            </h2>
            {upcomingMatchList.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-neutral-400">
                No match data available for this event yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {upcomingMatchList.map((match) => (
                  <div
                    key={match?.id || `${match?.team1Id}-${match?.team2Id}`}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex items-center justify-between"
                  >
                    <span className="font-semibold">
                      {match?.team1Id || "TBA"}
                    </span>
                    <span className="text-neutral-500 text-sm">
                      {match?.round || "Match"}
                    </span>
                    <span className="font-semibold">
                      {match?.team2Id || "TBA"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Discord CTA */}
        <section className="order-4 w-full bg-[#121212] border border-amber-500/20 rounded-lg p-8 sm:p-12 flex flex-col items-center text-center gap-6 backdrop-blur">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight uppercase">
            {language === "fi"
              ? "LIITY KARJALAN-YHTEISÖÖN"
              : "JOIN THE KARJALAN COMMUNITY"}
          </h2>
          <div className="text-lg text-neutral-300 max-w-lg flex flex-col gap-2">
            <p>
              {language === "fi" ? "Löydä pelikavereita." : "Find teammates."}
            </p>
            <p>
              {language === "fi" ? "Löydä turnauksia." : "Find tournaments."}
            </p>
            <p>{language === "fi" ? "Kokoa joukkue." : "Build a team."}</p>
            <p>
              {language === "fi"
                ? "Seuraa Suomen CS2-skeneä."
                : "Follow the Finnish CS2 scene."}
            </p>
          </div>
          <a
            href="https://discord.gg/AnYwNXdt4"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 bg-amber-400 hover:bg-amber-300 text-black font-bold px-8 py-4 rounded-sm transition-colors text-lg uppercase tracking-wide shadow-lg shadow-amber-950/30"
          >
            {language === "fi" ? "LIITY DISCORDIIN" : "JOIN DISCORD"}
          </a>
        </section>
      </div>
    </div>
  );
}
