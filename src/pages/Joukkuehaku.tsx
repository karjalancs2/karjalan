import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";
import { useTranslation } from "../contexts/TranslationContext";
import { faceitTierClass, safeString } from "../lib/utils";
import { apiFetch } from "../lib/http";

type FaceitProfile = {
  username: string;
  avatar: string | null;
  elo: number | null;
  level: number | null;
};

type Team = {
  id: string;
  name: string;
  rankingPoints: number;
  captain: {
    username: string;
    faceitProfile: FaceitProfile | null;
  };
  members: { slotNumber: number }[];
};

export default function Joukkuehaku() {
  const { language } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await apiFetch("/api/teams");
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch teams");
        }
        setTeams(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : language === "fi"
              ? "Joukkueiden haku epäonnistui."
              : "Failed to load teams.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [language]);

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-3">
          KARJALAN
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight uppercase mb-4">
          JOUKKUEHAKU
        </h1>
        <p className="text-neutral-400 max-w-2xl text-lg">
          {language === "fi"
            ? "Löydä joukkueita, jotka etsivät uusia pelaajia."
            : "Find teams looking for new players."}
        </p>
      </header>

      {loading && (
        <p className="text-neutral-400">
          {language === "fi" ? "Ladataan joukkueita..." : "Loading teams..."}
        </p>
      )}

      {!loading && error && (
        <section className="border border-red-900/60 bg-red-950/30 p-6 rounded-sm">
          <h2 className="text-xl font-bold mb-2">
            {language === "fi" ? "Virhe" : "Error"}
          </h2>
          <p className="text-red-200">{error}</p>
        </section>
      )}

      {!loading && !error && teams.length === 0 && (
        <section className="border border-dashed border-neutral-700 p-10 text-center rounded-sm">
          <Users className="w-8 h-8 mx-auto mb-4 text-neutral-600" />
          <p className="text-neutral-400">Joukkueita ei löytynyt.</p>
        </section>
      )}

      {!loading && !error && teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {teams.map((team) => {
            const profile = team.captain.faceitProfile;
            return (
              <article
                key={team.id}
                className="border border-neutral-800 bg-neutral-900 rounded-sm p-6 flex flex-col min-h-64"
              >
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
                      {language === "fi"
                        ? "Etsii pelaajia"
                        : "Looking for players"}
                    </p>
                    <h2 className="text-2xl font-bold uppercase tracking-tight">
                      {team.name}
                    </h2>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold">
                      {team.members.length} / 5
                    </div>
                    <div className="text-xs text-neutral-500">Pelaajaa</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-auto mb-6">
                  {safeString(profile?.avatar) ? (
                    <img
                      src={safeString(profile?.avatar, "#")}
                      alt={profile.username}
                      className="w-11 h-11 rounded-full object-cover border border-neutral-700"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold">
                      {(profile?.username || team.captain.username)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-wider text-neutral-500">
                      {language === "fi"
                        ? "Kapteenin FACEIT"
                        : "Captain FACEIT"}
                    </p>
                    <p className="font-bold">
                      {profile?.username || team.captain.username}
                      <span
                        className={`${faceitTierClass(profile?.level, profile?.elo)} font-normal ml-2`}
                      >
                        ELO {profile?.elo ?? "-"}
                      </span>
                    </p>
                  </div>
                </div>

                <Link
                  to={`/teams/${encodeURIComponent(team.id)}`}
                  className="inline-flex items-center justify-center gap-2 bg-white text-black font-bold px-4 py-2.5 rounded-sm hover:bg-neutral-200 transition-colors"
                >
                  {language === "fi" ? "Näytä Joukkue" : "View Team"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
