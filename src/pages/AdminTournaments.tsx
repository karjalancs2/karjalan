import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { isAdminUser, useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/TranslationContext";
import { api } from "../lib/api";
import { apiFetch } from "../lib/http";
import { Tournament } from "../types";

export default function AdminTournaments() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [faceitTournament, setFaceitTournament] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.getTournaments().then(setTournaments);
  }, []);

  if (loading) return null;
  if (!isAdminUser(user)) return <Navigate to="/" replace />;

  const getStatusLabel = (status: string) => {
    const normalized = status.toLowerCase();
    if (["join", "registration"].includes(normalized)) {
      return t("status.registration_open");
    }
    if (["started", "live"].includes(normalized)) {
      return t("status.started");
    }
    if (normalized === "finished") return t("status.finished");
    if (normalized === "cancelled") return t("status.cancelled");
    if (["upcoming", "scheduled"].includes(normalized)) {
      return t("tournaments.filter.upcoming");
    }
    return status;
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.importFaceitTournament(faceitTournament);
      setMessage(
        t("admin.import_success").replace("{name}", result.tournament.name),
      );
    } catch (submitError) {
      const submitStatus = (submitError as { status?: number }).status;
      setError(
        submitStatus === 404
          ? t("admin.tournament_not_found")
          : t("admin.import_failed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTournament = async (tournament: Tournament) => {
    const confirmed = window.confirm(
      t("admin.confirm_delete").replace("{name}", tournament.name),
    );
    if (!confirmed) return;

    setMessage(null);
    setError(null);
    setDeletingId(tournament.id);
    try {
      await api.deleteTournament(tournament.id);
      setTournaments((current) =>
        current.filter((item) => item.id !== tournament.id),
      );
      setMessage(t("admin.delete_success").replace("{name}", tournament.name));
    } catch {
      setError(t("admin.delete_failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const recalculateElo = async () => {
    setMessage(null);
    setError(null);
    setRecalculating(true);
    try {
      const response = await apiFetch("/api/admin/recalculate-elo", {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || t("admin.elo_failed"));
      }

      setMessage(
        t("admin.elo_success").replace(
          "{count}",
          String(result.matchesProcessed ?? 0),
        ),
      );
    } catch {
      setError(t("admin.elo_failed"));
    } finally {
      setRecalculating(false);
    }
  };

  const syncPlayerStats = async () => {
    setSyncing(true);
    try {
      const response = await apiFetch("/api/admin/sync-stats", {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || t("admin.stats_failed"));
      }

      alert(
        t("admin.stats_success").replace(
          "{count}",
          String(result.statsSaved ?? 0),
        ),
      );
    } catch {
      alert(t("admin.stats_failed"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-3">
        <ShieldCheck className="w-6 h-6 text-emerald-400" />
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          {t("nav.admin")}
        </p>
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mb-3 break-words">
        {t("admin.dashboard")}
      </h1>
      <p className="text-neutral-400 mb-8">
        {t("admin.dashboard_description")}
      </p>

      <form
        onSubmit={submit}
        className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 sm:p-6 space-y-5"
      >
        <label className="block text-sm font-bold" htmlFor="faceit-tournament">
          {t("admin.faceit_id_label")}
        </label>
        <input
          id="faceit-tournament"
          value={faceitTournament}
          onChange={(event) => setFaceitTournament(event.target.value)}
          placeholder="https://www.faceit.com/en/championship/..."
          required
          className="w-full bg-neutral-950 border border-neutral-700 px-4 py-3 rounded-sm text-white"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-black font-bold px-5 py-3 rounded-sm hover:bg-neutral-200 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${submitting ? "animate-spin" : ""}`}
          />
          {submitting ? t("admin.importing") : t("admin.import_tournament")}
        </button>
        <button
          type="button"
          onClick={recalculateElo}
          disabled={submitting || recalculating || syncing}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-400 text-black font-bold px-5 py-3 rounded-sm hover:bg-amber-300 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${recalculating ? "animate-spin" : ""}`}
          />
          {recalculating
            ? t("admin.recalculating")
            : t("admin.recalculate_elo")}
        </button>
        <button
          type="button"
          onClick={syncPlayerStats}
          disabled={submitting || recalculating || syncing}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-400 text-black font-bold px-5 py-3 rounded-sm hover:bg-emerald-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? t("admin.syncing") : t("admin.sync_player_stats")}
        </button>
        {message && <p className="text-emerald-400 text-sm">{message}</p>}
        {error && <p className="text-red-300 text-sm">{error}</p>}
      </form>

      <section className="mt-8 bg-neutral-900 border border-neutral-800 rounded-lg p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold">
              {t("admin.manage_tournaments")}
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {t("admin.delete_description")}
            </p>
          </div>
          <span className="text-xs uppercase tracking-widest text-neutral-500">
            {tournaments.length} {t("admin.total")}
          </span>
        </div>
        <div className="space-y-3">
          {tournaments.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {t("admin.no_tournaments")}
            </p>
          ) : (
            tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-neutral-800 bg-neutral-950 rounded-sm p-4"
              >
                <div className="min-w-0">
                  <p className="font-bold truncate">{tournament.name}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {getStatusLabel(tournament.status)} · {tournament.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteTournament(tournament)}
                  disabled={
                    submitting ||
                    recalculating ||
                    syncing ||
                    Boolean(deletingId)
                  }
                  className="inline-flex items-center justify-center gap-2 border border-red-800 text-red-300 font-bold px-4 py-2 rounded-sm hover:bg-red-950 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingId === tournament.id
                    ? t("admin.deleting")
                    : t("admin.delete")}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
