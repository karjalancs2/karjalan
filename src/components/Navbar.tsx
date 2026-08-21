import { Link } from "react-router-dom";
import { useTranslation } from "../contexts/TranslationContext";
import { useAuth } from "../contexts/AuthContext";
import { Search, Menu, UserCircle, Twitch } from "lucide-react";
import { KarjalanMark } from "./KarjalanMark";

export function Navbar() {
  const { language, setLanguage, t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-neutral-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="text-2xl font-bold tracking-widest text-white flex items-center gap-3"
            >
              <KarjalanMark className="w-8 h-8" />
              KARJALAN
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
              >
                {t("nav.home")}
              </Link>
              <Link
                to="/tournaments"
                className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
              >
                {t("nav.tournaments")}
              </Link>
              <Link
                to="/rankings"
                className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
              >
                {t("nav.rankings")}
              </Link>
              <Link
                to="/teams"
                className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
              >
                {t("nav.teams")}
              </Link>
              <Link
                to="/teamfinder"
                className="text-sm font-medium text-neutral-300 hover:text-white transition-colors flex items-center gap-2"
              >
                {t("nav.teamfinder")}
                <span className="bg-red-600/20 text-red-500 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">
                  Hot
                </span>
              </Link>
              <Link
                to="/watch"
                className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
              >
                {t("nav.watch")}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://www.twitch.tv/karjalancs2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-purple-400 transition-colors"
              title="Watch on Twitch"
            >
              <Twitch className="w-5 h-5" />
            </a>
            <button className="text-neutral-400 hover:text-white">
              <Search className="w-5 h-5" />
            </button>
            <div className="flex items-center bg-neutral-900 rounded border border-neutral-800 text-xs font-semibold overflow-hidden">
              <button
                onClick={() => setLanguage("fi")}
                className={`px-2 py-1 ${language === "fi" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-white"}`}
              >
                FI 🇫🇮
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-2 py-1 ${language === "en" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-white"}`}
              >
                EN 🇬🇧
              </button>
            </div>
            <div className="hidden md:flex items-center gap-4 ml-4">
              {user ? (
                <>
                  <Link
                    to={`/profile/${user.id}`}
                    className="flex items-center gap-2 text-sm font-bold text-white hover:text-neutral-300"
                  >
                    <UserCircle className="w-5 h-5" />
                    {language === "fi" ? "Profiili" : "Profile"}
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm font-medium text-neutral-500 hover:text-white transition-colors"
                  >
                    {language === "fi" ? "Kirjaudu ulos" : "Log out"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm font-medium bg-white text-black px-4 py-2 rounded hover:bg-neutral-200 transition-colors"
                  >
                    {t("nav.register")}
                  </Link>
                </>
              )}
            </div>
            <button className="md:hidden text-neutral-400 hover:text-white ml-2">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
