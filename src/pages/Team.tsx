import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Shield, Trash2 } from "lucide-react";
import { useTranslation } from "../contexts/TranslationContext";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { apiFetch } from "../lib/http";
import { faceitTierClass } from "../lib/utils";

type FaceitProfile = {
  id: string;
  username: string;
  avatar: string | null;
  elo: number | null;
  level: number | null;
};

type TeamMember = {
  userId: string;
  slotNumber: number;
  role: string;
  status: string;
  user: {
    id: string;
    username: string;
    faceitLevel?: number | null;
    faceitElo?: number | null;
    faceitAvatar?: string | null;
  };
  faceitProfile: FaceitProfile;
};

type Team = {
  id: string;
  name: string;
  rankingPoints: number;
  captain: {
    id: string;
    username: string;
  };
  members: TeamMember[];
};

type JoinRequest = {
  id: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    faceitProfile: FaceitProfile | null;
  };
};

const SLOT_COUNT = 5;

export default function Team() {
  const { id } = useParams<{ id: string }>();
  const { language } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError(
        language === "fi" ? "Joukkuetta ei löytynyt." : "Team not found.",
      );
      setLoading(false);
      return;
    }

    const loadTeam = async () => {
      try {
        const response = await apiFetch(`/api/teams/${encodeURIComponent(id)}`);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch team");
        }

        setTeam(data.team);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : language === "fi"
              ? "Joukkueen tietojen haku epäonnistui."
              : "Failed to load team.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, [id, language]);

  const isCaptain = Boolean(user && team && team.captain.id === user.id);

  useEffect(() => {
    if (!id || !isCaptain) {
      setPendingRequests([]);
      return;
    }

    const loadRequests = async () => {
      setRequestsLoading(true);
      try {
        const response = await apiFetch(
          `/api/teams/${encodeURIComponent(id)}/join-requests`,
          {
            credentials: "include",
          },
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch join requests");
        }
        setPendingRequests(data.requests ?? []);
      } catch {
        setPendingRequests([]);
      } finally {
        setRequestsLoading(false);
      }
    };

    loadRequests();
  }, [id, isCaptain]);

  const membersBySlot = new Map<number, TeamMember>(
    (team?.members ?? [])
      .filter(
        (member) => member.slotNumber >= 1 && member.slotNumber <= SLOT_COUNT,
      )
      .map((member) => [member.slotNumber, member]),
  );

  const requestToJoin = async () => {
    if (!id || joinSubmitting) return;

    setJoinMessage(null);
    setJoinError(null);

    if (!user) {
      setJoinError(
        language === "fi"
          ? "Kirjaudu sisään liittyäksesi."
          : "Log in to request to join.",
      );
      return;
    }

    setJoinSubmitting(true);
    try {
      const response = await apiFetch(
        `/api/teams/${encodeURIComponent(id)}/join-requests`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (language === "fi"
              ? "Liittymispyynnön lähettäminen epäonnistui."
              : "Failed to send join request."),
        );
      }

      setJoinMessage(
        language === "fi" ? "Liittymispyyntö lähetetty" : "Join request sent",
      );
    } catch (requestError) {
      setJoinError(
        requestError instanceof Error
          ? requestError.message
          : language === "fi"
            ? "Liittymispyynnön lähettäminen epäonnistui."
            : "Failed to send join request.",
      );
    } finally {
      setJoinSubmitting(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    if (!id || acceptingRequestId) return;

    setAcceptingRequestId(requestId);
    try {
      const response = await apiFetch(
        `/api/teams/${encodeURIComponent(id)}/join-requests/${encodeURIComponent(requestId)}/accept`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Failed to accept join request");
      }

      const [teamResponse, requestsResponse] = await Promise.all([
        apiFetch(`/api/teams/${encodeURIComponent(id)}`),
        apiFetch(`/api/teams/${encodeURIComponent(id)}/join-requests`, {
          credentials: "include",
        }),
      ]);
      const teamData = await teamResponse.json().catch(() => null);
      const requestsData = await requestsResponse.json().catch(() => null);
      if (teamResponse.ok) setTeam(teamData.team);
      if (requestsResponse.ok) setPendingRequests(requestsData.requests ?? []);
    } catch (acceptError) {
      setJoinError(
        acceptError instanceof Error
          ? acceptError.message
          : language === "fi"
            ? "Liittymispyynnön hyväksyminen epäonnistui."
            : "Failed to accept join request.",
      );
    } finally {
      setAcceptingRequestId(null);
    }
  };

  const deleteTeam = async () => {
    if (!id || user?.role !== "ADMIN" || deleting) return;
    if (
      !window.confirm(
        language === "fi"
          ? "Haluatko varmasti poistaa tämän joukkueen?"
          : "Are you sure you want to delete this team?",
      )
    )
      return;

    setDeleting(true);
    try {
      await api.deleteTeam(id);
      navigate("/teams");
    } catch (deleteError) {
      setJoinError(
        deleteError instanceof Error
          ? deleteError.message
          : language === "fi"
            ? "Joukkueen poisto epäonnistui."
            : "Failed to delete team.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/teams"
        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {language === "fi" ? "Takaisin joukkueisiin" : "Back to teams"}
      </Link>

      {loading && (
        <p className="text-neutral-400">
          {language === "fi" ? "Ladataan..." : "Loading..."}
        </p>
      )}

      {!loading && error && (
        <section className="border border-red-900/60 bg-red-950/30 p-6 rounded-sm">
          <h1 className="text-xl font-bold mb-2">
            {language === "fi" ? "Virhe" : "Error"}
          </h1>
          <p className="text-red-200">{error}</p>
        </section>
      )}

      {!loading && !error && team && (
        <>
          <header className="border-b border-neutral-800 pb-8 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
                  {language === "fi" ? "Joukkue" : "Team"}
                </p>
                <h1 className="text-4xl font-extrabold uppercase tracking-tight">
                  {team.name}
                </h1>
                <p className="text-neutral-400 mt-3">
                  {language === "fi" ? "Kapteeni" : "Captain"}:{" "}
                  {team.captain.username}
                </p>
              </div>
              <div className="text-right text-sm text-neutral-400">
                <div className="text-white font-bold text-lg">
                  {team.rankingPoints}
                </div>
                <div>
                  {language === "fi" ? "Ranking-pistettä" : "Ranking points"}
                </div>
                {user?.role === "ADMIN" && (
                  <button
                    type="button"
                    onClick={deleteTeam}
                    disabled={deleting}
                    className="mt-4 inline-flex items-center gap-2 border border-red-900/60 px-3 py-2 text-xs font-bold uppercase text-red-400 hover:border-red-500 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting
                      ? language === "fi"
                        ? "Poistetaan..."
                        : "Deleting..."
                      : language === "fi"
                        ? "Poista joukkue"
                        : "Delete Team"}
                  </button>
                )}
              </div>
            </div>
          </header>

          <section
            aria-label={
              language === "fi" ? "Joukkueen pelaajat" : "Team players"
            }
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-neutral-400" />
              <h2 className="text-xl font-bold uppercase">
                {language === "fi" ? "Kokoonpano" : "Roster"}
              </h2>
            </div>

            {(joinMessage || joinError) && (
              <p
                className={
                  joinMessage
                    ? "text-emerald-400 text-sm mb-4"
                    : "text-red-300 text-sm mb-4"
                }
                role="status"
              >
                {joinMessage || joinError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: SLOT_COUNT }, (_, index) => {
                const slotNumber = index + 1;
                const member = membersBySlot.get(slotNumber);

                if (!member) {
                  return (
                    <button
                      key={slotNumber}
                      type="button"
                      onClick={requestToJoin}
                      disabled={joinSubmitting}
                      aria-label={
                        language === "fi"
                          ? `Pyydä paikkaa ${slotNumber}`
                          : `Request slot ${slotNumber}`
                      }
                      className="min-h-56 border border-dashed border-neutral-700 bg-neutral-950/40 rounded-sm flex flex-col items-center justify-center text-neutral-500"
                    >
                      <span className="text-3xl mb-3">+</span>
                      <span className="text-xs font-bold tracking-widest">
                        {joinSubmitting
                          ? language === "fi"
                            ? "LÄHETETÄÄN..."
                            : "SENDING..."
                          : language === "fi"
                            ? "VAPAA PAIKKA"
                            : "OPEN SLOT"}
                      </span>
                    </button>
                  );
                }

                const profile = member.faceitProfile;
                const avatar = profile.avatar || member.user.faceitAvatar;
                const level = profile.level ?? member.user.faceitLevel;
                const elo = profile.elo ?? member.user.faceitElo;
                return (
                  <article
                    key={slotNumber}
                    className="min-h-56 border border-neutral-800 bg-neutral-900 rounded-sm p-5 flex flex-col"
                  >
                    <div className="flex items-center justify-between text-xs text-neutral-500 mb-5">
                      <span>#{slotNumber}</span>
                      <span>
                        {member.role === "CAPTAIN"
                          ? language === "fi"
                            ? "KAPTEENI"
                            : "CAPTAIN"
                          : "PLAYER"}
                      </span>
                    </div>
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={profile.username || member.user.username}
                        className="w-16 h-16 rounded-full object-cover mb-4 border border-neutral-700"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-neutral-800 border border-neutral-700 mb-4 flex items-center justify-center text-xl font-bold">
                        {profile.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <h3 className="font-bold text-lg truncate">
                      {profile.username || member.user.username}
                    </h3>
                    <div className="mt-auto pt-4 flex justify-between text-xs text-neutral-400">
                      <span
                        className={`${faceitTierClass(level, elo)} font-semibold`}
                      >
                        LVL {level ?? "-"}
                      </span>
                      <span
                        className={`${faceitTierClass(level, elo)} font-semibold`}
                      >
                        ELO {elo ?? "-"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {isCaptain && (
            <section
              className="mt-10 border-t border-neutral-800 pt-8"
              aria-label={
                language === "fi" ? "Liittymispyynnöt" : "Pending requests"
              }
            >
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold uppercase">
                  {language === "fi" ? "Liittymispyynnöt" : "Pending Requests"}
                </h2>
                {requestsLoading && (
                  <span className="text-xs text-neutral-500">
                    {language === "fi" ? "Ladataan..." : "Loading..."}
                  </span>
                )}
              </div>

              {!requestsLoading && pendingRequests.length === 0 && (
                <p className="text-sm text-neutral-500">
                  {language === "fi"
                    ? "Ei avoimia liittymispyyntöjä."
                    : "No pending requests."}
                </p>
              )}

              <div className="space-y-3">
                {pendingRequests.map((request) => {
                  const profile = request.user.faceitProfile;
                  return (
                    <article
                      key={request.id}
                      className="border border-neutral-800 bg-neutral-900 rounded-sm p-4 flex items-center gap-4"
                    >
                      {profile?.avatar ? (
                        <img
                          src={profile.avatar}
                          alt={profile.username}
                          className="w-12 h-12 rounded-full object-cover border border-neutral-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold">
                          {(profile?.username || request.user.username)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold truncate">
                          {profile?.username || request.user.username}
                        </h3>
                        <p className="text-xs text-neutral-400">
                          LVL {profile?.level ?? "-"}{" "}
                          <span className="mx-2">/</span> ELO{" "}
                          {profile?.elo ?? "-"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => acceptRequest(request.id)}
                        disabled={acceptingRequestId !== null}
                        className="shrink-0 bg-white text-black font-bold px-4 py-2 rounded-sm hover:bg-neutral-200 disabled:opacity-50 transition-colors"
                      >
                        {acceptingRequestId === request.id
                          ? language === "fi"
                            ? "Hyväksytään..."
                            : "Accepting..."
                          : language === "fi"
                            ? "Hyväksy"
                            : "Accept"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
