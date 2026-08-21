import { Link } from "react-router-dom";
import { useTranslation } from "../contexts/TranslationContext";

export default function Teams() {
  const { language } = useTranslation();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[50vh]">
      <h1 className="text-4xl font-extrabold tracking-tight mb-4 uppercase">
        {language === "fi" ? "JOUKKUEET" : "TEAMS"}
      </h1>
      <p className="text-neutral-400 mb-8">
        {language === "fi"
          ? "Selaa suomalaisia CS2-joukkueita."
          : "Browse Finnish CS2 teams."}
      </p>
      <Link
        to="/teamfinder"
        className="bg-white text-black font-bold px-6 py-2.5 rounded-sm hover:bg-neutral-200 transition-colors"
      >
        {language === "fi" ? "Siirry joukkuehakuun" : "Go to team finder"}
      </Link>
    </div>
  );
}
