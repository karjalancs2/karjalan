import { createContext, useContext, useState, ReactNode } from "react";

type Language = "fi" | "en";

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  fi: {
    "nav.home": "Etusivu",
    "nav.tournaments": "Turnaukset",
    "nav.rankings": "Rankingit",
    "nav.teams": "Joukkueet",
    "nav.players": "Pelaajat",
    "nav.teamfinder": "Joukkuehaku",
    "nav.watch": "Katso",
    "nav.login": "Kirjaudu",
    "nav.register": "Rekisteröidy",
    "hero.title": "KARJALAN",
    "hero.subtitle": "Suomalaisen CS2-kilpapelaamisen koti.",
    "hero.desc":
      "Liity turnauksiin, kokoa joukkue, löydä pelikavereita ja nouse Suomen rankingissa.",
    "hero.cta.primary": "Selaa turnauksia",
    "hero.cta.secondary": "Etsi joukkuetta",
    "status.registration_open": "ILMOITTAUTUMINEN AUKI",
    "btn.register": "ILMOITTAUDU",
    "live.now": "LIVE NYT",
    "btn.watch_stream": "Katso lähetys",
    "team.slots": "joukkuetta",
    "prize.pool": "palkintopotti",
    "common.free_slot": "Vapaa paikka",
    "common.join_team": "Liity joukkueeseen",
    "team.ready": "JOUKKUE VALMIS",
    "team.continue_faceit": "JATKA FACEITIIN",
    "tournament.details": "Turnauksen tiedot",
    "tournament.format": "Formaatti",
    "tournament.entry_fee": "Osallistumismaksu",
    "tournament.registration_deadline": "Ilmoittautuminen päättyy",
    "tournament.organizer": "Järjestäjä",
    "tournament.prize_pool": "Palkintopotti",
    "tournament.link_faceit": "Linkitä FACEIT-joukkue",
    "tournament.link_faceit_desc": "Linkitä joukkueesi FACEIT URL, jotta tiimi voidaan yhdistää turnaukseen.",
    "tournament.no_teams": "Ei rekisteröityjä joukkueita vielä.",
    "tournament.loading": "Ladataan...",
    "tournaments.empty": "Ei turnauksia tällä hetkellä.",
    "tournaments.filter.all": "Kaikki",
    "tournaments.filter.registration": "Ilmoittautuminen auki",
    "tournaments.filter.upcoming": "Tulossa",
    "tournaments.filter.live": "Käynnissä",
    "tournaments.filter.completed": "Päättyneet",
    "tournaments.entry_fee": "Osallistumismaksu",
    "tournaments.free": "Ilmainen",
    "tournaments.view_details": "Katso tiedot",
    "teamfinder.title": "JOUKKUEHAKU",
    "teamfinder.subtitle":
      "Eikö sinulla ole vielä joukkuetta? Liity avoimeen kokoonpanoon tai kokoa oma joukkue turnauksia varten.",
    "teamfinder.filters.all": "Kaikki Turnaukset",
    "teamfinder.filters.role": "Rooli: Kaikki",
    "teamfinder.filters.faceit": "FACEIT Taso",
    "teamfinder.create_team": "Luo joukkue",
    "teamfinder.join_tournament": "ILMOITTAUDU TURNAUKSEEN",
    "teamfinder.ready": "JOUKKUE VALMIS",
    "common.open_slot": "Vapaa paikka",
    "common.player_1": "P1",
    "common.player_2": "P2",
    "common.player_3": "P3",
    "common.player_4": "P4",
    "common.player_5": "P5",
  },
  en: {
    "nav.home": "Home",
    "nav.tournaments": "Tournaments",
    "nav.rankings": "Rankings",
    "nav.teams": "Teams",
    "nav.players": "Players",
    "nav.teamfinder": "Find Team",
    "nav.watch": "Watch",
    "nav.login": "Login",
    "nav.register": "Register",
    "hero.title": "KARJALAN",
    "hero.subtitle": "The home of competitive CS2 in Finland.",
    "hero.desc":
      "Join tournaments, form a team, find teammates and climb the Finnish rankings.",
    "hero.cta.primary": "Browse Tournaments",
    "hero.cta.secondary": "Find a Team",
    "status.registration_open": "REGISTRATION OPEN",
    "btn.register": "REGISTER",
    "live.now": "LIVE NOW",
    "btn.watch_stream": "Watch Stream",
    "team.slots": "teams",
    "prize.pool": "prize pool",
    "common.free_slot": "Open Slot",
    "common.join_team": "Join Team",
    "team.ready": "TEAM READY",
    "team.continue_faceit": "CONTINUE TO FACEIT",
    "tournament.details": "Tournament details",
    "tournament.format": "Format",
    "tournament.entry_fee": "Entry fee",
    "tournament.registration_deadline": "Registration closes",
    "tournament.organizer": "Organizer",
    "tournament.prize_pool": "Prize pool",
    "tournament.link_faceit": "Link FACEIT team",
    "tournament.link_faceit_desc": "Link your team’s FACEIT URL so it can be connected to the tournament.",
    "tournament.no_teams": "No registered teams yet.",
    "tournament.loading": "Loading...",
    "tournaments.empty": "No tournaments right now.",
    "tournaments.filter.all": "All",
    "tournaments.filter.registration": "Registration open",
    "tournaments.filter.upcoming": "Upcoming",
    "tournaments.filter.live": "Live",
    "tournaments.filter.completed": "Completed",
    "tournaments.entry_fee": "Entry fee",
    "tournaments.free": "Free",
    "tournaments.view_details": "View details",
    "teamfinder.title": "FIND TEAM",
    "teamfinder.subtitle":
      "Don’t have a team yet? Join an open roster or build your own for upcoming tournaments.",
    "teamfinder.filters.all": "All Tournaments",
    "teamfinder.filters.role": "Role: All",
    "teamfinder.filters.faceit": "FACEIT Level",
    "teamfinder.create_team": "Create Team",
    "teamfinder.join_tournament": "REGISTER FOR TOURNAMENT",
    "teamfinder.ready": "TEAM READY",
    "common.open_slot": "Open Slot",
    "common.player_1": "P1",
    "common.player_2": "P2",
    "common.player_3": "P3",
    "common.player_4": "P4",
    "common.player_5": "P5",
  },
};

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined,
);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("fi");

  const t = (key: string) => {
    return (translations[language] as Record<string, string>)[key] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}
