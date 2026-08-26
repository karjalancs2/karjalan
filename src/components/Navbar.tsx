import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { Search, Menu, UserCircle, Twitch, X } from "lucide-react";
import { KarjalanMark } from "./KarjalanMark";

export function Navbar() {
  const { language, setLanguage, t } = useTranslation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    teams: Array<{ id: string; name: string; logo?: string | null }>;
    players: Array<{
      id: string;
      username: string;
      faceitUsername?: string | null;
      faceitAvatar?: string | null;
    }>;
  }>({ teams: [], players: [] });
  const [searchLoading, setSearchLoading] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchOpen || !query) {
      setSearchResults({ teams: [], players: [] });
      setSearchLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await api.search(query);
        setSearchResults({ teams: results.teams ?? [], players: results.players ?? [] });
      } catch {
        setSearchResults({ teams: [], players: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchOpen, searchQuery]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const openResult = (path: string) => {
    closeSearch();
    navigate(path);
  };

  return (
    <nav className="border-b border-neutral-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              onClick={closeMenu}
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
              className="hidden md:flex text-neutral-400 hover:text-purple-400 transition-colors"
              title="Watch on Twitch"
            >
              <Twitch className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="text-neutral-400 hover:text-white p-2"
              aria-label="Search teams and players"
            >
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
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="md:hidden text-neutral-400 hover:text-white ml-2 p-2"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-neutral-800 py-3">
            <div className="flex flex-col gap-1">
              {[
                ["/", t("nav.home")],
                ["/tournaments", t("nav.tournaments")],
                ["/rankings", t("nav.rankings")],
                ["/teams", t("nav.teams")],
                ["/teamfinder", t("nav.teamfinder")],
                ["/watch", t("nav.watch")],
              ].map(([to, label]) => (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMenu}
                  className={`px-3 py-3 text-sm font-medium ${location.pathname === to ? "text-white bg-neutral-900" : "text-neutral-300"}`}
                >
                  {label}
                </Link>
              ))}
              <a
                href="https://www.twitch.tv/karjalancs2"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex items-center gap-2 px-3 py-3 text-sm font-medium text-neutral-300"
              >
                <Twitch className="w-4 h-4" />
                Twitch
              </a>
              {user ? (
                <>
                  <Link
                    to={`/profile/${user.id}`}
                    onClick={closeMenu}
                    className="px-3 py-3 text-sm font-bold text-white"
                  >
                    {language === "fi" ? "Profiili" : "Profile"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      logout();
                    }}
                    className="px-3 py-3 text-left text-sm font-medium text-neutral-400"
                  >
                    {language === "fi" ? "Kirjaudu ulos" : "Log out"}
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="px-3 py-3 text-sm font-medium text-neutral-300"
                >
                  {t("nav.login")}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 px-4 pt-20 sm:pt-28" onClick={closeSearch}>
          <div
            className="w-full max-w-2xl overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-neutral-800 p-4">
              <Search className="h-5 w-5 shrink-0 text-neutral-500" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeSearch();
                }}
                placeholder="Search teams or players"
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-neutral-500"
              />
              <button type="button" onClick={closeSearch} className="p-1 text-neutral-500 hover:text-white" aria-label="Close search">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-4">
              {searchLoading && <p className="py-4 text-sm text-neutral-500">Searching...</p>}
              {!searchLoading && searchQuery.trim() && searchResults.teams.length === 0 && searchResults.players.length === 0 && (
                <p className="py-4 text-sm text-neutral-500">No results found.</p>
              )}
              {searchResults.teams.length > 0 && (
                <section>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">Teams</h2>
                  <div className="flex flex-col">
                    {searchResults.teams.map((team) => (
                      <button key={team.id} type="button" onClick={() => openResult(`/teams/${team.id}`)} className="flex items-center gap-3 rounded px-3 py-3 text-left hover:bg-neutral-800">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-neutral-800 text-xs font-bold text-neutral-400">{team.name.slice(0, 2).toUpperCase()}</span>
                        <span className="font-semibold text-white">{team.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {searchResults.players.length > 0 && (
                <section className="mt-5">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">Players</h2>
                  <div className="flex flex-col">
                    {searchResults.players.map((player) => (
                      <button key={player.id} type="button" onClick={() => openResult(`/profile/${player.id}`)} className="flex items-center gap-3 rounded px-3 py-3 text-left hover:bg-neutral-800">
                        {player.faceitAvatar ? <img src={player.faceitAvatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <UserCircle className="h-9 w-9 shrink-0 text-neutral-500" />}
                        <span>
                          <span className="block font-semibold text-white">{player.username}</span>
                          {player.faceitUsername && <span className="block text-xs text-neutral-500">FACEIT: {player.faceitUsername}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
