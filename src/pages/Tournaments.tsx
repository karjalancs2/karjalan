import { useEffect, useState } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { Tournament } from "../types";
import { Link } from "react-router-dom";
import { format, isValid, parseISO } from "date-fns";
import { fi, enUS } from "date-fns/locale";
import { Trophy, Users, Calendar } from "lucide-react";

export default function Tournaments() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    async function loadData() {
      setTournaments(await api.getTournaments());
    }
    loadData();
  }, []);

  const tournamentList = tournaments || [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h1 className="text-4xl font-extrabold tracking-tight uppercase">
            {t("nav.tournaments")}
          </h1>
          {user?.role === "ADMIN" && (
            <Link
              to="/admin/tournaments"
              className="inline-flex items-center justify-center bg-white text-black font-bold px-5 py-3 rounded-sm hover:bg-neutral-200 transition-colors"
            >
              Hallinnoi Turnauksia (Admin)
            </Link>
          )}
        </div>
        <p className="text-neutral-400 max-w-2xl text-lg">
          {language === "fi"
            ? "Osallistu Suomen kovatasoisimpiin CS2-turnauksiin. Kerää ranking-pisteitä ja nouse huipulle."
            : "Join Finland’s toughest CS2 tournaments. Earn ranking points and climb to the top."}
        </p>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 border-b border-neutral-800">
        <button className="text-white border-b-2 border-white pb-2 font-bold px-1 whitespace-nowrap">
          {language === "fi" ? "Kaikki" : "All"}
        </button>
        <button className="text-neutral-500 hover:text-neutral-300 pb-2 font-medium px-1 whitespace-nowrap">
          {language === "fi" ? "Ilmoittautuminen auki" : "Registration open"}
        </button>
        <button className="text-neutral-500 hover:text-neutral-300 pb-2 font-medium px-1 whitespace-nowrap">
          {language === "fi" ? "Tulossa" : "Upcoming"}
        </button>
        <button className="text-neutral-500 hover:text-neutral-300 pb-2 font-medium px-1 whitespace-nowrap">
          {language === "fi" ? "Käynnissä" : "Live"}
        </button>
        <button className="text-neutral-500 hover:text-neutral-300 pb-2 font-medium px-1 whitespace-nowrap">
          {language === "fi" ? "Päättyneet" : "Completed"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tournamentList.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center text-neutral-400">
            {language === "fi"
              ? "Turnauksia ei ole vielä saatavilla."
              : "No tournaments are available yet."}
          </div>
        ) : (
          (tournamentList || []).map((tournament) => {
          if (!tournament) return null;
          const parsedDate =
            typeof tournament?.date === "string" && tournament.date.trim()
              ? parseISO(tournament.date)
              : null;
          const hasValidDate = parsedDate ? isValid(parsedDate) : false;

          return (
          <Link
            key={tournament?.id}
            to={`/tournaments/${tournament?.id}`}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-neutral-700 transition-colors group"
          >
            <div className="flex items-center gap-4 sm:gap-6 min-w-0">
              <div className="w-14 h-14 sm:w-20 sm:h-20 shrink-0 bg-neutral-950 border border-neutral-800 rounded flex items-center justify-center relative overflow-hidden group-hover:border-neutral-600 transition-colors">
                <Trophy className="w-8 h-8 text-neutral-700" />
                  {tournament?.status === "live" && (
                  <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl"></div>
                )}
              </div>

              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                  <h2 className="text-lg sm:text-xl font-bold break-words">
                    {tournament?.name || "Untitled tournament"}
                  </h2>
                    {tournament?.status === "live" && (
                    <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded uppercase">
                      {language === "fi" ? "Live" : "Live"}
                    </span>
                  )}
                    {tournament?.status === "registration" && (
                    <span className="text-[10px] font-bold bg-green-500/10 text-green-400 px-2 py-0.5 rounded uppercase">
                      {language === "fi" ? "Avoinna" : "Open"}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm font-medium text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-neutral-500" />
                    <span>
                      {hasValidDate && parsedDate
                        ? format(parsedDate, "dd.MM.yyyy", {
                            locale: language === "fi" ? fi : enUS,
                          })
                        : "Date unavailable"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-white">€{tournament.prizePool}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-neutral-500" />
                    <span>
                      {tournament.registeredTeamsCount} /{" "}
                      {tournament.teamCapacity}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-4 md:mt-0 border-t border-neutral-800 md:border-t-0 pt-4 md:pt-0">
              <div className="flex flex-col text-sm">
                <span className="text-neutral-500 font-medium">
                  {language === "fi" ? "Osallistumismaksu" : "Entry fee"}
                </span>
                <span className="font-bold">
                    {(tournament?.entryFee ?? 0) > 0
                      ? `€${tournament?.entryFee}`
                    : language === "fi"
                      ? "Ilmainen"
                      : "Free"}
                </span>
              </div>
              <button className="w-full md:w-auto bg-white text-black font-bold px-6 py-3 rounded-sm hover:bg-neutral-200 transition-colors whitespace-nowrap">
                  {tournament?.status === "registration"
                  ? t("btn.register")
                  : language === "fi"
                    ? "Katso tiedot"
                    : "View details"}
              </button>
            </div>
          </Link>
          );
          })
        )}
      </div>
    </div>
  );
}
