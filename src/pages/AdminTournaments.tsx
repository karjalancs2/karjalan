import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/TranslationContext";
import { api } from "../lib/api";

export default function AdminTournaments() {
  const { user, loading } = useAuth();
  const { language } = useTranslation();
  const [faceitTournament, setFaceitTournament] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);

  if (loading) return null;
  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.importFaceitTournament(faceitTournament);
      setMessage(
        language === "fi"
          ? `${result.tournament.name} on nyt aktiivinen turnaus.`
          : `${result.tournament.name} is now the active tournament.`,
      );
    } catch (submitError) {
      const submitStatus = (submitError as { status?: number }).status;
      setError(
        submitStatus === 404
          ? "Tournament not found. Please ensure it is a valid FACEIT Tournament ID."
          : submitError instanceof Error
            ? submitError.message
            : language === "fi"
              ? "FACEIT-turnauksen tuonti epäonnistui."
              : "FACEIT tournament import failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const clearActiveTournament = async () => {
    const confirmed = window.confirm(
      language === "fi"
        ? "Poistetaanko aktiivinen turnaus etusivulta?"
        : "Clear the active tournament from the homepage?",
    );
    if (!confirmed) return;

    setMessage(null);
    setError(null);
    setClearing(true);
    try {
      const result = await api.clearActiveTournament();
      if (result.cleared) {
        window.location.assign("/tournaments");
        return;
      }
      setMessage(
        language === "fi"
          ? "Aktiivista turnausta ei ollut."
          : "There was no active tournament to clear.",
      );
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : language === "fi"
            ? "Aktiivisen turnauksen tyhjennys epäonnistui."
            : "Failed to clear the active tournament.",
      );
    } finally {
      setClearing(false);
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
        {language === "fi" ? "Turnauksen hallinta" : "Tournament dashboard"}
      </h1>
      <p className="text-neutral-400 mb-8">
        {language === "fi"
          ? "Aseta FACEIT-turnaus aktiiviseksi julkiselle etusivulle."
          : "Set a FACEIT tournament as the active tournament shown on the homepage."}
      </p>

      <form
        onSubmit={submit}
        className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 sm:p-6 space-y-5"
      >
        <label className="block text-sm font-bold" htmlFor="faceit-tournament">
          {language === "fi"
            ? "FACEIT-turnauksen ID tai URL"
            : "FACEIT tournament ID or URL"}
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
            ? language === "fi"
              ? "Tuodaan..."
              : "Importing..."
            : language === "fi"
              ? "Tuo FACEIT-turnaus"
              : "Import FACEIT tournament"}
        </button>
        <button
          type="button"
          onClick={clearActiveTournament}
          disabled={submitting || clearing}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-red-800 text-red-300 font-bold px-5 py-3 rounded-sm hover:bg-red-950 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {clearing
            ? language === "fi"
              ? "Tyhjennetään..."
              : "Clearing..."
            : language === "fi"
              ? "Tyhjennä aktiivinen turnaus"
              : "Clear active tournament"}
        </button>
        {message && <p className="text-emerald-400 text-sm">{message}</p>}
        {error && <p className="text-red-300 text-sm">{error}</p>}
      </form>
    </main>
  );
}
