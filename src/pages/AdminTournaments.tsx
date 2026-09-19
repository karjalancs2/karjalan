import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { isAdminUser, useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { apiFetch } from "../lib/http";
import { Tournament } from "../types";

export default function AdminTournaments() {
  const { user, loading } = useAuth();
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.importFaceitTournament(faceitTournament);
      setMessage(
        `${result.tournament.name} is now the active tournament.`,
      );
    } catch (submitError) {
      const submitStatus = (submitError as { status?: number }).status;
      setError(
        submitStatus === 404
          ? "Tournament not found. Please ensure it is a valid FACEIT Tournament ID."
          : submitError instanceof Error
            ? submitError.message
            : "FACEIT tournament import failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTournament = async (tournament: Tournament) => {
    const confirmed = window.confirm(
      `Delete "${tournament.name}"? This will also remove its matches and player stats.`,
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
      setMessage(`Deleted ${tournament.name}.`);
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Failed to delete tournament.",
      );
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
        throw new Error(result.error || "Elo recalculation failed.");
      }

      setMessage(
        `Historical Elo recalculated. ${result.matchesProcessed ?? 0} matches processed.`,
      );
    } catch (recalculateError) {
      setError(
        recalculateError instanceof Error
          ? recalculateError.message
          : "Historical Elo recalculation failed.",
      );
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
        throw new Error(result.error || "Player stats sync failed.");
      }

      alert(
        `Player stats synced from FACEIT and saved to the database! (${result.statsSaved ?? 0} stats saved)`,
      );
    } catch (syncError) {
      alert(
        syncError instanceof Error
          ? syncError.message
          : "Player stats synchronization failed.",
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-3">
        <ShieldCheck className="w-6 h-6 text-emerald-400" />
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          Admin
        </p>
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mb-3 break-words">
        Tournament dashboard
      </h1>
      <p className="text-neutral-400 mb-8">
        Set a FACEIT tournament as the active tournament shown on the homepage.
      </p>

      <form
        onSubmit={submit}
        className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 sm:p-6 space-y-5"
      >
        <label className="block text-sm font-bold" htmlFor="faceit-tournament">
          FACEIT tournament ID or URL
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
          {submitting
            ? "Importing..."
            : "Import FACEIT tournament"}
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
          {recalculating ? "Recalculating..." : "Recalculate Historical Elo"}
        </button>
        <button
          type="button"
          onClick={syncPlayerStats}
          disabled={submitting || recalculating || syncing}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-400 text-black font-bold px-5 py-3 rounded-sm hover:bg-emerald-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Player Stats"}
        </button>
        {message && <p className="text-emerald-400 text-sm">{message}</p>}
        {error && <p className="text-red-300 text-sm">{error}</p>}
      </form>

      <section className="mt-8 bg-neutral-900 border border-neutral-800 rounded-lg p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold">Manage tournaments</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Select a tournament to delete it and its related match data.
            </p>
          </div>
          <span className="text-xs uppercase tracking-widest text-neutral-500">
            {tournaments.length} total
          </span>
        </div>
        <div className="space-y-3">
          {tournaments.length === 0 ? (
            <p className="text-sm text-neutral-500">No tournaments found.</p>
          ) : (
            tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-neutral-800 bg-neutral-950 rounded-sm p-4"
              >
                <div className="min-w-0">
                  <p className="font-bold truncate">{tournament.name}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {tournament.status} · {tournament.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteTournament(tournament)}
                  disabled={submitting || recalculating || syncing || Boolean(deletingId)}
                  className="inline-flex items-center justify-center gap-2 border border-red-800 text-red-300 font-bold px-4 py-2 rounded-sm hover:bg-red-950 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingId === tournament.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
