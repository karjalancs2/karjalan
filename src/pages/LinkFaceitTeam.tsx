import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "../contexts/TranslationContext";

export default function LinkFaceitTeam() {
  const { id } = useParams<{ id: string }>();
  const { language } = useTranslation();
  const navigate = useNavigate();
  const [faceitUrl, setFaceitUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const trimmed = faceitUrl.trim();

    if (!trimmed) {
      setIsSubmitting(false);
      return;
    }

    // Placeholder destination until the actual FACEIT tournament page is linked.
    const tournamentUrl = `https://www.faceit.com/en/tournaments${id ? `?tournament=${id}` : ""}`;

    window.location.href = tournamentUrl;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 mb-3">
          {language === "fi" ? "Joukkueen liittäminen" : "Link team"}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">
          {language === "fi" ? "Liitä FACEIT-joukkue" : "Link FACEIT team"}
        </h1>
        <p className="text-neutral-400 mb-8">
          {language === "fi"
            ? "Syötä joukkueesi FACEIT-profiilin URL. Kun lähetät, sinut viedään turnauksen FACEIT-sivulle."
            : "Enter your team’s FACEIT profile URL. After submitting, you’ll be taken to the tournament FACEIT page."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="faceit-url"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              {language === "fi" ? "FACEIT-joukkueen URL" : "FACEIT team URL"}
            </label>
            <input
              id="faceit-url"
              type="url"
              value={faceitUrl}
              onChange={(e) => setFaceitUrl(e.target.value)}
              placeholder="https://www.faceit.com/en/teams/..."
              className="w-full bg-neutral-950 border border-neutral-700 text-white rounded px-4 py-3 outline-none focus:border-white"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-white text-black font-bold px-5 py-3 rounded-sm hover:bg-neutral-200 transition-colors disabled:opacity-60"
            >
              {isSubmitting
                ? language === "fi"
                  ? "Lähetetään..."
                  : "Submitting..."
                : language === "fi"
                  ? "Lähetä"
                  : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/tournaments/${id}`)}
              className="border border-neutral-700 text-neutral-200 px-5 py-3 rounded-sm hover:border-neutral-500 transition-colors"
            >
              {language === "fi" ? "Takaisin" : "Back"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
